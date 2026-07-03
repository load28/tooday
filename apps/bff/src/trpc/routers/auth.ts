import type { AuthResponse } from '@tooday/shared';
import { loginRequestSchema, signupRequestSchema } from '@tooday/shared';
import type { SessionStore, UserStore } from '../../auth/ports';
import { DomainError } from '../../errors';
import { protectedProcedure, publicProcedure, router } from '../init';

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
        throw new DomainError('INVALID_CREDENTIALS');
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
