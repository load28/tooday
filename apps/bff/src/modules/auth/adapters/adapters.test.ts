import { describe, expect, it } from 'bun:test';
import { InMemoryRefreshTokenStore, InMemoryUserStore } from '@bff/modules/auth/adapters/memory';
import { SqlRefreshTokenStore, SqlUserStore } from '@bff/modules/auth/adapters/sql';
import type { RefreshTokenStore, UserStore } from '@bff/modules/auth/ports';
import { testDatabase } from '@bff/platform/db/testing';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';

interface Stores {
  users: UserStore;
  refreshTokens: RefreshTokenStore;
}

interface Implementation {
  name: string;
  make: (options: { idleTtlMs: number; absoluteTtlMs: number }) => Promise<Stores>;
}

const IMPLEMENTATIONS: Implementation[] = [
  {
    name: 'memory',
    make: async ({ idleTtlMs, absoluteTtlMs }) => ({
      users: new InMemoryUserStore(),
      refreshTokens: new InMemoryRefreshTokenStore({ idleTtlMs, absoluteTtlMs }),
    }),
  },
  {
    name: 'sql(pglite)',
    make: async ({ idleTtlMs, absoluteTtlMs }) => {
      const db = await testDatabase();
      return { users: new SqlUserStore(db), refreshTokens: new SqlRefreshTokenStore({ db, idleTtlMs, absoluteTtlMs }) };
    },
  },
];

const INPUT = { email: 'store@tooday.app', password: 'password123', name: '스토어' };
const LONG = { idleTtlMs: 60_000, absoluteTtlMs: 120_000 };

