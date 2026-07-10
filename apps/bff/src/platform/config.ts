import type { LogFormat } from '@bff/platform/logging';

export interface BffConfig {
  port: number;
  allowedOrigins: string[];
  accessCookieName: string;
  refreshCookieName: string;
  cookieSecure: boolean;
  /** 액세스 쿠키 maxAge — API의 액세스 토큰 TTL과 맞춘다 (쿠키 수명은 표현 관심사라 BFF 소유). */
  accessTtlMs: number;
  /** 리프레시 쿠키 maxAge — API의 리프레시 absolute 하드캡과 맞춘다. idle 만료는 서버(API)가 판단한다. */
  refreshAbsoluteTtlMs: number;
  /** 러스트 API(apps/api) 베이스 URL — 인증·데이터의 실제 내부 동작은 전부 여기로 위임된다. */
  apiUrl: string;
  /** BFF ↔ API 내부 인증 토큰(API의 INTERNAL_API_TOKEN과 동일 값). 프로덕션에서는 필수. */
  apiInternalToken: string | null;
  logFormat: LogFormat;
  /** 요청 로거를 붙일지 — 테스트에서는 로그 소음을 없애려 끈다. */
  logRequests: boolean;
}

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function loadConfig(env: Record<string, string | undefined> = process.env): BffConfig {
  const isProduction = env.NODE_ENV === 'production';
  const apiInternalToken = env.INTERNAL_API_TOKEN ?? null;
  if (isProduction && !apiInternalToken) {
    throw new Error('INTERNAL_API_TOKEN는 프로덕션에서 필수다 (BFF ↔ API 내부 인증).');
  }
  return {
    port: Number(env.BFF_PORT ?? 3002),
    allowedOrigins: (env.BFF_ALLOWED_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    accessCookieName: env.BFF_ACCESS_COOKIE ?? 'tooday_access',
    refreshCookieName: env.BFF_REFRESH_COOKIE ?? 'tooday_refresh',
    cookieSecure: isProduction,
    accessTtlMs: Number(env.BFF_ACCESS_TTL_MS ?? 15 * MINUTE_MS),
    refreshAbsoluteTtlMs: Number(env.BFF_REFRESH_ABSOLUTE_TTL_MS ?? 90 * DAY_MS),
    apiUrl: env.API_URL ?? 'http://localhost:3003',
    apiInternalToken,
    logFormat:
      env.BFF_LOG_FORMAT === 'json' || env.BFF_LOG_FORMAT === 'pretty' ? env.BFF_LOG_FORMAT : isProduction ? 'json' : 'pretty',
    logRequests: env.NODE_ENV !== 'test',
  };
}
