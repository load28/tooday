import type { ApiError } from '@tooday/shared';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function errorResponse({
  c,
  status,
  code,
  message,
}: {
  c: Context;
  status: ContentfulStatusCode;
  code: string;
  message: string;
}) {
  return c.json<ApiError>({ error: { code, message } }, status);
}
