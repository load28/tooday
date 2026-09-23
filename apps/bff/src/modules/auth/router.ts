import type { AccessTokenService } from '@bff/modules/auth/access-token';
import type { RefreshTokenStore, UserStore } from '@bff/modules/auth/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { protectedProcedure, publicProcedure, router, sessionProcedure } from '@bff/trpc/init';
import type { AuthResponse, CurrentUserResponse, RefreshResponse, TokenPair, User } from '@tooday/shared';
import { loginRequestSchema, refreshRequestSchema, signupRequestSchema } from '@tooday/shared';

export interface AuthRouterDeps {
  users: UserStore;
  /** 조립 계층이 제공하는 현재 사용자 조회. 다른 도메인의 구현에 직접 의존하지 않는다. */
  findUserById(userId: string): Promise<User | null>;
  refreshTokens: RefreshTokenStore;
  accessTokens: AccessTokenService;
}

export function createAuthRouter({ users, findUserById, refreshTokens, accessTokens }: AuthRouterDeps) {
  // 로그인/회원가입 공통 — 세션(리프레시) 발급 + 그 세션의 sid로 액세스 서명.
  const issueTokens = async (userId: string): Promise<TokenPair> => {
    const refresh = await refreshTokens.issue(userId);
    return {
      accessToken: await accessTokens.sign({ userId, sessionId: refresh.sessionId }),
      refreshToken: refresh.token,
    };
  };

  return router({
    // 세션 프로브 — 게이트(회원가입/로그인 포함)가 매 진입마다 부른다. 무효 자격증명
    // (만료·폐기) → 401은 sessionProcedure가 거르므로, 여기서 userId가 null이면 자격증명이
    // 아예 없는 익명이다. 익명은 401 에러가 아니라 200 + user:null로 돌려 캐시·dehydrate에
    // 성공으로 남게 한다(재요청 폭주 제거).
    getCurrentUser: sessionProcedure.query(async ({ ctx }): Promise<CurrentUserResponse> => {
      if (!ctx.userId) {
        return { user: null };
      }
      // 액세스 JWT는 userId만 담으므로 전체 프로필은 여기서 지연 조회한다(핫패스가 아니라 허용).
      const user = await findUserById(ctx.userId);
      if (!user) {
        throw new DomainError(DOMAIN_ERROR_CODES.UNAUTHENTICATED);
      }
      return { user };
    }),

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
