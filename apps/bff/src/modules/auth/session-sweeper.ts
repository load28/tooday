import type { SessionStore } from '@bff/modules/auth/ports';
import type { Logger } from '@bff/platform/logging';

const DEFAULT_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

export interface StartSessionSweepOptions {
  sessions: SessionStore;
  logger: Logger;
  intervalMs?: number;
}

/**
 * 만료 세션을 주기적으로 청소한다(부팅 시 1회 + 인터벌). 조회 경로에 안 걸리는
 * 만료 행이 저장소에 누적되지 않게 한다. `SessionStore.deleteExpired` 포트만 쓰므로
 * 어떤 어댑터에도 무관하다 — 필요 여부 판단은 호출부(createSessionStore의 needsExpirySweep)에 맡긴다.
 * 인터벌을 멈추는 함수를 반환한다.
 */
export async function startSessionSweep({
  sessions,
  logger,
  intervalMs = DEFAULT_SWEEP_INTERVAL_MS,
}: StartSessionSweepOptions): Promise<() => void> {
  const sweep = async (): Promise<void> => {
    try {
      const deleted = await sessions.deleteExpired();
      if (deleted > 0) logger.info('sessions_swept', { deleted });
    } catch (error) {
      logger.error('session_sweep_failed', { message: error instanceof Error ? error.message : String(error) });
    }
  };
  await sweep();
  const timer = setInterval(() => void sweep(), intervalMs);
  return () => clearInterval(timer);
}
