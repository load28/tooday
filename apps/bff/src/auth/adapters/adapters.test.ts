import { describe, expect, it } from 'bun:test';
import { migrate } from '../../db/migrate';
import { createSqliteDatabase } from '../../db/sqlite';
import { DomainError } from '../../errors';
import type { SessionStore, UserStore } from '../ports';
import { InMemorySessionStore, InMemoryUserStore } from './memory';
import { SqlSessionStore, SqlUserStore } from './sql';

interface Stores {
  users: UserStore;
  sessions: SessionStore;
}

interface Implementation {
  name: string;
  make: (options: { ttlMs: number }) => Promise<Stores>;
}

const IMPLEMENTATIONS: Implementation[] = [
  {
    name: 'memory',
    make: async ({ ttlMs }) => ({
      users: new InMemoryUserStore(),
      sessions: new InMemorySessionStore(ttlMs),
    }),
  },
  {
    name: 'sql(sqlite)',
    make: async ({ ttlMs }) => {
      const db = createSqliteDatabase(':memory:');
      await migrate(db);
      return { users: new SqlUserStore(db), sessions: new SqlSessionStore({ db, ttlMs }) };
    },
  },
];

const INPUT = { email: 'store@tooday.app', password: 'password123', name: '스토어' };

for (const { name, make } of IMPLEMENTATIONS) {
  describe(`스토어 포트 계약 — ${name}`, () => {
    it('유저를 생성하고 id로 조회한다 (이메일은 정규화)', async () => {
      const { users } = await make({ ttlMs: 60_000 });
      const created = await users.create({ ...INPUT, email: ' Store@Tooday.App ' });
      expect(created.email).toBe('store@tooday.app');

      const found = await users.findById(created.id);
      expect(found).toEqual(created);
      expect(await users.findById('missing-id')).toBeNull();
    });

    it('중복 이메일이면 DomainError(EMAIL_TAKEN)를 던진다', async () => {
      const { users } = await make({ ttlMs: 60_000 });
      await users.create(INPUT);
      expect(users.create(INPUT)).rejects.toMatchObject(new DomainError('EMAIL_TAKEN'));
    });

    it('자격 증명을 검증한다', async () => {
      const { users } = await make({ ttlMs: 60_000 });
      const created = await users.create(INPUT);

      expect(await users.verifyCredentials({ email: INPUT.email, password: INPUT.password })).toEqual(created);
      expect(await users.verifyCredentials({ email: INPUT.email, password: 'wrong-password' })).toBeNull();
      expect(await users.verifyCredentials({ email: 'nobody@tooday.app', password: INPUT.password })).toBeNull();
    });

    it('세션을 생성/조회/무효화한다', async () => {
      const { users, sessions } = await make({ ttlMs: 60_000 });
      const user = await users.create(INPUT);

      const session = await sessions.create(user.id);
      expect(await sessions.get(session.token)).toEqual(session);

      await sessions.revoke(session.token);
      expect(await sessions.get(session.token)).toBeNull();
    });

    it('만료된 세션은 조회되지 않는다', async () => {
      const { users, sessions } = await make({ ttlMs: -1 });
      const user = await users.create(INPUT);

      const session = await sessions.create(user.id);
      expect(await sessions.get(session.token)).toBeNull();
    });
  });
}
