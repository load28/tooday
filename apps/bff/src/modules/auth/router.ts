import type { AccessTokenService } from '@bff/modules/auth/access-token';
import type { RefreshTokenStore, UserStore } from '@bff/modules/auth/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { protectedProcedure, publicProcedure, router } from '@bff/trpc/init';
import type { AuthResponse, RefreshResponse, TokenPair } from '@tooday/shared';
import { loginRequestSchema, refreshRequestSchema, signupRequestSchema } from '@tooday/shared';

export interface AuthRouterDeps {
  users: UserStore;
  refreshTokens: RefreshTokenStore;
  accessTokens: AccessTokenService;
}

export function createAuthRouter({ users, refreshTokens, accessTokens }: AuthRouterDeps) {
  // 로그인/회원가입 공통 — 세션(리프레시) 발급 + 그 세션의 sid로 액세스 서명.
  const issueTokens = async (userId: string): Promise<TokenPair> => {
    const refresh = await refreshTokens.issue(userId);
    return {
      accessToken: await accessTokens.sign({ userId, sessionId: refresh.sessionId }),
      refreshToken: refresh.token,
    };
  };

  return router({
    signup: publicProcedure.input(signupRequestSchema).mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const user = await users.create(input);
      const tokens = await issueTokens(user.id);
      ctx.setAuthCookies(tokens);
      return { user, ...tokens };
    }),

    login: publicProcedure.input(loginRequestSchema).mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const user = await users.verifyCredentials(input);
      if (!user) {
        throw new DomainError(DOMAIN_ERROR_CODES.INVALID_CREDENTIALS);
      }
      const tokens = await issueTokens(user.id);
      ctx.setAuthCookies(tokens);
      return { user, ...tokens };
    }),

    // 액세스 만료 시 재발급 경로 — 리프레시를 회전(idle 슬라이딩 + absolute 캡)한다.
    // 웹은 리프레시 쿠키로, 네이티브 브릿지는 body로 토큰을 넘긴다.
    refresh: publicProcedure.input(refreshRequestSchema).mutation(async ({ ctx, input }): Promise<RefreshResponse> => {
      const presented = input.refreshToken ?? ctx.refreshToken;
      const rotated = presented ? await refreshTokens.rotate(presented) : null;
      if (!rotated) {
        ctx.clearAuthCookies();
        throw new DomainError(DOMAIN_ERROR_CODES.UNAUTHENTICATED);
      }
      const tokens: TokenPair = {
        accessToken: await accessTokens.sign({ userId: rotated.userId, sessionId: rotated.sessionId }),
        refreshToken: rotated.token,
      };
      ctx.setAuthCookies(tokens);
      return tokens;
    }),

    logout: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.refreshToken) {
        await refreshTokens.revoke(ctx.refreshToken);
      }
      ctx.clearAuthCookies();
      return { ok: true };
    }),
  });
}
