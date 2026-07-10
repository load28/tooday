import { describe, expect, it } from 'bun:test';
import {
  InMemoryProjectStore,
  InMemorySyncCounter,
  InMemorySyncReadStore,
  InMemoryTaskStore,
} from '@bff/modules/task/adapters/memory';
import { SqlProjectStore, SqlSyncReadStore, SqlTaskStore } from '@bff/modules/task/adapters/sql';
import type { ProjectStore, SyncReadStore, TaskStore } from '@bff/modules/task/ports';
import { testDatabase } from '@bff/platform/db/testing';

interface Stores {
  projects: ProjectStore;
  tasks: TaskStore;
  syncReads: SyncReadStore;
  /** SQL 구현은 tasks.user_id FK 때문에 실제 유저 행이 필요하다 */
  seedUser: (id: string) => Promise<void>;
}

interface Implementation {
  name: string;
  make: () => Promise<Stores>;
}

const IMPLEMENTATIONS: Implementation[] = [
  {
    name: 'memory',
    make: async () => {
      const counter = new InMemorySyncCounter();
      const projects = new InMemoryProjectStore(counter);
      const tasks = new InMemoryTaskStore(counter);
      return {
        projects,
        tasks,
        syncReads: new InMemorySyncReadStore(counter, tasks, projects),
        seedUser: async () => {},
      };
    },
  },
  {
    name: 'sql(pglite)',
    make: async () => {
      const db = await testDatabase();
      return {
        projects: new SqlProjectStore(db),
        tasks: new SqlTaskStore(db),
        syncReads: new SqlSyncReadStore(db),
        seedUser: async (id) => {
          await db
            .insertInto('users')
            .values({ id, email: `${id}@tooday.app`, name: id, password_hash: 'x' })
            .execute();
        },
      };
    },
  },
];

const USER_A = '00000000-0000-7000-8000-00000000000a';
const USER_B = '00000000-0000-7000-8000-00000000000b';

const TASK_INPUT = {
  userId: USER_A,
  title: '시간 뷰 프로토타입',
  projectId: null,
  date: '2026-07-04',
  startAt: '13:30',
  durationMin: 120,
} as const;

