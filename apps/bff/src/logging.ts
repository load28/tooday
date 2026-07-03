import { createMiddleware } from 'hono/factory';

export type LogFormat = 'json' | 'pretty';
export type LogLevel = 'info' | 'warn' | 'error';

export interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export function createLogger(format: LogFormat): Logger {
  const write = (level: LogLevel, message: string, fields: Record<string, unknown> = {}) => {
    const emit = level === 'error' ? console.error : console.log;
    if (format === 'json') {
      emit(JSON.stringify({ level, time: new Date().toISOString(), message, ...fields }));
      return;
    }
    const rendered = Object.entries(fields)
      .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join(' ');
    emit(`[${level}] ${message}${rendered ? ` ${rendered}` : ''}`);
  };

  return {
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
  };
}

export const REQUEST_ID_HEADER = 'X-Request-Id';

/** 요청마다 request id를 부여(전파)하고 완료 시 구조화 로그를 남긴다 */
export function createRequestLogger(log: Logger) {
  return createMiddleware(async (c, next) => {
    const requestId = c.req.header(REQUEST_ID_HEADER) ?? crypto.randomUUID();
    const startedAt = performance.now();
    await next();
    c.res.headers.set(REQUEST_ID_HEADER, requestId);
    log.info('request', {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    });
  });
}
