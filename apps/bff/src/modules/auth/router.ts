import type { AuthGateway } from '@bff/modules/auth/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { protectedProcedure, publicProcedure, router } from '@bff/trpc/init';
import type { AuthResponse, RefreshResponse } from '@tooday/shared';
import { loginRequestSchema, refreshRequestSchema, signupRequestSchema } from '@tooday/shared';

export interface AuthRouterDeps {
  auth: AuthGateway;
}

/** 조립만 한다 — 게이트웨이(러스트 API) 결과를 쿠키·tRPC 응답으로 배선. */
export function createAuthRouter({ auth }: AuthRouterDeps) {
  return router({
    signup: publicProcedure.input(signupRequestSchema).mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const response = await auth.signup(input);
      ctx.setAuthCookies(response);
      return response;
    }),

    login: publicProcedure.input(loginRequestSchema).mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const response = await auth.login(input);
      ctx.setAuthCookies(response);
      return response;
    }),

    // 액세스 만료 시 재발급 경로 — 리프레시를 회전(idle 슬라이딩 + absolute 캡)한다.
    // 웹은 리프레시 쿠키로, 네이티브 브릿지는 body로 토큰을 넘긴다.
    refresh: publicProcedure.input(refreshRequestSchema).mutation(async ({ ctx, input }): Promise<RefreshResponse> => {
      const presented = input.refreshToken ?? ctx.refreshToken;
      const rotated = presented ? await auth.refresh(presented) : null;
      if (!rotated) {
        ctx.clearAuthCookies();
        throw new DomainError(DOMAIN_ERROR_CODES.UNAUTHENTICATED);
      }
      ctx.setAuthCookies(rotated);
      return rotated;
    }),

    logout: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.refreshToken) {
        await auth.logout(ctx.refreshToken);
      }
      ctx.clearAuthCookies();
      return { ok: true };
    }),
  });
}
