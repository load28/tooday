import type { AuthResponse, LoginRequest, MeResponse, SignupRequest } from '@tooday/shared';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import type { BffConfig } from '../config';
import { errorResponse } from '../http';
import type { AppEnv } from '../types';
import { createAuthMiddleware } from './middleware';
import type { Session, SessionStore } from './session-store';
import type { UserStore } from './user-store';
import { DuplicateEmailError } from './user-store';

export interface AuthRouteDeps {
  config: BffConfig;
  users: UserStore;
  sessions: SessionStore;
}

const MIN_PASSWORD_LENGTH = 8;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseLogin(body: unknown): LoginRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { email, password } = body as Record<string, unknown>;
  if (!isNonEmptyString(email) || !isNonEmptyString(password)) return null;
  return { email, password };
}

function parseSignup(body: unknown): SignupRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { email, password, name } = body as Record<string, unknown>;
  if (!isNonEmptyString(email) || !email.includes('@')) return null;
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) return null;
  if (!isNonEmptyString(name)) return null;
  return { email, password, name };
}

function setSessionCookie(c: Context, config: BffConfig, session: Session) {
  setCookie(c, config.cookieName, session.token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(config.sessionTtlMs / 1000),
  });
}

export function createAuthRoutes({ config, users, sessions }: AuthRouteDeps) {
  const requireAuth = createAuthMiddleware({ config, sessions, users });

  return new Hono<AppEnv>()
    .post('/signup', async (c) => {
      const input = parseSignup(await c.req.json().catch(() => null));
      if (!input) {
        return errorResponse(c, 400, 'INVALID_REQUEST', `email, name, ${MIN_PASSWORD_LENGTH}자 이상의 password가 필요합니다.`);
      }
      try {
        const user = await users.create(input);
        const session = sessions.create(user.id);
        setSessionCookie(c, config, session);
        return c.json<AuthResponse>({ user, token: session.token }, 201);
      } catch (error) {
        if (error instanceof DuplicateEmailError) {
          return errorResponse(c, 409, 'EMAIL_TAKEN', '이미 가입된 이메일입니다.');
        }
        throw error;
      }
    })
    .post('/login', async (c) => {
      const input = parseLogin(await c.req.json().catch(() => null));
      if (!input) {
        return errorResponse(c, 400, 'INVALID_REQUEST', 'email과 password가 필요합니다.');
      }
      const user = await users.verifyCredentials(input.email, input.password);
      if (!user) {
        return errorResponse(c, 401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      const session = sessions.create(user.id);
      setSessionCookie(c, config, session);
      return c.json<AuthResponse>({ user, token: session.token });
    })
    .post('/logout', requireAuth, (c) => {
      sessions.revoke(c.get('sessionToken'));
      deleteCookie(c, config.cookieName, { path: '/' });
      return c.json({ ok: true });
    })
    .get('/me', requireAuth, (c) => {
      return c.json<MeResponse>({ user: c.get('user') });
    });
}
