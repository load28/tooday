import { sign, verify } from 'hono/jwt';

export interface AccessTokenClaims {
  userId: string;
  /** 세션 식별자(OIDC `sid` 클레임) — 매 요청 세션 라이브니스 체크의 키 */
  sessionId: string;
}

/**
 * 액세스 토큰(무상태 JWT) 발급·검증. 서명·만료 검증만으로 신원(userId)과 세션(sid)을
 * 얻는다 — 저장소를 타지 않는다. 즉시 무효화는 이 검증 뒤 세션 라이브니스 체크로 얹는다
 * (JWT 자체는 만료 전까지 유효하므로).
 */
export interface AccessTokenService {
  sign(claims: AccessTokenClaims): Promise<string>;
  /** 서명·만료가 유효하면 클레임(userId+sid), 아니면 null */
  verify(token: string): Promise<AccessTokenClaims | null>;
}

const ALG = 'HS256';

export function createAccessTokenService({ secret, ttlMs }: { secret: string; ttlMs: number }): AccessTokenService {
  return {
    async sign({ userId, sessionId }: AccessTokenClaims): Promise<string> {
      return sign({ sub: userId, sid: sessionId, exp: Math.floor((Date.now() + ttlMs) / 1000) }, secret, ALG);
    },
    async verify(token: string): Promise<AccessTokenClaims | null> {
      try {
        // hono/jwt가 서명·alg·exp를 검증하고, 만료/변조 시 던진다.
        const payload = await verify(token, secret, ALG);
        if (typeof payload.sub === 'string' && typeof payload.sid === 'string') {
          return { userId: payload.sub, sessionId: payload.sid };
        }
        return null;
      } catch {
        return null;
      }
    },
  };
}
