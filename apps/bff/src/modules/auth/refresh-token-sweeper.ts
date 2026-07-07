import type { RefreshTokenStore } from '@bff/modules/auth/ports';
import type { Logger } from '@bff/platform/logging';

const DEFAULT_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

export interface StartRefreshTokenSweepOptions {
  store: RefreshTokenStore;
  logger: Logger;
  intervalMs?: number;
}

/**
 * 만료(idle/absolute) 리프레시 토큰을 주기적으로 청소한다(부팅 시 1회 + 인터벌).
 * 조회 경로에 안 걸리는 만료 행이 저장소에 누적되지 않게 한다. `deleteExpired` 포트만
 * 쓰므로 어떤 어댑터에도 무관하다 — 필요 여부는 호출부(needsExpirySweep)가 판단한다.
 * 인터벌을 멈추는 함수를 반환한다.
 */
export async function startRefreshTokenSweep({
  store,
  logger,
  intervalMs = DEFAULT_SWEEP_INTERVAL_MS,
}: StartRefreshTokenSweepOptions): Promise<() => void> {
  const sweep = async (): Promise<void> => {
    try {
      const deleted = await store.deleteExpired();
      if (deleted > 0) logger.info('refresh_tokens_swept', { deleted });
    } catch (error) {
      logger.error('refresh_token_sweep_failed', { message: error instanceof Error ? error.message : String(error) });
    }
  };
  await sweep();
  const timer = setInterval(() => void sweep(), intervalMs);
  return () => clearInterval(timer);
}
