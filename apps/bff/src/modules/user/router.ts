import type { UserReader } from '@bff/modules/user/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { router, sessionProcedure } from '@bff/trpc/init';
import type { MeResponse } from '@tooday/shared';

export interface UserRouterDeps {
  users: UserReader;
}

export function createUserRouter({ users }: UserRouterDeps) {
  return router({
    // 세션 프로브 — 게이트(회원가입/로그인 포함)가 매 진입마다 부른다. 무효 자격증명
    // (만료·폐기) → 401은 sessionProcedure가 거르므로, 여기서 userId가 null이면 자격증명이
    // 아예 없는 익명이다. 익명은 401 에러가 아니라 200 + user:null로 돌려 캐시·dehydrate에
    // 성공으로 남게 한다(재요청 폭주 제거).
    me: sessionProcedure.query(async ({ ctx }): Promise<MeResponse> => {
      if (!ctx.userId) {
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
