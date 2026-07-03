import type { SessionStore, UserStore } from '@bff/auth/ports';
import type { BffConfig } from '@bff/config';
import { errorResponse } from '@bff/http';
import type { Logger } from '@bff/logging';
import { createLogger, createRequestLogger } from '@bff/logging';
import { trpcResponseMeta } from '@bff/trpc/cache';
import { createContextFactory } from '@bff/trpc/context';
import { createAppRouter } from '@bff/trpc/router';
import { trpcServer } from '@hono/trpc-server';
import { TRPC_ENDPOINT } from '@tooday/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

export interface AppDeps {
  config: BffConfig;
  users: UserStore;
  sessions: SessionStore;
  logger?: Logger;
}

export function createApp(deps: AppDeps) {
  const log = deps.logger ?? createLogger(deps.config.logFormat);
  const app = new Hono();

  if (process.env.NODE_ENV !== 'test') {
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

  return app.get('/health', (c) => c.json({ status: 'ok' }));
}

export type AppType = ReturnType<typeof createApp>;
