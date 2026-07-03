import { describe, expect, it } from 'bun:test';
import { createApp } from '@bff/app';
import { InMemorySessionStore, InMemoryUserStore } from '@bff/modules/auth/adapters/memory';
import { serializeSessionCookie, serializeSessionCookieRemoval } from '@bff/modules/auth/session-cookie';
import type { BffConfig } from '@bff/platform/config';
import { CACHE_DIRECTIVES_BY_PATH, PRIVATE_CACHE_CONTROL, serializePublicCacheControl } from '@bff/trpc/cache';
import { authResponseSchema, meResponseSchema, TRPC_ENDPOINT } from '@tooday/shared';
import { z } from 'zod';

function setup(overrides: Partial<BffConfig> = {}) {
  const config: BffConfig = {
    port: 0,
    allowedOrigins: ['http://localhost:3000'],
    cookieName: 'tooday_session',
    cookieSecure: false,
    sessionTtlMs: 60_000,
    databasePath: ':memory:',
    logFormat: 'pretty',
    ...overrides,
  };
  const app = createApp({
    config,
    users: new InMemoryUserStore(),
    sessions: new InMemorySessionStore(config.sessionTtlMs),
  });
  return { app, config };
}

type TestApp = ReturnType<typeof setup>['app'];

const SIGNUP_BODY = { email: 'test@tooday.app', password: 'password123', name: '테스터' };

function trpcPath(procedure: string): string {
  return `${TRPC_ENDPOINT}/${procedure}`;
}

function postJson({ input, headers = {} }: { input?: unknown; headers?: Record<string, string> } = {}): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: input === undefined ? undefined : JSON.stringify(input),
  };
}

function sessionCookieHeader({ config, token }: { config: BffConfig; token: string }): string {
  return `${config.cookieName}=${token}`;
}

const trpcSuccessEnvelopeSchema = z.object({ result: z.object({ data: z.unknown() }) });

async function unwrapTrpcData<T>({ res, schema }: { res: Response; schema: z.ZodType<T> }): Promise<T> {
  const envelope = trpcSuccessEnvelopeSchema.parse(await res.json());
  return schema.parse(envelope.result.data);
}

async function signup(app: TestApp) {
  const res = await app.request(trpcPath('auth.signup'), postJson({ input: SIGNUP_BODY }));
  const { user, token } = await unwrapTrpcData({ res, schema: authResponseSchema });
  return { res, user, token, cookie: res.headers.get('set-cookie') };
}

