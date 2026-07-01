import { createApp } from './app';
import { InMemorySessionStore } from './auth/session-store';
import { InMemoryUserStore } from './auth/user-store';
import { loadConfig } from './config';

const config = loadConfig();

const app = createApp({
  config,
  users: new InMemoryUserStore(),
  sessions: new InMemorySessionStore(config.sessionTtlMs),
});

export type { AppType } from './app';

export default {
  port: config.port,
  fetch: app.fetch,
};
