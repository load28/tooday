import { describe, expect, it } from 'bun:test';
import { authResponseSchema, meResponseSchema } from '@tooday/shared';
import { z } from 'zod';
import { createApp } from './app';
import { DEFAULT_SESSION_COOKIE_NAME, serializeSessionCookie, serializeSessionCookieRemoval } from './auth/session-cookie';
import { InMemorySessionStore } from './auth/session-store';
import { InMemoryUserStore } from './auth/user-store';
import type { BffConfig } from './config';
import { CACHE_CONTROL, CACHE_CONTROL_BY_PATH } from './trpc/cache';

function createTestConfig(overrides: Partial<BffConfig> = {}): BffConfig {
  return {
    port: 0,
    allowedOrigins: ['http://localhost:3000'],
    cookieName: DEFAULT_SESSION_COOKIE_NAME,
    cookieSecure: false,
    sessionTtlMs: 60_000,
    ...overrides,
  };
}

function createTestApp(config: BffConfig = createTestConfig()) {
  return createApp({
    config,
    users: new InMemoryUserStore(),
    sessions: new InMemorySessionStore(config.sessionTtlMs),
  });
}

const SIGNUP_BODY = { email: 'test@tooday.app', password: 'password123', name: '테스터' };

function mutation(input: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  };
}

function sessionCookieHeader(token: string): string {
  return `${DEFAULT_SESSION_COOKIE_NAME}=${token}`;
}

const trpcSuccessEnvelopeSchema = z.object({ result: z.object({ data: z.unknown() }) });

async function unwrapTrpcData<T>({ res, schema }: { res: Response; schema: z.ZodType<T> }): Promise<T> {
  const envelope = trpcSuccessEnvelopeSchema.parse(await res.json());
  return schema.parse(envelope.result.data);
}

async function signup(app: ReturnType<typeof createTestApp>) {
  const res = await app.request('/trpc/auth.signup', mutation(SIGNUP_BODY));
  return { res, data: await unwrapTrpcData({ res, schema: authResponseSchema }), cookie: res.headers.get('set-cookie') };
}

