import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { SessionStore, UserStore } from './auth/ports';
import type { BffConfig } from './config';
import { errorResponse } from './http';
import { trpcResponseMeta } from './trpc/cache';
import { createContextFactory } from './trpc/context';
import { createAppRouter } from './trpc/router';

export const TRPC_ENDPOINT = '/trpc';

export interface AppDeps {
  config: BffConfig;
  users: UserStore;
  sessions: SessionStore;
}

export function createApp(deps: AppDeps) {
  const app = new Hono();

  if (process.env.NODE_ENV !== 'test') {
    app.use('*', logger());
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
    console.error(error);
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
