import type { AuthResponse } from '@tooday/shared';
import { loginRequestSchema, signupRequestSchema } from '@tooday/shared';
import { TRPCError } from '@trpc/server';
import type { SessionStore } from '../../auth/session-store';
import type { UserStore } from '../../auth/user-store';
import { DuplicateEmailError } from '../../auth/user-store';
import { protectedProcedure, publicProcedure, router } from '../init';

export interface AuthRouterDeps {
  users: UserStore;
  sessions: SessionStore;
}

export function createAuthRouter({ users, sessions }: AuthRouterDeps) {
  return router({
    signup: publicProcedure.input(signupRequestSchema).mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      try {
        const user = await users.create(input);
        const session = sessions.create(user.id);
        ctx.setSessionCookie(session.token);
        return { user, token: session.token };
      } catch (error) {
        if (error instanceof DuplicateEmailError) {
          throw new TRPCError({ code: 'CONFLICT', message: '이미 가입된 이메일입니다.' });
        }
        throw error;
      }
    }),

    login: publicProcedure.input(loginRequestSchema).mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const user = await users.verifyCredentials(input);
      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }
      const session = sessions.create(user.id);
      ctx.setSessionCookie(session.token);
      return { user, token: session.token };
    }),

    logout: protectedProcedure.mutation(({ ctx }) => {
      sessions.revoke(ctx.sessionToken);
      ctx.clearSessionCookie();
      return { ok: true };
    }),
  });
}