describe('health', () => {
  it('상태를 반환한다', async () => {
    const app = createTestApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

describe('auth.signup', () => {
  it('유저를 생성하고 세션 쿠키와 토큰을 함께 내려준다', async () => {
    const config = createTestConfig();
    const app = createTestApp(config);
    const { res, data, cookie } = await signup(app);

    expect(res.status).toBe(200);
    expect(data.user).toMatchObject({ email: 'test@tooday.app', name: '테스터' });
    expect(data.token).toHaveLength(64);
    expect(cookie).toBe(serializeSessionCookie({ config, token: data.token }));
    expect(res.headers.get('cache-control')).toBe(CACHE_CONTROL.private);
  });

  it('중복 이메일이면 409를 반환한다', async () => {
    const app = createTestApp();
    await signup(app);
    const res = await app.request('/trpc/auth.signup', mutation(SIGNUP_BODY));
    expect(res.status).toBe(409);
  });

  it('짧은 비밀번호는 400을 반환한다', async () => {
    const app = createTestApp();
    const res = await app.request('/trpc/auth.signup', mutation({ ...SIGNUP_BODY, password: 'short' }));
    expect(res.status).toBe(400);
  });
});

describe('auth.login', () => {
  it('올바른 자격증명이면 쿠키와 토큰을 내려준다', async () => {
    const config = createTestConfig();
    const app = createTestApp(config);
    await signup(app);

    const res = await app.request('/trpc/auth.login', mutation({ email: SIGNUP_BODY.email, password: SIGNUP_BODY.password }));
    expect(res.status).toBe(200);
    const { token } = await unwrapTrpcData({ res, schema: authResponseSchema });
    expect(res.headers.get('set-cookie')).toBe(serializeSessionCookie({ config, token }));
  });

  it('비밀번호가 틀리면 401을 반환한다', async () => {
    const app = createTestApp();
    await signup(app);

    const res = await app.request('/trpc/auth.login', mutation({ email: SIGNUP_BODY.email, password: 'wrong-password' }));
    expect(res.status).toBe(401);
  });
});

describe('user.me — 인증 (쿠키 + 헤더 이중 지원)', () => {
  it('쿠키 방식으로 접근할 수 있다', async () => {
    const app = createTestApp();
    const { data } = await signup(app);

    const res = await app.request('/trpc/user.me', {
      headers: { Cookie: sessionCookieHeader(data.token) },
    });
    expect(res.status).toBe(200);
    const { user } = await unwrapTrpcData({ res, schema: meResponseSchema });
    expect(user.email).toBe('test@tooday.app');
  });

  it('Authorization Bearer 헤더 방식으로 접근할 수 있다', async () => {
    const app = createTestApp();
    const { data } = await signup(app);

    const res = await app.request('/trpc/user.me', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(res.status).toBe(200);
    const { user } = await unwrapTrpcData({ res, schema: meResponseSchema });
    expect(user.email).toBe('test@tooday.app');
  });

  it('헤더가 쿠키보다 우선한다', async () => {
    const app = createTestApp();
    const { data } = await signup(app);

    const res = await app.request('/trpc/user.me', {
      headers: {
        Authorization: 'Bearer invalid-token',
        Cookie: sessionCookieHeader(data.token),
      },
    });
    expect(res.status).toBe(401);
  });

  it('인증 정보가 없으면 401을 반환한다', async () => {
    const app = createTestApp();
    const res = await app.request('/trpc/user.me');
    expect(res.status).toBe(401);
  });

  it('만료된 세션은 401을 반환한다', async () => {
    const app = createTestApp(createTestConfig({ sessionTtlMs: -1 }));
    const { data } = await signup(app);

    const res = await app.request('/trpc/user.me', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(res.status).toBe(401);
  });

  it('프라이빗 응답이므로 캐시되지 않는다', async () => {
    const app = createTestApp();
    const { data } = await signup(app);

    const res = await app.request('/trpc/user.me', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(res.headers.get('cache-control')).toBe(CACHE_CONTROL.private);
  });
});

describe('HTTP 캐시 정책', () => {
  it('pub.* 쿼리는 경로별 public Cache-Control을 받는다', async () => {
    const app = createTestApp();
    const res = await app.request('/trpc/pub.appConfig');
    expect(res.status).toBe(200);
    const expectedCacheControl = CACHE_CONTROL_BY_PATH['pub.appConfig'];
    if (expectedCacheControl === undefined) {
      throw new Error('pub.appConfig 캐시 정책이 정의되어 있지 않습니다.');
    }
    expect(res.headers.get('cache-control')).toBe(expectedCacheControl);
    const { version } = await unwrapTrpcData({ res, schema: z.object({ version: z.string() }) });
    expect(version).toBeDefined();
  });

  it('pub 외 경로가 섞인 배치 요청은 캐시되지 않는다', async () => {
    const app = createTestApp();
    const { data } = await signup(app);

    const res = await app.request('/trpc/pub.appConfig,user.me?batch=1', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(CACHE_CONTROL.private);
  });

  it('존재하지 않는 프로시저 에러 응답은 캐시되지 않는다', async () => {
    const app = createTestApp();
    const res = await app.request('/trpc/pub.doesNotExist');
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe(CACHE_CONTROL.private);
  });
});

describe('auth.logout', () => {
  it('세션을 무효화하고 쿠키를 삭제한다 (쿠키/헤더 어느 쪽으로도 재사용 불가)', async () => {
    const config = createTestConfig();
    const app = createTestApp(config);
    const { data } = await signup(app);

    const logoutRes = await app.request('/trpc/auth.logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookieHeader(data.token) },
    });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers.get('set-cookie')).toBe(serializeSessionCookieRemoval(config));

    const viaCookie = await app.request('/trpc/user.me', {
      headers: { Cookie: sessionCookieHeader(data.token) },
    });
    expect(viaCookie.status).toBe(401);

    const viaHeader = await app.request('/trpc/user.me', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(viaHeader.status).toBe(401);
  });
});
