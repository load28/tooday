import { QueryClient } from '@tanstack/react-query';
import { createIsomorphicFn } from '@tanstack/react-start';
import type { AppRouter } from '@tooday/bff';
import type { User } from '@tooday/shared';
import { TRPC_ENDPOINT } from '@tooday/shared';
import { createTRPCClient, httpLink } from '@trpc/client';
import { createTRPCOptionsProxy, type TRPCOptionsProxy } from '@trpc/tanstack-react-query';

export const BFF_URL = import.meta.env.VITE_BFF_URL ?? 'http://localhost:3002';

// SSR에서만 브라우저가 보낸 세션 쿠키를 BFF로 전달한다.
// 서버 전용 모듈은 server 브랜치에서만 로드 — 클라이언트 번들에서는 컴파일 시 제거된다.
const resolveSsrCookieHeaders = createIsomorphicFn()
  .client((): Record<string, string> => ({}))
  .server(async (): Promise<Record<string, string>> => {
    const { getRequestHeader } = await import('@tanstack/react-start/server');
    const cookie = getRequestHeader('Cookie');
    return cookie ? { cookie } : {};
  });

// 프로시저 이름을 라우터 타입에서 파생 — BFF에서 리네임되면 컴파일 에러가 난다.
type AuthProcedure = keyof AppRouter['auth'];

const authProcedureUrl = (procedure: AuthProcedure): string => `${BFF_URL}${TRPC_ENDPOINT}/auth.${procedure}`;

const REFRESH_URL = authProcedureUrl('refresh');

/** 401을 refresh로 자동 복구하지 않을 프로시저 — refresh 자체(재귀 방지) + 로그인/회원가입(401이 정상 응답) */
const NON_REFRESHABLE = ['refresh', 'login', 'signup'] satisfies AuthProcedure[];

function isAuthEndpoint(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return NON_REFRESHABLE.some((procedure) => url.includes(`auth.${procedure}`));
}

// 액세스 만료로 여러 요청이 동시에 401을 맞아도 refresh는 한 번만 나가게 하는 single-flight.
let inflightRefresh: Promise<boolean> | null = null;
function refreshSession(): Promise<boolean> {
  inflightRefresh ??= fetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}), // 웹은 리프레시 쿠키로 인증 — body는 비운다
    credentials: 'include',
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      inflightRefresh = null;
    });
  return inflightRefresh;
}

/**
 * 액세스 토큰(짧은 JWT)이 만료되면 요청이 401로 돌아온다. 클라이언트에서만,
 * refresh(회전)를 한 번 시도해 새 액세스 쿠키를 받은 뒤 원요청을 재시도한다.
 * SSR은 쿠키를 브라우저로 되돌릴 수 없어 여기서 refresh하지 않고, beforeLoad가
 * 401을 로그인 리다이렉트로 처리한다.
 */
async function fetchWithRefresh(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, { ...init, credentials: 'include' });
  if (res.status !== 401 || typeof window === 'undefined' || isAuthEndpoint(input)) {
    return res;
  }
  const refreshed = await refreshSession();
  if (!refreshed) return res;
  return fetch(input, { ...init, credentials: 'include' });
}

export type Trpc = TRPCOptionsProxy<AppRouter>;

export interface RouterAppContext {
  queryClient: QueryClient;
  trpc: Trpc;
}

export function createTrpc(): RouterAppContext {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
  });

  const trpcClient = createTRPCClient<AppRouter>({
    links: [
      // 노배치(httpLink): 쿼리가 GET 단일 경로 URL로 나가야 BFF의 HTTP 캐시 정책이 동작한다
      httpLink({
        url: `${BFF_URL}${TRPC_ENDPOINT}`,
        fetch: fetchWithRefresh,
        headers: () => resolveSsrCookieHeaders(),
      }),
    ],
  });

  const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient });
  return { queryClient, trpc };
}

export async function fetchSessionUser({ queryClient, trpc }: RouterAppContext): Promise<User | null> {
  try {
    const { user } = await queryClient.ensureQueryData(trpc.user.me.queryOptions());
    return user;
  } catch {
    return null;
  }
}
