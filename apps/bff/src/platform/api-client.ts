import { DOMAIN_ERROR_CODES, DomainError, type DomainErrorCode } from '@bff/platform/errors';
import type { ApiError } from '@tooday/shared';

/**
 * 러스트 API(apps/api) 내부 호출 클라이언트 — 실제 내부 동작은 전부 그쪽이 소유하고,
 * BFF 어댑터는 이 클라이언트로 포트를 구현한다.
 *
 * 에러 규약: API는 `{error: {code, message}}` + HTTP 상태로 응답한다. 도메인 코드
 * (DOMAIN_ERROR_CODES)는 DomainError로 되살려 던지고 — tRPC 에러 매핑(trpc/init.ts)이
 * 그대로 받는다 — 그 외는 ApiRequestError로 던진다.
 */

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number>;
  body?: unknown;
}

export interface ApiClient {
  request<T>(options: ApiRequest): Promise<T>;
}

function isDomainErrorCode(code: string): code is DomainErrorCode {
  return Object.hasOwn(DOMAIN_ERROR_CODES, code);
}

export function createApiClient({ baseUrl, internalToken }: { baseUrl: string; internalToken: string | null }): ApiClient {
  return {
    async request<T>({ method, path, query, body }: ApiRequest): Promise<T> {
      const url = new URL(path, baseUrl);
      for (const [key, value] of Object.entries(query ?? {})) {
        url.searchParams.set(key, String(value));
      }
      const response = await fetch(url, {
        method,
        headers: {
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(internalToken ? { authorization: `Bearer ${internalToken}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiError | null;
        const code = payload?.error.code ?? 'INTERNAL_ERROR';
        const message = payload?.error.message ?? `API 요청이 실패했습니다 (${response.status})`;
        if (isDomainErrorCode(code)) {
          throw new DomainError(code, message);
        }
        throw new ApiRequestError(response.status, code, message);
      }
      return (await response.json()) as T;
    },
  };
}
