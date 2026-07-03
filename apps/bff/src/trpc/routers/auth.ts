import type { SessionStore, UserStore } from '@bff/auth/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/errors';
import { protectedProcedure, publicProcedure, router } from '@bff/trpc/init';
import type { AuthResponse } from '@tooday/shared';
import { loginRequestSchema, signupRequestSchema } from '@tooday/shared';

export interface AuthRouterDeps {
  users: UserStore;
  sessions: SessionStore;
}

export function createAuthRouter({ users, sessions }: AuthRouterDeps) {
  return router({
    signup: publicProcedure.input(signupRequestSchema).mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const user = await users.create(input);
      const session = await sessions.create(user.id);
      ctx.setSessionCookie(session.token);
      return { user, token: session.token };
    }),

    login: publicProcedure.input(loginRequestSchema).mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const user = await users.verifyCredentials(input);
      if (!user) {
        throw new DomainError(DOMAIN_ERROR_CODES.INVALID_CREDENTIALS);
      }
      const session = await sessions.create(user.id);
      ctx.setSessionCookie(session.token);
      return { user, token: session.token };
    }),

    logout: protectedProcedure.mutation(async ({ ctx }) => {
      await sessions.revoke(ctx.sessionToken);
      ctx.clearSessionCookie();
      return { ok: true };
    }),
  });
}
