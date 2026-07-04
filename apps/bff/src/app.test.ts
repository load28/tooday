import { describe, expect, it } from 'bun:test';
import { createApp } from '@bff/app';
import { InMemorySessionStore, InMemoryUserStore } from '@bff/modules/auth/adapters/memory';
import { serializeSessionCookie, serializeSessionCookieRemoval } from '@bff/modules/auth/session-cookie';
import { InMemoryProjectStore, InMemoryTaskStore } from '@bff/modules/task/adapters/memory';
import type { BffConfig } from '@bff/platform/config';
import { CACHE_DIRECTIVES_BY_PATH, PRIVATE_CACHE_CONTROL, serializePublicCacheControl } from '@bff/trpc/cache';
import {
  authResponseSchema,
  meResponseSchema,
  projectSchema,
  TRPC_ENDPOINT,
  taskRangeResponseSchema,
  taskSchema,
} from '@tooday/shared';
import * as v from 'valibot';

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
    tasks: new InMemoryTaskStore(),
    projects: new InMemoryProjectStore(),
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

const trpcSuccessEnvelopeSchema = v.object({ result: v.object({ data: v.unknown() }) });

async function unwrapTrpcData<TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>({
  res,
  schema,
}: {
  res: Response;
  schema: TSchema;
}): Promise<v.InferOutput<TSchema>> {
  const envelope = v.parse(trpcSuccessEnvelopeSchema, await res.json());
  return v.parse(schema, envelope.result.data);
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
    const { version } = await unwrapTrpcData({ res, schema: v.object({ version: v.string() }) });
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

describe('task — 메인(오늘) 화면 데이터', () => {
  const RANGE = { from: '2026-07-02', to: '2026-07-08' };
  const TASK_INPUT = { title: '디자인 토큰 정리', projectId: null, date: '2026-07-04', startAt: '10:00', durationMin: 90 };

  function authHeader(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }

  function rangePath(input: { from: string; to: string } = RANGE): string {
    return `${trpcPath('task.range')}?input=${encodeURIComponent(JSON.stringify(input))}`;
  }

  async function fetchRange(app: TestApp, token: string) {
    const res = await app.request(rangePath(), { headers: authHeader(token) });
    return { res, data: await unwrapTrpcData({ res, schema: taskRangeResponseSchema }) };
  }

  async function createProject(app: TestApp, token: string) {
    const res = await app.request(
      trpcPath('task.createProject'),
      postJson({ input: { name: 'TooDay 앱', color: 'blue' }, headers: authHeader(token) }),
    );
    const { project } = await unwrapTrpcData({ res, schema: v.object({ project: projectSchema }) });
    return project;
  }

  async function createTask(app: TestApp, token: string, input: Record<string, unknown>) {
    const res = await app.request(trpcPath('task.create'), postJson({ input, headers: authHeader(token) }));
    return res;
  }

  async function signupOther(app: TestApp) {
    const res = await app.request(
      trpcPath('auth.signup'),
      postJson({ input: { email: 'other@tooday.app', password: 'password123', name: '아더' } }),
    );
    return unwrapTrpcData({ res, schema: authResponseSchema });
  }

  it('인증 없이는 401을 반환한다', async () => {
    const { app } = setup();
    const res = await app.request(rangePath());
    expect(res.status).toBe(401);
  });

  it('새 유저의 범위 조회는 빈 목록이다 (프라이빗, no-store)', async () => {
    const { app } = setup();
    const { token } = await signup(app);

    const { res, data } = await fetchRange(app, token);
    expect(res.status).toBe(200);
    expect(data).toEqual({ tasks: [], projects: [] });
    expect(res.headers.get('cache-control')).toBe(PRIVATE_CACHE_CONTROL);
  });

  it('프로젝트·태스크를 만들면 범위 조회에 함께 내려온다 — 범위 밖은 제외, 날짜·시작시각 정렬', async () => {
    const { app } = setup();
    const { token } = await signup(app);
    const project = await createProject(app, token);

    await createTask(app, token, { ...TASK_INPUT, title: '오후 작업', projectId: project.id, startAt: '13:30' });
    await createTask(app, token, { ...TASK_INPUT, title: '아침 작업', projectId: project.id, startAt: '07:30' });
    await createTask(app, token, { ...TASK_INPUT, title: '전날 작업', date: '2026-07-03' });
    await createTask(app, token, { ...TASK_INPUT, title: '범위 밖 작업', date: '2026-07-20' });

    const { data } = await fetchRange(app, token);
    expect(data.projects).toEqual([project]);
    expect(data.tasks.map((task) => task.title)).toEqual(['전날 작업', '아침 작업', '오후 작업']);
    expect(data.tasks.every((task) => task.status === 'todo')).toBe(true);
  });

  it('setStatus가 상태를 바꾸고 조회에 반영된다', async () => {
    const { app } = setup();
    const { token } = await signup(app);

    const createRes = await createTask(app, token, TASK_INPUT);
    const { task } = await unwrapTrpcData({ res: createRes, schema: v.object({ task: taskSchema }) });

    const res = await app.request(
      trpcPath('task.setStatus'),
      postJson({ input: { id: task.id, status: 'done' }, headers: authHeader(token) }),
    );
    const { task: updated } = await unwrapTrpcData({ res, schema: v.object({ task: taskSchema }) });
    expect(updated).toEqual({ ...task, status: 'done' });

    const { data } = await fetchRange(app, token);
    expect(data.tasks).toEqual([updated]);
  });

  it('다른 유저의 데이터는 보이지 않고, 상태 변경은 404를 반환한다', async () => {
    const { app } = setup();
    const { token } = await signup(app);
    const createRes = await createTask(app, token, TASK_INPUT);
    const { task } = await unwrapTrpcData({ res: createRes, schema: v.object({ task: taskSchema }) });

    const other = await signupOther(app);
    const { data } = await fetchRange(app, other.token);
    expect(data).toEqual({ tasks: [], projects: [] });

    const res = await app.request(
      trpcPath('task.setStatus'),
      postJson({ input: { id: task.id, status: 'done' }, headers: authHeader(other.token) }),
    );
    expect(res.status).toBe(404);
  });

  it('다른 유저의 프로젝트로는 태스크를 만들 수 없다 (404)', async () => {
    const { app } = setup();
    const { token } = await signup(app);
    const project = await createProject(app, token);

    const other = await signupOther(app);
    const res = await createTask(app, other.token, { ...TASK_INPUT, projectId: project.id });
    expect(res.status).toBe(404);
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
