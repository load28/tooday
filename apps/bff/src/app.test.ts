import { describe, expect, it } from 'bun:test';
import { createApp } from './app';
import { InMemorySessionStore } from './auth/session-store';
import { InMemoryUserStore } from './auth/user-store';
import type { BffConfig } from './config';

function createTestApp(configOverrides: Partial<BffConfig> = {}) {
  const config: BffConfig = {
    port: 0,
    allowedOrigins: ['http://localhost:3000'],
    cookieName: 'tooday_session',
    cookieSecure: false,
    sessionTtlMs: 60_000,
    ...configOverrides,
  };
  return createApp({
    config,
    users: new InMemoryUserStore(),
    sessions: new InMemorySessionStore(config.sessionTtlMs),
  });
}

const SIGNUP_BODY = { email: 'test@tooday.app', password: 'password123', name: '테스터' };

function jsonRequest(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function signup(app: ReturnType<typeof createTestApp>) {
  const res = await app.request('/auth/signup', jsonRequest(SIGNUP_BODY));
  const body = (await res.json()) as { user: { id: string }; token: string };
  return { res, body, cookie: res.headers.get('set-cookie') };
}

describe('health', () => {
  it('상태를 반환한다', async () => {
    const app = createTestApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

describe('signup', () => {
  it('유저를 생성하고 세션 쿠키와 토큰을 함께 내려준다', async () => {
    const app = createTestApp();
    const { res, body, cookie } = await signup(app);

    expect(res.status).toBe(201);
    expect(body.user).toMatchObject({ email: 'test@tooday.app', name: '테스터' });
    expect(body.token).toHaveLength(64);
    expect(cookie).toContain(`tooday_session=${body.token}`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('중복 이메일이면 409를 반환한다', async () => {
    const app = createTestApp();
    await signup(app);
    const res = await app.request('/auth/signup', jsonRequest(SIGNUP_BODY));
    expect(res.status).toBe(409);
  });

  it('짧은 비밀번호는 400을 반환한다', async () => {
    const app = createTestApp();
    const res = await app.request('/auth/signup', jsonRequest({ ...SIGNUP_BODY, password: 'short' }));
    expect(res.status).toBe(400);
  });
});

describe('login', () => {
  it('올바른 자격증명이면 쿠키와 토큰을 내려준다', async () => {
    const app = createTestApp();
    await signup(app);

    const res = await app.request('/auth/login', jsonRequest({ email: SIGNUP_BODY.email, password: SIGNUP_BODY.password }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(res.headers.get('set-cookie')).toContain(`tooday_session=${body.token}`);
  });

  it('비밀번호가 틀리면 401을 반환한다', async () => {
    const app = createTestApp();
    await signup(app);

    const res = await app.request('/auth/login', jsonRequest({ email: SIGNUP_BODY.email, password: 'wrong-password' }));
    expect(res.status).toBe(401);
  });
});

describe('인증 (쿠키 + 헤더 이중 지원)', () => {
  it('쿠키 방식으로 /auth/me에 접근할 수 있다', async () => {
    const app = createTestApp();
    const { body } = await signup(app);

    const res = await app.request('/auth/me', {
      headers: { Cookie: `tooday_session=${body.token}` },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { user: { email: string } }).user.email).toBe('test@tooday.app');
  });

  it('Authorization Bearer 헤더 방식으로 /auth/me에 접근할 수 있다', async () => {
    const app = createTestApp();
    const { body } = await signup(app);

    const res = await app.request('/auth/me', {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { user: { email: string } }).user.email).toBe('test@tooday.app');
  });

  it('헤더가 쿠키보다 우선한다', async () => {
    const app = createTestApp();
    const { body } = await signup(app);

    const res = await app.request('/auth/me', {
      headers: {
        Authorization: 'Bearer invalid-token',
        Cookie: `tooday_session=${body.token}`,
      },
    });
    expect(res.status).toBe(401);
  });

  it('인증 정보가 없으면 401을 반환한다', async () => {
    const app = createTestApp();
    const res = await app.request('/auth/me');
    expect(res.status).toBe(401);
  });

  it('만료된 세션은 401을 반환한다', async () => {
    const app = createTestApp({ sessionTtlMs: -1 });
    const { body } = await signup(app);

    const res = await app.request('/auth/me', {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    expect(res.status).toBe(401);
  });
});

describe('logout', () => {
  it('세션을 무효화하고 쿠키를 삭제한다 (쿠키/헤더 어느 쪽으로도 재사용 불가)', async () => {
    const app = createTestApp();
    const { body } = await signup(app);

    const logoutRes = await app.request('/auth/logout', {
      method: 'POST',
      headers: { Cookie: `tooday_session=${body.token}` },
    });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers.get('set-cookie')).toContain('Max-Age=0');

    const viaCookie = await app.request('/auth/me', {
      headers: { Cookie: `tooday_session=${body.token}` },
    });
    expect(viaCookie.status).toBe(401);

    const viaHeader = await app.request('/auth/me', {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    expect(viaHeader.status).toBe(401);
  });
});