describe('health', () => {
  it('상태를 반환한다', async () => {
    const { app } = setup();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

describe('auth.signup', () => {
  it('유저를 생성하고 세션 쿠키와 토큰을 함께 내려준다', async () => {
    const { app, config } = setup();
    const { res, user, token, cookie } = await signup(app);

    expect(res.status).toBe(200);
    expect(user).toMatchObject({ email: 'test@tooday.app', name: '테스터' });
    expect(token).toHaveLength(64);
    expect(cookie).toBe(serializeSessionCookie({ config, token }));
    expect(res.headers.get('cache-control')).toBe(PRIVATE_CACHE_CONTROL);
  });

  it('중복 이메일이면 409를 반환한다', async () => {
    const { app } = setup();
    await signup(app);
    const res = await app.request(trpcPath('auth.signup'), postJson({ input: SIGNUP_BODY }));
    expect(res.status).toBe(409);
  });

  it('짧은 비밀번호는 400을 반환한다', async () => {
    const { app } = setup();
    const res = await app.request(trpcPath('auth.signup'), postJson({ input: { ...SIGNUP_BODY, password: 'short' } }));
    expect(res.status).toBe(400);
  });
});

describe('auth.login', () => {
  it('올바른 자격증명이면 쿠키와 토큰을 내려준다', async () => {
    const { app, config } = setup();
    await signup(app);

    const res = await app.request(
      trpcPath('auth.login'),
      postJson({ input: { email: SIGNUP_BODY.email, password: SIGNUP_BODY.password } }),
    );
    expect(res.status).toBe(200);
    const { token } = await unwrapTrpcData({ res, schema: authResponseSchema });
    expect(res.headers.get('set-cookie')).toBe(serializeSessionCookie({ config, token }));
  });

  it('비밀번호가 틀리면 401을 반환한다', async () => {
    const { app } = setup();
    await signup(app);

    const res = await app.request(
      trpcPath('auth.login'),
      postJson({ input: { email: SIGNUP_BODY.email, password: 'wrong-password' } }),
    );
    expect(res.status).toBe(401);
  });
});

describe('user.me — 인증 (쿠키 + 헤더 이중 지원)', () => {
  it('쿠키 방식으로 접근할 수 있다', async () => {
    const { app, config } = setup();
    const { token } = await signup(app);

    const res = await app.request(trpcPath('user.me'), {
      headers: { Cookie: sessionCookieHeader({ config, token }) },
    });
    expect(res.status).toBe(200);
    const { user } = await unwrapTrpcData({ res, schema: meResponseSchema });
    expect(user.email).toBe('test@tooday.app');
  });

  it('Authorization Bearer 헤더 방식으로 접근할 수 있다', async () => {
    const { app } = setup();
    const { token } = await signup(app);

    const res = await app.request(trpcPath('user.me'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const { user } = await unwrapTrpcData({ res, schema: meResponseSchema });
    expect(user.email).toBe('test@tooday.app');
  });

  it('헤더가 쿠키보다 우선한다', async () => {
    const { app, config } = setup();
    const { token } = await signup(app);

    const res = await app.request(trpcPath('user.me'), {
      headers: {
        Authorization: 'Bearer invalid-token',
        Cookie: sessionCookieHeader({ config, token }),
      },
    });
    expect(res.status).toBe(401);
  });

  it('인증 정보가 없으면 401을 반환한다', async () => {
    const { app } = setup();
    const res = await app.request(trpcPath('user.me'));
    expect(res.status).toBe(401);
  });

  it('만료된 세션은 401을 반환한다', async () => {
    const { app } = setup({ sessionTtlMs: -1 });
    const { token } = await signup(app);

    const res = await app.request(trpcPath('user.me'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });

  it('프라이빗 응답이므로 캐시되지 않는다', async () => {
    const { app } = setup();
    const { token } = await signup(app);

    const res = await app.request(trpcPath('user.me'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.headers.get('cache-control')).toBe(PRIVATE_CACHE_CONTROL);
  });
});

describe('HTTP 캐시 정책', () => {
  it('pub.* 쿼리는 경로별 public Cache-Control을 받는다', async () => {
    const { app } = setup();
    const res = await app.request(trpcPath('pub.appConfig'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(serializePublicCacheControl(CACHE_DIRECTIVES_BY_PATH['pub.appConfig']));
    const { version } = await unwrapTrpcData({ res, schema: z.object({ version: z.string() }) });
    expect(version).toBeDefined();
  });

  it('pub 외 경로가 섞인 배치 요청은 캐시되지 않는다', async () => {
    const { app } = setup();
    const { token } = await signup(app);

    const res = await app.request(`${trpcPath('pub.appConfig,user.me')}?batch=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(PRIVATE_CACHE_CONTROL);
  });

  it('존재하지 않는 프로시저 에러 응답은 캐시되지 않는다', async () => {
    const { app } = setup();
    const res = await app.request(trpcPath('pub.doesNotExist'));
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe(PRIVATE_CACHE_CONTROL);
  });
});

describe('auth.logout', () => {
  it('세션을 무효화하고 쿠키를 삭제한다 (쿠키/헤더 어느 쪽으로도 재사용 불가)', async () => {
    const { app, config } = setup();
    const { token } = await signup(app);

    const logoutRes = await app.request(
      trpcPath('auth.logout'),
      postJson({ headers: { Cookie: sessionCookieHeader({ config, token }) } }),
    );
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers.get('set-cookie')).toBe(serializeSessionCookieRemoval(config));

    const viaCookie = await app.request(trpcPath('user.me'), {
      headers: { Cookie: sessionCookieHeader({ config, token }) },
    });
    expect(viaCookie.status).toBe(401);

    const viaHeader = await app.request(trpcPath('user.me'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(viaHeader.status).toBe(401);
  });
});
