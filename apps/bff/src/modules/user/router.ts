import type { UserReader } from '@bff/modules/user/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { protectedProcedure, router } from '@bff/trpc/init';
import type { MeResponse } from '@tooday/shared';

export interface UserRouterDeps {
  users: UserReader;
}

export function createUserRouter({ users }: UserRouterDeps) {
  return router({
    // 액세스 JWT는 userId만 담으므로 전체 프로필은 여기서 지연 조회한다(핫패스가 아니라 허용).
    me: protectedProcedure.query(async ({ ctx }): Promise<MeResponse> => {
      const user = await users.findById(ctx.userId);
      if (!user) {
        throw new DomainError(DOMAIN_ERROR_CODES.UNAUTHENTICATED);
      }
      return { user };
    }),
  });
}
