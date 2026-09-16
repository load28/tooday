import { createLiveQueryCollection } from '@tanstack/react-db';
import type { Project, Task, TaskChange, TaskScope } from '@tooday/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTaskData, type TaskData } from '@/entities/task/data';
import type { TaskTransport } from '@/entities/task/ports';
import { taskQuery } from '@/entities/task/queries';
import { matchesScope } from '@/entities/task/scope';

const task: Task = {
  id: 't1',
  projectId: 'p1',
  title: '회의',
  date: '2026-09-16',
  startAt: '09:00',
  durationMin: 30,
  status: 'todo',
  version: 1,
};
const project: Project = { id: 'p1', name: '앱', color: 'blue' };
const week: TaskScope = { kind: 'range', from: '2026-09-14', to: '2026-09-20' };
const resources: TaskData[] = [];
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function server() {
  let cursor = 1;
  const rows = new Map<string, TaskChange>([[task.id, { ...task, syncSeq: 1, deleted: false }]]);
  const close = vi.fn();
  const transport: TaskTransport = {
    snapshot: vi.fn(async (scope) => ({
      tasks: [...rows.values()]
        .filter((row) => !row.deleted && matchesScope(row, scope))
        .map(({ syncSeq: _s, deleted: _d, ...row }) => row),
      projects: [project],
      cursor,
    })),
    changes: vi.fn(async (since) => ({ tasks: [...rows.values()].filter((row) => row.syncSeq > since), projects: [], cursor })),
    update: vi.fn(async ({ id, patch }) => {
      const row = rows.get(id);
      if (!row) throw new Error('not found');
      const updated = { ...row, ...patch, version: row.version + 1, syncSeq: ++cursor };
      rows.set(id, updated);
      const { syncSeq: _s, deleted: _d, ...value } = updated;
      return { task: value };
    }),
    create: vi.fn(async (input) => ({ task: { ...task, ...input, id: 'new' } })),
    createProject: vi.fn(async (input) => ({ project: { ...input, id: 'new-project' } })),
    remove: vi.fn(async (id) => {
      const row = rows.get(id);
      if (row) rows.set(id, { ...row, deleted: true, version: row.version + 1, syncSeq: ++cursor });
      return { id };
    }),
    subscribe: vi.fn(() => close),
    invalidateSummaries: vi.fn(),
  };
  return {
    transport,
    close,
    rows,
    change(patch: Partial<Task>, deleted = false) {
      const row = rows.get(task.id);
      if (!row) throw new Error('missing fixture');
      rows.set(task.id, { ...row, ...patch, deleted, version: row.version + 1, syncSeq: ++cursor });
    },
  };
}
function make(transport: TaskTransport, options: Parameters<typeof createTaskData>[2] = {}) {
  const data = createTaskData('u1', transport, { realtime: false, ...options });
  resources.push(data);
  return data;
}

afterEach(async () => {
  await Promise.all(resources.splice(0).map((data) => data.dispose()));
  vi.useRealTimers();
});

