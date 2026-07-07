import { sign, verify } from 'hono/jwt';

/**
 * 액세스 토큰(무상태 JWT) 발급·검증. 저장소를 타지 않는다 — 서명만으로 인증하는
 * 핫패스의 핵심. 페이로드는 userId(sub)와 만료(exp)뿐이고, 유저 프로필은 담지 않아
 * (담으면 프로필 변경 반영이 토큰 만료까지 지연되므로) userId로 필요 시 조회한다.
 */
export interface AccessTokenService {
  sign(userId: string): Promise<string>;
  /** 서명·만료가 유효하면 userId, 아니면 null */
  verify(token: string): Promise<string | null>;
}

const ALG = 'HS256';

export function createAccessTokenService({ secret, ttlMs }: { secret: string; ttlMs: number }): AccessTokenService {
  return {
    async sign(userId: string): Promise<string> {
      return sign({ sub: userId, exp: Math.floor((Date.now() + ttlMs) / 1000) }, secret, ALG);
    },
    async verify(token: string): Promise<string | null> {
      try {
        // hono/jwt가 exp를 검증하고, 만료/변조 시 던진다.
        const payload = await verify(token, secret, ALG);
        return typeof payload.sub === 'string' ? payload.sub : null;
      } catch {
        return null;
      }
    },
  };
}