for (const { name, make } of IMPLEMENTATIONS) {
  describe(`task 스토어 포트 계약 — ${name}`, () => {
    async function setup(): Promise<Stores> {
      const stores = await make();
      await stores.seedUser(USER_A);
      await stores.seedUser(USER_B);
      return stores;
    }

    it('프로젝트를 만들고 유저별로 생성 순서(fractional key 순)로 조회한다', async () => {
      const { projects } = await setup();
      const daily = await projects.create({ userId: USER_A, name: '일상', color: 'mint' });
      const tooday = await projects.create({ userId: USER_A, name: 'TooDay 앱', color: 'blue' });
      await projects.create({ userId: USER_B, name: '남의 프로젝트', color: 'gray' });

      expect(await projects.listByUser(USER_A)).toEqual([daily, tooday]);
      expect(await projects.findById({ userId: USER_A, id: tooday.id })).toEqual(tooday);
      expect(await projects.findById({ userId: USER_B, id: tooday.id })).toBeNull();
    });

    it('range는 유저·범위 필터, 날짜·시작시각 정렬로 태스크를 내려준다', async () => {
      const { tasks, syncReads } = await setup();
      const afternoon = await tasks.create(TASK_INPUT);
      const morning = await tasks.create({ ...TASK_INPUT, title: '아침 스트레칭', startAt: '07:30' });
      const nextDay = await tasks.create({ ...TASK_INPUT, title: '컴포넌트 리뷰', date: '2026-07-05' });
      await tasks.create({ ...TASK_INPUT, title: '범위 밖', date: '2026-07-20' });
      await tasks.create({ ...TASK_INPUT, userId: USER_B, title: '남의 태스크' });

      const listed = await syncReads.range({ userId: USER_A, from: '2026-07-02', to: '2026-07-08' });
      expect(listed.tasks).toEqual([morning, afternoon, nextDay]);
    });

    it('findById는 소유자의 살아있는 태스크만 돌려준다', async () => {
      const { tasks } = await setup();
      const task = await tasks.create(TASK_INPUT);

      expect(await tasks.findById({ userId: USER_A, id: task.id })).toEqual(task);
      expect(await tasks.findById({ userId: USER_B, id: task.id })).toBeNull();
      expect(await tasks.findById({ userId: USER_A, id: crypto.randomUUID() })).toBeNull();

      await tasks.remove({ userId: USER_A, id: task.id });
      expect(await tasks.findById({ userId: USER_A, id: task.id })).toBeNull();
    });

    it('listByProject는 그 프로젝트의 살아있는 태스크만 날짜·시각 순으로 돌려준다', async () => {
      const { tasks, projects } = await setup();
      const project = await projects.create({ userId: USER_A, name: 'TooDay 앱', color: 'blue' });
      const other = await projects.create({ userId: USER_A, name: '일상', color: 'mint' });

      const afternoon = await tasks.create({ ...TASK_INPUT, projectId: project.id });
      const morning = await tasks.create({ ...TASK_INPUT, projectId: project.id, title: '아침', startAt: '07:30' });
      await tasks.create({ ...TASK_INPUT, projectId: other.id, title: '다른 프로젝트' });
      await tasks.create({ ...TASK_INPUT, projectId: null, title: '프로젝트 없음' });
      const removed = await tasks.create({ ...TASK_INPUT, projectId: project.id, title: '삭제될 것' });
      await tasks.remove({ userId: USER_A, id: removed.id });

      expect(await tasks.listByProject({ userId: USER_A, projectId: project.id })).toEqual([morning, afternoon]);
      expect(await tasks.listByProject({ userId: USER_B, projectId: project.id })).toEqual([]);
    });

    it('countsByProject는 프로젝트별 완료/전체를 세고 프로젝트 없는·삭제된 태스크는 뺀다', async () => {
      const { tasks, projects } = await setup();
      const project = await projects.create({ userId: USER_A, name: 'TooDay 앱', color: 'blue' });

      const done = await tasks.create({ ...TASK_INPUT, projectId: project.id, title: '완료할 것' });
      await tasks.update({ userId: USER_A, id: done.id, patch: { status: 'done' } });
      await tasks.create({ ...TASK_INPUT, projectId: project.id, title: '남은 것' });
      await tasks.create({ ...TASK_INPUT, projectId: null, title: '프로젝트 없음' });
      const removed = await tasks.create({ ...TASK_INPUT, projectId: project.id, title: '삭제될 것' });
      await tasks.remove({ userId: USER_A, id: removed.id });

      expect(await tasks.countsByProject(USER_A)).toEqual([{ projectId: project.id, total: 2, done: 1 }]);
      expect(await tasks.countsByProject(USER_B)).toEqual([]);
    });

    it('remove는 소프트 삭제로 tombstone을 델타에 싣고 version을 올린다 — 두 번째 삭제는 false', async () => {
      const { tasks, syncReads } = await setup();
      const task = await tasks.create(TASK_INPUT); // seq 1, version 1

      expect(await tasks.remove({ userId: USER_B, id: task.id })).toBe(false);
      expect(await tasks.remove({ userId: USER_A, id: task.id })).toBe(true); // seq 2
      expect(await tasks.remove({ userId: USER_A, id: task.id })).toBe(false);

      const range = await syncReads.range({ userId: USER_A, from: '2026-07-01', to: '2026-07-31' });
      expect(range.tasks).toEqual([]);
      const delta = await syncReads.changes({ userId: USER_A, cursor: 1 });
      expect(delta.tasks).toHaveLength(1);
      // tombstone도 쓰기 — version이 단조 증가해야 한다
      expect(delta.tasks[0]).toMatchObject({ id: task.id, deleted: true, version: 2 });
    });

    it('update는 patch의 필드만 적용하고 version을 올린다', async () => {
      const { tasks } = await setup();
      const task = await tasks.create(TASK_INPUT);
      expect(task.version).toBe(1);

      const afterStatus = await tasks.update({ userId: USER_A, id: task.id, patch: { status: 'done' } });
      expect(afterStatus).toEqual({ ...task, status: 'done', version: 2 });

      // 제목만 고쳐도 방금의 status 변경이 보존된다 — 행 전체 덮어쓰기가 아니라는 증거
      const afterTitle = await tasks.update({ userId: USER_A, id: task.id, patch: { title: '수정된 제목' } });
      expect(afterTitle).toEqual({ ...task, status: 'done', title: '수정된 제목', version: 3 });
    });

    it('소유자가 아니거나 없는 태스크의 update는 null을 반환한다', async () => {
      const { tasks } = await setup();
      const task = await tasks.create(TASK_INPUT);

      expect(await tasks.update({ userId: USER_B, id: task.id, patch: { status: 'done' } })).toBeNull();
      expect(await tasks.update({ userId: USER_A, id: crypto.randomUUID(), patch: { status: 'done' } })).toBeNull();
    });

    it('쓰기마다 커서가 전진하고, changes는 커서 이후의 변경만 내려준다', async () => {
      const { tasks, projects, syncReads } = await setup();
      expect(await syncReads.range({ userId: USER_A, from: '2026-07-01', to: '2026-07-31' })).toEqual({
        tasks: [],
        projects: [],
        cursor: 0,
      });

      const project = await projects.create({ userId: USER_A, name: 'TooDay 앱', color: 'blue' }); // seq 1
      const task = await tasks.create(TASK_INPUT); // seq 2
      expect((await syncReads.range({ userId: USER_A, from: '2026-07-01', to: '2026-07-31' })).cursor).toBe(2);

      await tasks.update({ userId: USER_A, id: task.id, patch: { status: 'done' } }); // seq 3

      expect(await syncReads.changes({ userId: USER_A, cursor: 2 })).toEqual({
        tasks: [{ ...task, status: 'done', version: 2, syncSeq: 3, deleted: false }],
        projects: [],
        cursor: 3,
      });
      expect((await syncReads.changes({ userId: USER_A, cursor: 0 })).projects).toEqual([
        { ...project, syncSeq: 1, deleted: false },
      ]);
      // 커서 이후 변경이 없으면 빈 델타, 커서는 제자리
      expect(await syncReads.changes({ userId: USER_A, cursor: 3 })).toEqual({ tasks: [], projects: [], cursor: 3 });

      // 유저 격리 — B의 커서·델타는 A의 쓰기에 영향받지 않는다
      expect(await syncReads.changes({ userId: USER_B, cursor: 0 })).toEqual({ tasks: [], projects: [], cursor: 0 });
    });
  });
}

