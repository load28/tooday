import type { AccessTokenService } from '@bff/modules/auth/access-token';
import { requireAuth } from '@bff/modules/auth/middleware';
import type { RefreshTokenStore, UserStore } from '@bff/modules/auth/ports';
import type { ProjectStore, TaskStore } from '@bff/modules/task/ports';
import type { UserReader } from '@bff/modules/user/ports';
import type { BffConfig } from '@bff/platform/config';
import { errorResponse } from '@bff/platform/http';
import type { Logger } from '@bff/platform/logging';
import { createLogger, createRequestLogger } from '@bff/platform/logging';
import type { SyncBroker } from '@bff/platform/sync-broker';
import { trpcResponseMeta } from '@bff/trpc/cache';
import { createContextFactory } from '@bff/trpc/context';
import { createAppRouter } from '@bff/trpc/router';
import { trpcServer } from '@hono/trpc-server';
import { SYNC_EVENTS_PATH, TRPC_ENDPOINT } from '@tooday/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';

export interface AppDeps {
  config: BffConfig;
  users: UserStore;
  userReader: UserReader;
  refreshTokens: RefreshTokenStore;
  accessTokens: AccessTokenService;
  tasks: TaskStore;
  projects: ProjectStore;
  sync: SyncBroker;
  logger?: Logger;
}

export function createApp(deps: AppDeps) {
  const log = deps.logger ?? createLogger(deps.config.logFormat);
  const app = new Hono();

  if (deps.config.logRequests) {
    app.use('*', createRequestLogger(log));
  }

  // 쿠키 인증에는 credentials CORS가 필수
  app.use(
    '*',
    cors({
      origin: deps.config.allowedOrigins,
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.notFound((c) => errorResponse({ c, status: 404, code: 'NOT_FOUND', message: '요청한 리소스를 찾을 수 없습니다.' }));
  app.onError((error, c) => {
    log.error('unhandled_error', {
      path: c.req.path,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return errorResponse({ c, status: 500, code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' });
  });

  app.use(
    `${TRPC_ENDPOINT}/*`,
    trpcServer({
      endpoint: TRPC_ENDPOINT,
      router: createAppRouter(deps),
      createContext: createContextFactory(deps),
      responseMeta: trpcResponseMeta,
    }),
  );

  // 동기화 신호 채널 — "네 데이터 바뀜"만 흘린다. 클라이언트는 신호를 받으면
  // 자기 커서로 task.changes를 당긴다 (신호 유실·중복은 커서가 흡수).
  app.get(
    SYNC_EVENTS_PATH,
    requireAuth({
      accessTokens: deps.accessTokens,
      refreshTokens: deps.refreshTokens,
      cookieName: deps.config.accessCookieName,
    }),
    (c) => {
      const userId = c.get('auth').userId;
      return streamSSE(c, async (stream) => {
        const unsubscribe = deps.sync.subscribe(userId, () => {
          void stream.writeSSE({ event: 'change', data: '' });
        });
        stream.onAbort(() => unsubscribe());
        // 접속(재접속) 직후 한 번 신호 — 끊겨 있던 사이 놓친 변경을 커서로 따라잡게 한다
        await stream.writeSSE({ event: 'change', data: '' });
        while (!stream.aborted) {
          await stream.sleep(25_000);
          await stream.writeSSE({ event: 'ping', data: '' }); // 프록시 idle timeout 방지
        }
      });
    },
  );

  return app.get('/health', (c) => c.json({ status: 'ok' }));
}

export type AppType = ReturnType<typeof createApp>;