for (const { name, make } of IMPLEMENTATIONS) {
  describe(`스토어 포트 계약 — ${name}`, () => {
    it('유저를 생성한다 (이메일은 정규화)', async () => {
      const { users } = await make(LONG);
      const created = await users.create({ ...INPUT, email: ' Store@Tooday.App ' });
      expect(created.email).toBe('store@tooday.app');
    });

    it('중복 이메일이면 DomainError(EMAIL_TAKEN)를 던진다', async () => {
      const { users } = await make(LONG);
      await users.create(INPUT);
      await expect(users.create(INPUT)).rejects.toMatchObject(new DomainError(DOMAIN_ERROR_CODES.EMAIL_TAKEN));
    });

    it('자격 증명을 검증한다', async () => {
      const { users } = await make(LONG);
      const created = await users.create(INPUT);

      expect(await users.verifyCredentials({ email: INPUT.email, password: INPUT.password })).toEqual(created);
      expect(await users.verifyCredentials({ email: INPUT.email, password: 'wrong-password' })).toBeNull();
      expect(await users.verifyCredentials({ email: 'nobody@tooday.app', password: INPUT.password })).toBeNull();
    });

    it('리프레시를 발급하고, 회전은 새 토큰을 주며 옛 토큰을 폐기한다', async () => {
      const { users, refreshTokens } = await make(LONG);
      const user = await users.create(INPUT);

      const issued = await refreshTokens.issue(user.id);
      expect(issued.userId).toBe(user.id);

      const rotated = await refreshTokens.rotate(issued.token);
      expect(rotated?.userId).toBe(user.id);
      expect(rotated?.token).not.toBe(issued.token);
      // 옛 토큰은 회전으로 폐기 → 재사용 불가
      expect(await refreshTokens.rotate(issued.token)).toBeNull();
    });

    it('회전은 같은 세션(sid)을 유지한다', async () => {
      const { users, refreshTokens } = await make(LONG);
      const user = await users.create(INPUT);
      const issued = await refreshTokens.issue(user.id);
      const rotated = await refreshTokens.rotate(issued.token);
      expect(rotated?.sessionId).toBe(issued.sessionId);
    });

    it('회전된 옛 토큰을 재사용하면 세션 전체가 무효화된다 (재사용 탐지)', async () => {
      const { users, refreshTokens } = await make(LONG);
      const user = await users.create(INPUT);
      const t1 = await refreshTokens.issue(user.id);
      const t2 = await refreshTokens.rotate(t1.token); // t1 supersede, t2 활성
      if (!t2) throw new Error('회전이 실패했다');

      // 옛 토큰(t1) 재제시 = 탈취 신호 → 세션 전체 무효화
      expect(await refreshTokens.rotate(t1.token)).toBeNull();
      // 활성이던 t2도 함께 죽는다
      expect(await refreshTokens.rotate(t2.token)).toBeNull();
    });

    it('revoke는 토큰이 속한 세션 전체를 무효화한다 (로그아웃)', async () => {
      const { users, refreshTokens } = await make(LONG);
      const user = await users.create(INPUT);
      const t1 = await refreshTokens.issue(user.id);
      const t2 = await refreshTokens.rotate(t1.token);
      if (!t2) throw new Error('회전이 실패했다');

      // 현재 토큰으로 로그아웃하면 옛(t1)·현재(t2) 토큰 모두 폐기된다
      await refreshTokens.revoke(t2.token);
      expect(await refreshTokens.rotate(t2.token)).toBeNull();
    });

    it('isSessionLive: 발급 시 live, 폐기하면 dead (즉시 무효화 근거)', async () => {
      const { users, refreshTokens } = await make(LONG);
      const user = await users.create(INPUT);
      const issued = await refreshTokens.issue(user.id);

      expect(await refreshTokens.isSessionLive(issued.sessionId)).toBe(true);
      expect(await refreshTokens.isSessionLive(crypto.randomUUID())).toBe(false);

      await refreshTokens.revoke(issued.token);
      expect(await refreshTokens.isSessionLive(issued.sessionId)).toBe(false);
    });

    it('isSessionLive: 회전해도 같은 세션이 계속 live', async () => {
      const { users, refreshTokens } = await make(LONG);
      const user = await users.create(INPUT);
      const issued = await refreshTokens.issue(user.id);
      const rotated = await refreshTokens.rotate(issued.token);
      if (!rotated) throw new Error('회전이 실패했다');

      expect(await refreshTokens.isSessionLive(rotated.sessionId)).toBe(true);
    });

    it('isSessionLive: absolute 만료 세션은 dead', async () => {
      const { users, refreshTokens } = await make({ idleTtlMs: 60_000, absoluteTtlMs: -1 });
      const user = await users.create(INPUT);
      const issued = await refreshTokens.issue(user.id);
      expect(await refreshTokens.isSessionLive(issued.sessionId)).toBe(false);
    });

    it('회전은 idle을 슬라이딩하되 absolute 하드캡을 넘지 않는다', async () => {
      const { users, refreshTokens } = await make({ idleTtlMs: 60_000, absoluteTtlMs: 30_000 });
      const user = await users.create(INPUT);
      const issued = await refreshTokens.issue(user.id);

      const rotated = await refreshTokens.rotate(issued.token);
      // idle(60s)이 아니라 absolute 상한(≈issue+30s)에 캡된다
      expect(rotated?.expiresAt).toBe(issued.absoluteExpiresAt);
      expect(rotated?.absoluteExpiresAt).toBe(issued.absoluteExpiresAt);
    });

    it('idle 만료 토큰은 회전되지 않고, deleteExpired가 청소한다', async () => {
      const { users, refreshTokens } = await make({ idleTtlMs: -1, absoluteTtlMs: 120_000 });
      const user = await users.create(INPUT);

      await refreshTokens.issue(user.id);
      const expired = await refreshTokens.issue(user.id);
      expect(await refreshTokens.rotate(expired.token)).toBeNull(); // 회전이 만료 행 하나를 지운다

      expect(await refreshTokens.deleteExpired()).toBe(1);
      expect(await refreshTokens.deleteExpired()).toBe(0);
    });

    it('absolute 만료 토큰은 회전되지 않는다', async () => {
      const { users, refreshTokens } = await make({ idleTtlMs: 60_000, absoluteTtlMs: -1 });
      const user = await users.create(INPUT);
      const issued = await refreshTokens.issue(user.id);

      expect(await refreshTokens.rotate(issued.token)).toBeNull();
    });
  });
}
