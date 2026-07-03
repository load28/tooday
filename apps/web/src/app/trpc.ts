import { QueryClient } from '@tanstack/react-query';
import { createIsomorphicFn } from '@tanstack/react-start';
import type { AppRouter } from '@tooday/bff';
import type { User } from '@tooday/shared';
import { TRPC_ENDPOINT } from '@tooday/shared';
import { createTRPCClient, httpLink } from '@trpc/client';
import { createTRPCOptionsProxy, type TRPCOptionsProxy } from '@trpc/tanstack-react-query';

const BFF_URL = import.meta.env.VITE_BFF_URL ?? 'http://localhost:3002';

// SSR에서만 브라우저가 보낸 세션 쿠키를 BFF로 전달한다.
// 서버 전용 모듈은 server 브랜치에서만 로드 — 클라이언트 번들에서는 컴파일 시 제거된다.
const resolveSsrCookieHeaders = createIsomorphicFn()
  .client((): Record<string, string> => ({}))
  .server(async (): Promise<Record<string, string>> => {
    const { getRequestHeader } = await import('@tanstack/react-start/server');
    const cookie = getRequestHeader('Cookie');
    return cookie ? { cookie } : {};
  });

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
        fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
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
