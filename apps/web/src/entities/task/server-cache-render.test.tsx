// @vitest-environment jsdom
import { useLiveSuspenseQuery } from '@tanstack/react-db';
import { useAtom } from '@tanstack/react-store';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskServerCacheProvider, useTaskCommands, useTaskServerQueries } from '@/entities/task/context';
import { createTaskServerCache, type TaskHydration } from '@/entities/task/server-cache';
import { TodayDateNavigationStoreProvider, useTodayDateNavigationStore } from '@/features/today/date-navigation-store';
import { useCommandExecutionStore } from '@/shared/command-execution-store';

const initial: TaskHydration = {
  userId: 'u1',
  cursor: 1,
  tasks: [
    {
      id: 't1',
      projectId: null,
      title: '서버에서 온 제목',
      date: '2026-09-16',
      startAt: '09:00',
      durationMin: 30,
      status: 'todo',
      version: 1,
    },
  ],
  projects: [],
  scopes: [{ kind: 'task', id: 't1' }],
};

afterEach(cleanup);

describe('페이지 상태와 초기 렌더링', () => {
  it('SSR 데이터가 첫 HTML과 브라우저 hydration에 동일하게 표시된다', async () => {
    const unexpected = vi.fn(async (): Promise<never> => {
      throw new Error('초기 렌더에서 네트워크를 호출하면 안 된다');
    });
    const data = createTaskServerCache(
      'u1',
      {
        snapshot: unexpected,
        changes: unexpected,
        create: unexpected,
        update: unexpected,
        remove: unexpected,
        createProject: unexpected,
        subscribe: () => () => {},
        summaries: async () => ({ projects: [] }),
      },
      { realtime: false, initial },
    );
    function View() {
      const { data: rows } = useLiveSuspenseQuery(data.taskView({ kind: 'task', id: 't1' }));
      return <p>{rows[0]?.title}</p>;
    }
    const ui = (
      <Suspense fallback={<p>loading</p>}>
        <View />
      </Suspense>
    );
    const html = renderToString(ui);
    expect(html).toContain('서버에서 온 제목');
    expect(html).not.toContain('loading');
    const container = document.createElement('div');
    container.innerHTML = html;
    const onRecoverableError = vi.fn();
    const root = hydrateRoot(container, ui, { onRecoverableError });
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toBe('서버에서 온 제목');
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(unexpected).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    await data.dispose();
  });

  it('같은 페이지를 두 번 열어도 Atom을 공유하지 않고 다시 마운트하면 초기화된다', () => {
    function Selection({ name }: { name: string }) {
      const { selectedDayOffsetAtom } = useTodayDateNavigationStore();
      const [value, setValue] = useAtom(selectedDayOffsetAtom);
      return (
        <button type="button" onClick={() => setValue(value + 1)}>
          {name}:{value}
        </button>
      );
    }
    const tree = (
      <>
        <TodayDateNavigationStoreProvider>
          <Selection name="A" />
        </TodayDateNavigationStoreProvider>
        <TodayDateNavigationStoreProvider>
          <Selection name="B" />
        </TodayDateNavigationStoreProvider>
      </>
    );
    const view = render(tree);
    fireEvent.click(screen.getByText('A:0'));
    expect(screen.getByText('A:1')).toBeDefined();
    expect(screen.getByText('B:0')).toBeDefined();
    view.unmount();
    render(tree);
    expect(screen.getByText('A:0')).toBeDefined();
  });
});

