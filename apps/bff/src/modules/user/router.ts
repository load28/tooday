import type { UserReader } from '@bff/modules/user/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { publicProcedure, router } from '@bff/trpc/init';
import type { MeResponse } from '@tooday/shared';

export interface UserRouterDeps {
  users: UserReader;
}

export function createUserRouter({ users }: UserRouterDeps) {
  return router({
    // 세션 프로브 — protected가 아니라 optional-auth다. 게이트(회원가입/로그인 포함)가
    // 매 진입마다 부르므로, 익명 방문자를 401 에러가 아니라 200 + user:null로 돌려
    // 캐시·dehydrate에 성공으로 남게 한다(재요청 폭주 제거). 자격증명이 실렸는데 무효면
    // 여전히 401을 던져 클라이언트의 refresh 복구 경로를 유지한다.
    me: publicProcedure.query(async ({ ctx }): Promise<MeResponse> => {
      if (!ctx.userId) {
        // 자격증명이 실림(만료·폐기) → refresh 챌린지. 아무것도 안 실림(익명) → 200 + null.
        if (ctx.hasCredential) {
          throw new DomainError(DOMAIN_ERROR_CODES.UNAUTHENTICATED);
        }
        return { user: null };
      }
      // 액세스 JWT는 userId만 담으므로 전체 프로필은 여기서 지연 조회한다(핫패스가 아니라 허용).
      const user = await users.findById(ctx.userId);
      if (!user) {
        throw new DomainError(DOMAIN_ERROR_CODES.UNAUTHENTICATED);
      }
      return { user };
    }),
  });
}
