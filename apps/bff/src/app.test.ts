import { describe, expect, it } from 'bun:test';
import { createApp } from '@bff/app';
import { createAccessTokenService } from '@bff/modules/auth/access-token';
import { InMemoryAuthGateway, InMemoryRefreshTokenStore, InMemoryUserStore } from '@bff/modules/auth/adapters/memory';
import { serializeAccessCookie, serializeAuthCookieRemovals, serializeRefreshCookie } from '@bff/modules/auth/cookies';
import { InMemoryProjectStore, InMemorySyncCounter, InMemoryTaskStore } from '@bff/modules/task/adapters/memory';
import type { BffConfig } from '@bff/platform/config';
import { InMemorySyncBroker } from '@bff/platform/sync-broker';
import { CACHE_DIRECTIVES_BY_PATH, PRIVATE_CACHE_CONTROL, serializePublicCacheControl } from '@bff/trpc/cache';
import {
  authResponseSchema,
  meResponseSchema,
  projectSchema,
  SYNC_EVENTS_PATH,
  syncChangesResponseSchema,
  TRPC_ENDPOINT,
  taskRangeResponseSchema,
  taskSchema,
  tokenPairSchema,
} from '@tooday/shared';
import * as v from 'valibot';

function setup(overrides: Partial<BffConfig> = {}) {
  const config: BffConfig = {
    port: 0,
    allowedOrigins: ['http://localhost:3000'],
    accessCookieName: 'tooday_access',
    refreshCookieName: 'tooday_refresh',
    cookieSecure: false,
    accessTtlMs: 60_000,
    refreshAbsoluteTtlMs: 120_000,
    apiUrl: 'http://localhost:0', // 인메모리 게이트웨이를 쓰므로 실제로 호출되지 않는다
    apiInternalToken: null,
    logFormat: 'pretty',
    logRequests: false,
    ...overrides,
  };
  const users = new InMemoryUserStore();
  const counter = new InMemorySyncCounter();
  const sync = new InMemorySyncBroker();
  // 러스트 API의 인증 흐름을 인메모리로 흉내 낸 게이트웨이 — 조립(쿠키·캐시·매핑)만 검증한다
  const auth = new InMemoryAuthGateway({
    users,
    refreshTokens: new InMemoryRefreshTokenStore({
      idleTtlMs: 60_000,
      absoluteTtlMs: config.refreshAbsoluteTtlMs,
    }),
    accessTokens: createAccessTokenService({ secret: 'test-secret', ttlMs: config.accessTtlMs }),
  });
  const app = createApp({
    config,
    auth,
    // InMemoryUserStore가 findById로 UserReader를 구조적으로 충족한다 — 같은 가짜 users 테이블
    userReader: users,
    tasks: new InMemoryTaskStore(counter),
    projects: new InMemoryProjectStore(counter),
    sync,
  });
  return { app, config, sync };
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

function accessCookieHeader({ config, token }: { config: BffConfig; token: string }): string {
  return `${config.accessCookieName}=${token}`;
}

function refreshCookieHeader({ config, token }: { config: BffConfig; token: string }): string {
  return `${config.refreshCookieName}=${token}`;
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
  const { user, accessToken, refreshToken } = await unwrapTrpcData({ res, schema: authResponseSchema });
  // token = 액세스 JWT(Bearer 인증용). refreshToken = 회전용 불투명 토큰.
  return { res, user, token: accessToken, refreshToken, setCookies: res.headers.getSetCookie() };
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
  it('유저를 생성하고 액세스·리프레시 쿠키와 토큰 쌍을 함께 내려준다', async () => {
    const { app, config } = setup();
    const { res, user, token, refreshToken, setCookies } = await signup(app);

    expect(res.status).toBe(200);
    expect(user).toMatchObject({ email: 'test@tooday.app', name: '테스터' });
    expect(token.split('.')).toHaveLength(3); // 액세스는 JWT
    expect(refreshToken).toHaveLength(64); // 리프레시는 불투명 토큰
    expect(setCookies).toContain(serializeAccessCookie({ config, token }));
    expect(setCookies).toContain(serializeRefreshCookie({ config, token: refreshToken }));
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
  it('올바른 자격증명이면 쿠키와 토큰 쌍을 내려준다', async () => {
    const { app, config } = setup();
    await signup(app);

    const res = await app.request(
      trpcPath('auth.login'),
      postJson({ input: { email: SIGNUP_BODY.email, password: SIGNUP_BODY.password } }),
    );
    expect(res.status).toBe(200);
    const { accessToken, refreshToken } = await unwrapTrpcData({ res, schema: authResponseSchema });
    const setCookies = res.headers.getSetCookie();
    expect(setCookies).toContain(serializeAccessCookie({ config, token: accessToken }));
    expect(setCookies).toContain(serializeRefreshCookie({ config, token: refreshToken }));
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
      headers: { Cookie: accessCookieHeader({ config, token }) },
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
        Cookie: accessCookieHeader({ config, token }),
      },
    });
    expect(res.status).toBe(401);
  });

  it('인증 정보가 없으면 401을 반환한다', async () => {
    const { app } = setup();
    const res = await app.request(trpcPath('user.me'));
    expect(res.status).toBe(401);
  });

  it('만료된 액세스 토큰은 401을 반환한다', async () => {
    const { app } = setup({ accessTtlMs: -60_000 });
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
    const data = await unwrapTrpcData({ res, schema: authResponseSchema });
    return { ...data, token: data.accessToken };
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
    expect(data).toEqual({ tasks: [], projects: [], cursor: 0 });
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

  async function updateTask(app: TestApp, token: string, input: Record<string, unknown>) {
    return app.request(trpcPath('task.update'), postJson({ input, headers: authHeader(token) }));
  }

  it('update가 patch의 필드만 적용한다 — 다른 필드의 의도끼리는 충돌하지 않는다 (필드 단위 LWW)', async () => {
    const { app } = setup();
    const { token } = await signup(app);

    const createRes = await createTask(app, token, TASK_INPUT);
    const { task } = await unwrapTrpcData({ res: createRes, schema: v.object({ task: taskSchema }) });
    expect(task.version).toBe(1);

    // 기기 A: 상태만 / 기기 B: 제목만 — 서로 덮지 않고 둘 다 반영된다
    const statusRes = await updateTask(app, token, { id: task.id, patch: { status: 'done' } });
    const { task: afterStatus } = await unwrapTrpcData({ res: statusRes, schema: v.object({ task: taskSchema }) });
    expect(afterStatus).toEqual({ ...task, status: 'done', version: 2 });

    const titleRes = await updateTask(app, token, { id: task.id, patch: { title: '디자인 토큰 정리 v2' } });
    const { task: afterTitle } = await unwrapTrpcData({ res: titleRes, schema: v.object({ task: taskSchema }) });
    expect(afterTitle).toEqual({ ...task, status: 'done', title: '디자인 토큰 정리 v2', version: 3 });

    const { data } = await fetchRange(app, token);
    expect(data.tasks).toEqual([afterTitle]);
  });

  it('같은 필드의 경합은 나중 의도가 이긴다 — 409 없음', async () => {
    const { app } = setup();
    const { token } = await signup(app);
    const createRes = await createTask(app, token, TASK_INPUT);
    const { task } = await unwrapTrpcData({ res: createRes, schema: v.object({ task: taskSchema }) });

    const first = await updateTask(app, token, { id: task.id, patch: { status: 'done' } });
    expect(first.status).toBe(200);
    const second = await updateTask(app, token, { id: task.id, patch: { status: 'todo' } });
    expect(second.status).toBe(200);

    const { data } = await fetchRange(app, token);
    expect(data.tasks[0]?.status).toBe('todo');
  });

  it('빈 patch는 400을 반환한다', async () => {
    const { app } = setup();
    const { token } = await signup(app);
    const createRes = await createTask(app, token, TASK_INPUT);
    const { task } = await unwrapTrpcData({ res: createRes, schema: v.object({ task: taskSchema }) });

    const res = await updateTask(app, token, { id: task.id, patch: {} });
    expect(res.status).toBe(400);
  });

  it('다른 유저의 데이터는 보이지 않고, 수정은 404를 반환한다', async () => {
    const { app } = setup();
    const { token } = await signup(app);
    const createRes = await createTask(app, token, TASK_INPUT);
    const { task } = await unwrapTrpcData({ res: createRes, schema: v.object({ task: taskSchema }) });

    const other = await signupOther(app);
    const { data } = await fetchRange(app, other.token);
    expect(data).toEqual({ tasks: [], projects: [], cursor: 0 });

    const res = await updateTask(app, other.token, { id: task.id, patch: { status: 'done' } });
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

  describe('델타 동기화', () => {
    async function fetchChanges(app: TestApp, token: string, cursor: number) {
      const res = await app.request(`${trpcPath('task.changes')}?input=${encodeURIComponent(JSON.stringify({ cursor }))}`, {
        headers: authHeader(token),
      });
      return unwrapTrpcData({ res, schema: syncChangesResponseSchema });
    }

    it('쓰기마다 커서가 전진하고, 커서 이후의 변경만 내려온다', async () => {
      const { app } = setup();
      const { token } = await signup(app);

      const project = await createProject(app, token); // seq 1
      const createRes = await createTask(app, token, { ...TASK_INPUT, projectId: project.id }); // seq 2
      const { task } = await unwrapTrpcData({ res: createRes, schema: v.object({ task: taskSchema }) });

      const { data: range } = await fetchRange(app, token);
      expect(range.cursor).toBe(2);

      // 커서 시점 이후 변경이 없으면 빈 델타
      const empty = await fetchChanges(app, token, range.cursor);
      expect(empty).toEqual({ tasks: [], projects: [], cursor: range.cursor });

      // 다른 기기의 수정 → 그 변경 하나만 내려온다
      await updateTask(app, token, { id: task.id, patch: { status: 'done' } }); // seq 3
      const delta = await fetchChanges(app, token, range.cursor);
      expect(delta.cursor).toBe(3);
      expect(delta.projects).toEqual([]);
      expect(delta.tasks).toEqual([{ ...task, status: 'done', version: 2, syncSeq: 3, deleted: false }]);

      // 처음(커서 0)부터 당기면 전부 내려온다 — 새 기기 시나리오
      const full = await fetchChanges(app, token, 0);
      expect(full.tasks).toHaveLength(1);
      expect(full.projects).toEqual([{ ...project, syncSeq: 1, deleted: false }]);
    });

    it('유저별로 격리된다 — 남의 변경은 델타에 실리지 않는다', async () => {
      const { app } = setup();
      const { token } = await signup(app);
      await createTask(app, token, TASK_INPUT);

      const other = await signupOther(app);
      const delta = await fetchChanges(app, other.token, 0);
      expect(delta).toEqual({ tasks: [], projects: [], cursor: 0 });
    });

    it('SSE 신호 채널 — 인증 필수, 쓰기가 일어나면 구독자에게 신호가 간다', async () => {
      const { app, sync } = setup();
      const unauthorized = await app.request(SYNC_EVENTS_PATH);
      expect(unauthorized.status).toBe(401);

      const { token, user } = await signup(app);
      const res = await app.request(SYNC_EVENTS_PATH, { headers: authHeader(token) });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      await res.body?.cancel();

      let signals = 0;
      const unsubscribe = sync.subscribe(user.id, () => {
        signals += 1;
      });
      await createTask(app, token, TASK_INPUT);
      expect(signals).toBe(1);
      unsubscribe();
    });
  });
});

describe('auth.refresh', () => {
  it('리프레시 쿠키를 회전한다 — 새 토큰 쌍을 주고, 옛 리프레시는 무효화된다', async () => {
    const { app, config } = setup();
    const { refreshToken } = await signup(app);

    const res = await app.request(
      trpcPath('auth.refresh'),
      postJson({ input: {}, headers: { Cookie: refreshCookieHeader({ config, token: refreshToken }) } }),
    );
    expect(res.status).toBe(200);
    const { accessToken, refreshToken: rotated } = await unwrapTrpcData({ res, schema: tokenPairSchema });
    expect(rotated).not.toBe(refreshToken); // 리프레시는 회전됨
    // (액세스 JWT는 같은 초에 서명되면 byte-identical일 수 있으므로 값 비교하지 않는다)

    // 새 액세스로 인증된다
    const me = await app.request(trpcPath('user.me'), { headers: { Authorization: `Bearer ${accessToken}` } });
    expect(me.status).toBe(200);

    // 옛 리프레시 재사용 = 탈취 신호 → 401 + 계보 전체 무효화(재사용 탐지)
    const reused = await app.request(
      trpcPath('auth.refresh'),
      postJson({ input: {}, headers: { Cookie: refreshCookieHeader({ config, token: refreshToken }) } }),
    );
    expect(reused.status).toBe(401);

    // 재사용 탐지로 방금 회전된 새 리프레시(rotated)까지 함께 죽는다
    const afterReuse = await app.request(
      trpcPath('auth.refresh'),
      postJson({ input: {}, headers: { Cookie: refreshCookieHeader({ config, token: rotated }) } }),
    );
    expect(afterReuse.status).toBe(401);
  });

  it('리프레시 토큰이 없으면 401을 반환한다', async () => {
    const { app } = setup();
    const res = await app.request(trpcPath('auth.refresh'), postJson({ input: {} }));
    expect(res.status).toBe(401);
  });

  it('body의 refreshToken도 받는다 (네이티브 브릿지)', async () => {
    const { app } = setup();
    const { refreshToken } = await signup(app);

    const res = await app.request(trpcPath('auth.refresh'), postJson({ input: { refreshToken } }));
    expect(res.status).toBe(200);
  });
});

describe('auth.logout', () => {
  it('리프레시를 폐기하고 쿠키를 삭제한다 — 회전 경로가 막힌다', async () => {
    const { app, config } = setup();
    const { token, refreshToken } = await signup(app);

    const logoutRes = await app.request(
      trpcPath('auth.logout'),
      postJson({
        headers: {
          Cookie: [accessCookieHeader({ config, token }), refreshCookieHeader({ config, token: refreshToken })].join('; '),
        },
      }),
    );
    expect(logoutRes.status).toBe(200);
    const removals = serializeAuthCookieRemovals(config);
    for (const removal of removals) {
      expect(logoutRes.headers.getSetCookie()).toContain(removal);
    }

    // 세션이 폐기되어 재발급(회전) 경로가 막힌다.
    const refreshRes = await app.request(
      trpcPath('auth.refresh'),
      postJson({ input: {}, headers: { Cookie: refreshCookieHeader({ config, token: refreshToken }) } }),
    );
    expect(refreshRes.status).toBe(401);

    // 즉시 무효화: 아직 만료 안 된 액세스 토큰도 세션 라이브니스 체크에서 곧바로 거부된다.
    const meRes = await app.request(trpcPath('user.me'), { headers: { Authorization: `Bearer ${token}` } });
    expect(meRes.status).toBe(401);
  });

  it('재사용 탐지가 세션을 죽이면 그 세션의 액세스도 즉시 무효화된다', async () => {
    const { app, config } = setup();
    const { refreshToken } = await signup(app);

    // 1) 정상 회전 → 새 액세스/리프레시
    const rotate1 = await app.request(
      trpcPath('auth.refresh'),
      postJson({ input: {}, headers: { Cookie: refreshCookieHeader({ config, token: refreshToken }) } }),
    );
    const { accessToken } = await unwrapTrpcData({ res: rotate1, schema: tokenPairSchema });
    const meOk = await app.request(trpcPath('user.me'), { headers: { Authorization: `Bearer ${accessToken}` } });
    expect(meOk.status).toBe(200);

    // 2) 옛 리프레시 재사용 = 탈취 신호 → 세션 전체 무효화
    await app.request(
      trpcPath('auth.refresh'),
      postJson({ input: {}, headers: { Cookie: refreshCookieHeader({ config, token: refreshToken }) } }),
    );

    // 3) 방금까지 멀쩡하던 액세스도 세션 라이브니스 체크로 즉시 401
    const meRes = await app.request(trpcPath('user.me'), { headers: { Authorization: `Bearer ${accessToken}` } });
    expect(meRes.status).toBe(401);
  });
});
