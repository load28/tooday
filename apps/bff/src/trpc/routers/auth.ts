import type { AuthResponse, LoginRequest, SignupRequest } from '@tooday/shared';
import { TRPCError } from '@trpc/server';
import type { SessionStore } from '../../auth/session-store';
import type { UserStore } from '../../auth/user-store';
import { DuplicateEmailError } from '../../auth/user-store';
import { protectedProcedure, publicProcedure, router } from '../init';

const MIN_PASSWORD_LENGTH = 8;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function loginInput(value: unknown): LoginRequest {
  const { email, password } = (value ?? {}) as Record<string, unknown>;
  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    throw new Error('email과 password가 필요합니다.');
  }
  return { email, password };
}

function signupInput(value: unknown): SignupRequest {
  const { email, password, name } = (value ?? {}) as Record<string, unknown>;
  if (!isNonEmptyString(email) || !email.includes('@') || !isNonEmptyString(name)) {
    throw new Error('올바른 email과 name이 필요합니다.');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`password는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
  }
  return { email, password, name };
}

export interface AuthRouterDeps {
  users: UserStore;
  sessions: SessionStore;
}

/**
 * 인증 라우터. 프라이빗 영역이므로 pub.* 밖 → 항상 private, no-store.
 * 세션 토큰은 httpOnly 쿠키(Set-Cookie)와 응답 body의 token 양쪽으로 내려간다.
 * 웹은 쿠키를, 네이티브/웹뷰 브릿지는 token을 Authorization: Bearer로 사용한다.
 */
export function createAuthRouter({ users, sessions }: AuthRouterDeps) {
  return router({
    signup: publicProcedure.input(signupInput).mutation(async ({ ctx, input }): Promise<AuthResponse> => {
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

    login: publicProcedure.input(loginInput).mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const user = await users.verifyCredentials(input.email, input.password);
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
