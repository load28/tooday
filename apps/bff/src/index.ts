import { createApp } from '@bff/app';
import { HttpAuthGateway } from '@bff/modules/auth/adapters/http';
import { HttpProjectStore, HttpTaskStore } from '@bff/modules/task/adapters/http';
import { HttpUserReader } from '@bff/modules/user/adapters/http';
import { createApiClient } from '@bff/platform/api-client';
import { loadConfig } from '@bff/platform/config';
import { createLogger } from '@bff/platform/logging';
import { InMemorySyncBroker } from '@bff/platform/sync-broker';

const config = loadConfig();
const logger = createLogger(config.logFormat);

// 실제 내부 동작(인증·데이터·동기화 seq)은 전부 러스트 API(apps/api)가 소유한다 —
// BFF는 HTTP 어댑터로 포트를 채워 tRPC 계약·쿠키·캐시·SSE만 조립한다.
const api = createApiClient({ baseUrl: config.apiUrl, internalToken: config.apiInternalToken });
logger.info('api_client_ready', { apiUrl: config.apiUrl });

const app = createApp({
  config,
  auth: new HttpAuthGateway(api),
  userReader: new HttpUserReader(api),
  tasks: new HttpTaskStore(api),
  projects: new HttpProjectStore(api),
  sync: new InMemorySyncBroker(),
  logger,
});

export type { AppType } from '@bff/app';
export type { AppRouter } from '@bff/trpc/router';

export default {
  port: config.port,
  fetch: app.fetch,
};
