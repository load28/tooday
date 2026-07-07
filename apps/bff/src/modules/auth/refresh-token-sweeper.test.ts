import { describe, expect, it } from 'bun:test';
import type { RefreshTokenStore } from '@bff/modules/auth/ports';
import { startRefreshTokenSweep } from '@bff/modules/auth/refresh-token-sweeper';
import type { Logger } from '@bff/platform/logging';

interface LogCall {
  level: 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, unknown>;
}

function fakeLogger() {
  const calls: LogCall[] = [];
  const record = (level: LogCall['level']) => (message: string, fields?: Record<string, unknown>) => {
    calls.push({ level, message, fields });
  };
  const logger: Logger = { info: record('info'), warn: record('warn'), error: record('error') };
  return { logger, calls };
}

/** deleteExpired만 의미 있게 채운 RefreshTokenStore 스텁 — 스윕은 이 포트 하나만 쓴다. */
function fakeStore(deleteExpired: RefreshTokenStore['deleteExpired']): RefreshTokenStore {
  return {
    issue: async () => {
      throw new Error('unused');
    },
    rotate: async () => null,
    revoke: async () => {},
    deleteExpired,
  };
}

describe('startRefreshTokenSweep', () => {
  // intervalMs는 크게 둬 인터벌이 테스트 중 뜨지 않게 하고, 반환된 stop으로 타이머를 즉시 정리한다.
  const INTERVAL = 60_000;

  it('부팅 시 즉시 1회 청소하고, 지운 게 있으면 로그를 남긴다', async () => {
    const { logger, calls } = fakeLogger();
    let count = 0;
    const stop = await startRefreshTokenSweep({
      store: fakeStore(async () => {
        count += 1;
        return 3;
      }),
      logger,
      intervalMs: INTERVAL,
    });
    stop();
    expect(count).toBe(1);
    expect(calls).toContainEqual({ level: 'info', message: 'refresh_tokens_swept', fields: { deleted: 3 } });
  });

  it('지운 게 없으면 로그를 남기지 않는다', async () => {
    const { logger, calls } = fakeLogger();
    const stop = await startRefreshTokenSweep({ store: fakeStore(async () => 0), logger, intervalMs: INTERVAL });
    stop();
    expect(calls).toHaveLength(0);
  });

  it('deleteExpired가 던져도 삼키고 error 로그를 남긴다', async () => {
    const { logger, calls } = fakeLogger();
    const stop = await startRefreshTokenSweep({
      store: fakeStore(async () => {
        throw new Error('boom');
      }),
      logger,
      intervalMs: INTERVAL,
    });
    stop();
    expect(calls).toContainEqual({ level: 'error', message: 'refresh_token_sweep_failed', fields: { message: 'boom' } });
  });
});
