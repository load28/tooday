import type { AccessTokenService } from '@bff/modules/auth/access-token';
import type { RefreshTokenStore } from '@bff/modules/auth/ports';

export interface VerifyLiveSessionDeps {
  token: string | null;
  accessTokens: AccessTokenService;
  refreshTokens: RefreshTokenStore;
}

/**
 * 인증 핫패스의 단일 규칙 — tRPC 컨텍스트와 Hono 미들웨어(SSE)가 공유한다.
 *
 * 1) 액세스 JWT 서명·만료 검증(무상태)
 * 2) 세션 라이브니스 체크(sid) — 로그아웃/재사용 탐지로 폐기된 세션을 즉시 끊는다
 *
 * 유효하고 세션이 살아있으면 userId, 아니면 null. 라이브니스 저장소가 응답하지 못하면
 * **fail-closed**로 거부한다(가용성보다 보안 우선).
 */
export async function verifyLiveSession({ token, accessTokens, refreshTokens }: VerifyLiveSessionDeps): Promise<string | null> {
  if (!token) return null;
  const claims = await accessTokens.verify(token);
  if (!claims) return null;
  try {
    return (await refreshTokens.isSessionLive(claims.sessionId)) ? claims.userId : null;
  } catch {
    return null;
  }
}
