import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createAuthRoutes } from './auth/routes';
import type { SessionStore } from './auth/session-store';
import type { UserStore } from './auth/user-store';
import type { BffConfig } from './config';
import { errorResponse } from './http';

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

  // 쿠키 방식은 브라우저 credentials CORS가 필수. 헤더 방식(네이티브)은 CORS 영향 없음.
  app.use(
    '*',
    cors({
      origin: deps.config.allowedOrigins,
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.notFound((c) => errorResponse(c, 404, 'NOT_FOUND', '요청한 리소스를 찾을 수 없습니다.'));
  app.onError((error, c) => {
    console.error(error);
    return errorResponse(c, 500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');
  });

  return app.get('/health', (c) => c.json({ status: 'ok' })).route('/auth', createAuthRoutes(deps));
}

export type AppType = ReturnType<typeof createApp>;