describe('공용 Task 데이터', () => {
  it('날짜·프로젝트·단건 조회가 같은 낙관적 변경과 서버 응답을 본다', async () => {
    const remote = server();
    const response = deferred<{ task: Task }>();
    remote.transport.update = vi.fn(() => response.promise);
    const data = make(remote.transport);
    await data.preload(week);
    const today = createLiveQueryCollection({ query: taskQuery(data, week), startSync: true });
    const board = createLiveQueryCollection({ query: taskQuery(data, { kind: 'project', projectId: 'p1' }), startSync: true });
    const detail = createLiveQueryCollection({ query: taskQuery(data, { kind: 'task', id: 't1' }), startSync: true });
    try {
      await Promise.all([today.preload(), board.preload(), detail.preload()]);
      const mutation = data.actions.setTaskStatus({ taskId: 't1', status: 'done' });
      await vi.waitFor(() => expect(today.toArray[0]?.status).toBe('done'));
      expect(board.toArray[0]?.status).toBe('done');
      expect(detail.toArray[0]?.status).toBe('done');
      expect(remote.transport.update).toHaveBeenCalledWith({ id: 't1', patch: { status: 'done' } }, expect.any(AbortSignal));
      response.resolve({ task: { ...task, status: 'done', version: 2 } });
      await mutation;
      expect(data.tasks.get('t1')?.version).toBe(2);
    } finally {
      await Promise.all([today.cleanup(), board.cleanup(), detail.cleanup()]);
    }
  });

  it('실패한 낙관적 수정은 원격 변경을 덮어쓰지 않는다', async () => {
    const remote = server();
    const response = deferred<{ task: Task }>();
    remote.transport.update = () => response.promise;
    const data = make(remote.transport);
    await data.preload(week);
    const mutation = data.actions.setTaskStatus({ taskId: 't1', status: 'done' });
    const failed = expect(mutation).rejects.toThrow('저장 실패');
    await vi.waitFor(() => expect(data.tasks.get('t1')?.status).toBe('done'));
    remote.change({ title: '다른 기기의 제목' });
    const pulling = data.pull();
    response.reject(new Error('저장 실패'));
    await failed;
    await pulling;
    expect(data.tasks.get('t1')).toMatchObject({ title: '다른 기기의 제목', status: 'todo', version: 2 });
  });

  it('새 범위의 스냅샷 커서가 기존 범위의 미수신 변경을 건너뛰지 않는다', async () => {
    const remote = server();
    const data = make(remote.transport);
    await data.preload(week);
    remote.change({ title: '원격 변경' });
    await data.preload({ kind: 'task', id: 'missing' });
    await data.pull();
    expect(data.tasks.get('t1')?.title).toBe('원격 변경');
    expect(remote.transport.changes).toHaveBeenLastCalledWith(1, expect.any(AbortSignal));
  });

  it('다른 날짜로 이동해도 프로젝트 조회에서 같은 업무를 유지한다', async () => {
    const remote = server();
    const data = make(remote.transport);
    await data.preload(week);
    await data.preload({ kind: 'project', projectId: 'p1' });
    remote.change({ date: '2026-10-01' });
    await data.pull();
    expect(data.tasks.get('t1')?.date).toBe('2026-10-01');
    expect([...data.tasks.values()].filter((row) => matchesScope(row, week))).toEqual([]);
    expect([...data.tasks.values()].filter((row) => matchesScope(row, { kind: 'project', projectId: 'p1' }))).toHaveLength(1);
  });

  it('삭제 표식 후 늦은 스냅샷이 업무를 부활시키지 않는다', async () => {
    const remote = server();
    const data = make(remote.transport);
    await data.preload(week);
    remote.change({}, true);
    await data.pull();
    remote.transport.snapshot = async () => ({ tasks: [task], projects: [project], cursor: 1 });
    await data.preload({ kind: 'task', id: task.id });
    expect(data.tasks.has(task.id)).toBe(false);
  });

  it('서버 초기 데이터를 복원하면 첫 조회에 네트워크를 요구하지 않는다', async () => {
    const remote = server();
    const original = make(remote.transport);
    await original.preload(week);
    const snapshot = original.dehydrate();
    const other = server();
    const restored = make(other.transport, { initial: snapshot });
    await restored.preload(week);
    expect(restored.tasks.get(task.id)).toMatchObject(task);
    expect(other.transport.snapshot).not.toHaveBeenCalled();
  });

  it('세션 종료 후 늦은 응답을 거부하고 새 사용자 데이터와 격리한다', async () => {
    const remote = server();
    const response = deferred<{ task: Task }>();
    remote.transport.update = () => response.promise;
    const data = make(remote.transport);
    await data.preload(week);
    const mutation = data.actions.renameTask({ taskId: task.id, title: '늦은 저장' });
    const failed = expect(mutation).rejects.toThrow();
    await vi.waitFor(() => expect(data.tasks.get(task.id)?.title).toBe('늦은 저장'));
    await data.dispose();
    response.resolve({ task: { ...task, title: '늦은 저장', version: 2 } });
    await failed;
    expect(data.tasks.size).toBe(0);
  });

  it('마지막 구독이 끝나면 GC가 데이터와 SSE를 정리한다', async () => {
    vi.useFakeTimers();
    const remote = server();
    const data = make(remote.transport, { realtime: true, gcTime: 100 });
    await data.preload(week);
    await data.pull();
    expect(remote.transport.subscribe).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(350);
    expect(data.tasks.size).toBe(0);
    expect(data.projects.size).toBe(0);
    expect(remote.close).toHaveBeenCalledTimes(1);
    remote.change({ title: 'GC 이후 최신 제목' });
    await data.preload(week);
    expect(data.tasks.get(task.id)?.title).toBe('GC 이후 최신 제목');
    expect(remote.transport.subscribe).toHaveBeenCalledTimes(2);
  });
  it('연속 액션의 서버 요청 순서를 보존하고 앞선 실패만 롤백한다', async () => {
    const remote = server();
    const first = deferred<{ task: Task }>();
    remote.transport.update = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce({ task: { ...task, title: '나중 제목', version: 2 } });
    const data = make(remote.transport);
    await data.preload(week);
    const a = data.actions.setTaskStatus({ taskId: task.id, status: 'done' });
    const rejected = expect(a).rejects.toThrow('앞선 요청 실패');
    const b = data.actions.renameTask({ taskId: task.id, title: '나중 제목' });
    await vi.waitFor(() => expect(data.tasks.get(task.id)).toMatchObject({ status: 'done', title: '나중 제목' }));
    expect(remote.transport.update).toHaveBeenCalledTimes(1);
    first.reject(new Error('앞선 요청 실패'));
    await rejected;
    await b;
    expect(data.tasks.get(task.id)).toMatchObject({ status: 'todo', title: '나중 제목', version: 2 });
  });

  it('진행 중 액션은 화면 구독이 없어도 GC에 중단되지 않는다', async () => {
    vi.useFakeTimers();
    const remote = server();
    const response = deferred<{ task: Task }>();
    remote.transport.update = () => response.promise;
    const data = make(remote.transport, { gcTime: 100 });
    await data.preload(week);
    const mutation = data.actions.renameTask({ taskId: task.id, title: '저장 중' });
    await vi.advanceTimersByTimeAsync(150);
    expect(data.tasks.get(task.id)?.title).toBe('저장 중');
    expect(data.tasks.status).not.toBe('cleaned-up');
    response.resolve({ task: { ...task, title: '저장 중', version: 2 } });
    await mutation;
    await vi.advanceTimersByTimeAsync(150);
    expect(data.tasks.size).toBe(0);
  });

  it('프로젝트를 보는 동안 만료한 주간 전용 데이터만 해제한다', async () => {
    vi.useFakeTimers();
    const remote = server();
    remote.rows.set('t2', { ...task, id: 't2', projectId: null, syncSeq: 1, deleted: false });
    const data = make(remote.transport, { gcTime: 100 });
    await data.preload(week);
    const board = createLiveQueryCollection({ query: taskQuery(data, { kind: 'project', projectId: 'p1' }), startSync: true });
    try {
      await board.preload();
      await vi.advanceTimersByTimeAsync(250);
      expect(data.tasks.has('t1')).toBe(true);
      expect(data.tasks.has('t2')).toBe(false);
    } finally {
      await board.cleanup();
    }
  });

  it('데이터를 읽지 않은 SSR 화면의 복원은 빈 프로젝트를 확정하지 않는다', async () => {
    const remote = server();
    const unused = make(remote.transport);
    const restored = make(remote.transport, { initial: unused.dehydrate() });
    await restored.preload({ kind: 'projects' });
    expect(restored.projects.get(project.id)).toMatchObject(project);
    expect(remote.transport.snapshot).toHaveBeenCalledTimes(1);
  });
  it('늦은 저장 응답보다 새 원격 버전을 우선한다', async () => {
    const remote = server();
    const response = deferred<{ task: Task }>();
    remote.transport.update = () => response.promise;
    const data = make(remote.transport);
    await data.preload(week);
    const mutation = data.actions.setTaskStatus({ taskId: task.id, status: 'done' });
    await vi.waitFor(() => expect(data.tasks.get(task.id)?.status).toBe('done'));
    remote.change({ status: 'done' }); // 이 액션이 서버에서 완료됨. 응답만 지연된다.
    remote.change({ title: '더 새로운 원격 변경', status: 'doing' });
    const pulling = data.pull();
    await vi.waitFor(() => expect(remote.transport.changes).toHaveBeenCalled());
    response.resolve({ task: { ...task, status: 'done', version: 2 } });
    await Promise.all([mutation, pulling]);
    expect(data.tasks.get(task.id)).toMatchObject({ title: '더 새로운 원격 변경', status: 'doing', version: 3 });
  });
  it('시간만 바꿀 때 아직 받지 못한 원격 날짜 변경을 덮어쓰지 않는다', async () => {
    const remote = server();
    const data = make(remote.transport);
    await data.preload(week);
    remote.change({ date: '2026-09-18' });
    await data.actions.rescheduleTask({ taskId: task.id, startAt: '10:00', durationMin: 60 });
    expect(data.tasks.get(task.id)).toMatchObject({ date: '2026-09-18', startAt: '10:00', durationMin: 60 });
  });
  it('잘못된 일정은 원본을 바꾸거나 API를 호출하지 않고 실패한다', async () => {
    const remote = server();
    const data = make(remote.transport);
    await data.preload(week);
    await expect(data.actions.rescheduleTask({ taskId: task.id, startAt: '10:00', durationMin: 0 })).rejects.toThrow();
    expect(data.tasks.get(task.id)).toMatchObject({ startAt: '09:00', durationMin: 30 });
    expect(remote.transport.update).not.toHaveBeenCalled();
  });
});