/*
 * 커서 도출 계약 — 커서는 반환 행들의 max가 아니라 같은 스냅샷의 sync_counters에서
 * 나온다 (T017). 스냅샷 레이스 자체는 단일 커넥션 PGlite로 재현할 수 없으므로,
 * not-found 쓰기가 seq를 소모해(갭 허용) 카운터가 행보다 앞서는 상황으로 도출
 * 방식을 구별해 잠근다. memory는 not-found에 seq를 소모하지 않아 SQL 전용이다.
 */
describe('SqlSyncReadStore — 커서는 counters에서 도출된다', () => {
  it('행 없는 쓰기로 seq 갭이 생겨도 커서는 카운터를 따른다', async () => {
    const db = await testDatabase();
    await db.insertInto('users').values({ id: USER_A, email: 'a@tooday.app', name: 'a', password_hash: 'x' }).execute();
    const tasks = new SqlTaskStore(db);
    const syncReads = new SqlSyncReadStore(db);

    await tasks.create(TASK_INPUT); // seq 1
    // 없는 태스크의 remove — 행 변경 없이 seq 2를 소모한다 (갭)
    expect(await tasks.remove({ userId: USER_A, id: crypto.randomUUID() })).toBe(false);

    const delta = await syncReads.changes({ userId: USER_A, cursor: 0 });
    expect(delta.tasks.map((change) => change.syncSeq)).toEqual([1]);
    // 행-max 도출이었다면 1 — 카운터 도출이므로 2
    expect(delta.cursor).toBe(2);

    const range = await syncReads.range({ userId: USER_A, from: '2026-07-01', to: '2026-07-31' });
    expect(range.cursor).toBe(2);
  });
});
