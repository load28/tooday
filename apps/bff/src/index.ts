import { createApp } from './app';
import { InMemorySessionStore, InMemoryUserStore } from './auth/adapters/memory';
import { loadConfig } from './config';

const config = loadConfig();

const app = createApp({
  config,
  users: new InMemoryUserStore(),
  sessions: new InMemorySessionStore(config.sessionTtlMs),
});

export type { AppType } from './app';
export type { AppRouter } from './trpc/router';

export default {
  port: config.port,
  fetch: app.fetch,
};