it('집계·인증 DB를 SSR 데이터로 복원해 하이드레이션한다', async () => {
  const { createAuthServerCache } = await import('@/entities/auth/server-cache');
  const { createProjectSummaries } = await import('@/entities/task/summaries');
  const { DbClient } = await import('@tanstack/react-db');
  const user = { id: 'u1', name: '하나', email: 'one@example.test' };
  const summary = { id: 'p1', name: '전체 업무', color: 'blue' as const, totalCount: 100, doneCount: 20 };
  const auth = createAuthServerCache({
    me: async () => ({ user }),
    login: async () => user,
    signup: async () => user,
    logout: async () => {},
    clearUserData: async () => {},
  });
  auth.hydrate({ rows: [{ id: 'current', user }], updatedAt: Date.now() });
  await auth.resolveUser();
  const db = new DbClient();
  const abort = new AbortController();
  const summaries = createProjectSummaries(
    db,
    user.id,
    { summaries: async () => ({ projects: [summary] }) },
    abort.signal,
    300000,
    [summary],
  );
  await summaries.preload();
  function View() {
    const { data: sessions } = useLiveSuspenseQuery(auth.sessionView());
    const { data: rows } = useLiveSuspenseQuery(summaries.view());
    return (
      <p>
        {sessions[0]?.user?.name}: {rows[0]?.totalCount}
      </p>
    );
  }
  const ui = (
    <Suspense fallback="loading">
      <View />
    </Suspense>
  );
  const container = document.createElement('div');
  container.innerHTML = renderToString(ui);
  expect(container.textContent).toBe('하나: 100');
  const onRecoverableError = vi.fn();
  const root = hydrateRoot(container, ui, { onRecoverableError });
  try {
    await act(async () => {
      await Promise.resolve();
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe('하나: 100');
  } finally {
    await act(async () => root.unmount());
    abort.abort();
    await db.cleanup();
    summaries.clear();
    await auth.dispose();
  }
});

it('화면 Store가 변경 명령으로 저장하고 조회는 서버 확정값을 구독한다', async () => {
  const originalTask = initial.tasks[0];
  if (!originalTask) throw new Error('업무 fixture가 필요합니다.');
  let resolveSave!: (value: { task: TaskHydration['tasks'][number] }) => void;
  const update = vi.fn(
    () =>
      new Promise<{ task: TaskHydration['tasks'][number] }>((resolve) => {
        resolveSave = resolve;
      }),
  );
  const unexpected = async (): Promise<never> => {
    throw new Error('예상하지 않은 서버 요청');
  };
  const cache = createTaskServerCache(
    'u1',
    {
      snapshot: unexpected,
      changes: unexpected,
      create: unexpected,
      remove: unexpected,
      createProject: unexpected,
      update,
      subscribe: () => () => {},
      summaries: async () => ({ projects: [] }),
    },
    { realtime: false, initial },
  );
  function Editor() {
    const queries = useTaskServerQueries();
    const commands = useTaskCommands();
    const execution = useCommandExecutionStore();
    const { data: rows } = useLiveSuspenseQuery(queries.taskView({ kind: 'task', id: 't1' }));
    expect(queries).not.toHaveProperty('dispose');
    expect(queries).not.toHaveProperty('tasks');
    expect(queries).not.toHaveProperty('commands');
    return (
      <>
        <p>{rows[0]?.title}</p>
        <button
          type="button"
          onClick={() => execution.dispatch(() => commands.renameTask({ taskId: 't1', title: '저장할 제목' }))}
        >
          {execution.isPending ? '저장 중' : '저장'}
        </button>
      </>
    );
  }
  const view = render(
    <TaskServerCacheProvider cache={cache}>
      <Suspense fallback="loading">
        <Editor />
      </Suspense>
    </TaskServerCacheProvider>,
  );
  try {
    fireEvent.click(await screen.findByText('저장'));
    expect(await screen.findByText('저장 중')).toBeDefined();
    expect(await screen.findByText('저장할 제목')).toBeDefined();
    await vi.waitFor(() => expect(update).toHaveBeenCalledOnce());
    await act(async () => {
      resolveSave({ task: { ...originalTask, title: '서버 확정 제목', version: 2 } });
    });
    expect(await screen.findByText('서버 확정 제목')).toBeDefined();
    expect(await screen.findByText('저장')).toBeDefined();
  } finally {
    view.unmount();
    await cache.dispose();
  }
});
