import { describe, expect, it } from 'bun:test';
import { InMemoryProjectStore, InMemoryTaskStore } from '@bff/modules/task/adapters/memory';
import { SqlProjectStore, SqlTaskStore } from '@bff/modules/task/adapters/sql';
import type { ProjectStore, TaskStore } from '@bff/modules/task/ports';
import { migrate } from '@bff/platform/db/migrate';
import { createSqliteDatabase } from '@bff/platform/db/sqlite';

interface Stores {
  projects: ProjectStore;
  tasks: TaskStore;
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
    make: async () => ({
      projects: new InMemoryProjectStore(),
      tasks: new InMemoryTaskStore(),
      seedUser: async () => {},
    }),
  },
  {
    name: 'sql(sqlite)',
    make: async () => {
      const db = createSqliteDatabase(':memory:');
      await migrate(db);
      return {
        projects: new SqlProjectStore(db),
        tasks: new SqlTaskStore(db),
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

const USER_A = 'user-a';
const USER_B = 'user-b';

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

    it('프로젝트를 만들고 유저별로 이름순 조회한다', async () => {
      const { projects } = await setup();
      const second = await projects.create({ userId: USER_A, name: '일상', color: 'mint' });
      const first = await projects.create({ userId: USER_A, name: 'TooDay 앱', color: 'blue' });
      await projects.create({ userId: USER_B, name: '남의 프로젝트', color: 'gray' });

      expect(await projects.listByUser(USER_A)).toEqual([first, second]);
      expect(await projects.findById({ userId: USER_A, id: first.id })).toEqual(first);
      expect(await projects.findById({ userId: USER_B, id: first.id })).toBeNull();
    });

    it('태스크를 범위로 조회한다 — 유저·범위 필터, 날짜·시작시각 정렬', async () => {
      const { tasks } = await setup();
      const afternoon = await tasks.create(TASK_INPUT);
      const morning = await tasks.create({ ...TASK_INPUT, title: '아침 스트레칭', startAt: '07:30' });
      const nextDay = await tasks.create({ ...TASK_INPUT, title: '컴포넌트 리뷰', date: '2026-07-05' });
      await tasks.create({ ...TASK_INPUT, title: '범위 밖', date: '2026-07-20' });
      await tasks.create({ ...TASK_INPUT, userId: USER_B, title: '남의 태스크' });

      const listed = await tasks.listRange({ userId: USER_A, from: '2026-07-02', to: '2026-07-08' });
      expect(listed).toEqual([morning, afternoon, nextDay]);
    });

    it('상태를 바꾸되 소유자가 아니면 null을 반환한다', async () => {
      const { tasks } = await setup();
      const task = await tasks.create(TASK_INPUT);

      expect(await tasks.setStatus({ userId: USER_A, id: task.id, status: 'done' })).toEqual({ ...task, status: 'done' });
      expect(await tasks.setStatus({ userId: USER_B, id: task.id, status: 'todo' })).toBeNull();
      expect(await tasks.setStatus({ userId: USER_A, id: 'missing-id', status: 'todo' })).toBeNull();
    });
  });
}
