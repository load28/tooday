import { QueryClient } from '@tanstack/react-query';
import type { AppRouter } from '@tooday/bff';
import type { User } from '@tooday/shared';
import { createTRPCClient, httpLink } from '@trpc/client';
import { createTRPCOptionsProxy, type TRPCOptionsProxy } from '@trpc/tanstack-react-query';

const BFF_URL = import.meta.env.VITE_BFF_URL ?? 'http://localhost:3002';

export type Trpc = TRPCOptionsProxy<AppRouter>;

export interface RouterAppContext {
  queryClient: QueryClient;
  trpc: Trpc;
}

export function createTrpc(): RouterAppContext {
  const queryClient = new QueryClient({
    defaultOptions: {
      // stale 관리 안 함: 항상 서버에서 최신을 가져오고(staleTime 0), 사용이 끝나면 즉시 버린다(gcTime 0)
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
  });

  const trpcClient = createTRPCClient<AppRouter>({
    links: [
      // 노배치(httpLink): 쿼리가 GET 단일 경로 URL로 나가야 BFF의 HTTP 캐시 정책이 동작한다
      httpLink({
        url: `${BFF_URL}/trpc`,
        fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
        headers: async () => {
          if (typeof document !== 'undefined') return {};
          // SSR: 브라우저가 보낸 세션 쿠키를 BFF로 전달
          const { getRequestHeader } = await import('@tanstack/react-start/server');
          const cookie = getRequestHeader('Cookie');
          return cookie ? { cookie } : {};
        },
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
