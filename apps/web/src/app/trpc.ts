import { QueryClient } from '@tanstack/react-query';
import { createIsomorphicFn } from '@tanstack/react-start';
import type { AppRouter } from '@tooday/bff';
import type { User } from '@tooday/shared';
import { TRPC_ENDPOINT } from '@tooday/shared';
import { createTRPCClient, httpLink } from '@trpc/client';
import { createTRPCOptionsProxy, type TRPCOptionsProxy } from '@trpc/tanstack-react-query';

const BFF_URL = import.meta.env.VITE_BFF_URL ?? 'http://localhost:3002';

/** BFF 절대 URL 조립의 단일 소유자 — base URL 배선이 이 모듈 밖으로 새지 않게 한다. */
export function bffUrl(path: string): string {
  return `${BFF_URL}${path}`;
}

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

const authProcedureUrl = (procedure: AuthProcedure): string => bffUrl(`${TRPC_ENDPOINT}/auth.${procedure}`);

const REFRESH_URL = authProcedureUrl('refresh');

/** 401을 refresh로 자동 복구하지 않을 프로시저 — refresh 자체(재귀 방지) + 로그인/회원가입(401이 정상 응답) */
const NON_REFRESHABLE = ['refresh', 'login', 'signup'] satisfies AuthProcedure[];

function isAuthEndpoint(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return NON_REFRESHABLE.some((procedure) => url.includes(`auth.${procedure}`));
}

// 액세스 만료로 여러 요청이 동시에 401을 맞아도 refresh는 한 번만 나가게 하는 single-flight.
let inflightRefresh: Promise<boolean> | null = null;
/**
 * 액세스 만료 시 refresh(회전)를 한 번만 내보내는 single-flight. tRPC의 fetchWithRefresh와
 * SSE 채널(use-task-sync)이 이 함수를 공유해 refresh 경로가 두 벌로 갈라지지 않게 한다.
 */
export function refreshSession(): Promise<boolean> {
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
async function fetchWithRefresh(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  onSessionLost: () => void,
): Promise<Response> {
  const res = await fetch(input, { ...init, credentials: 'include' });
  if (res.status !== 401 || typeof window === 'undefined' || isAuthEndpoint(input)) {
    return res;
  }
  const refreshed = await refreshSession();
  if (!refreshed) {
    // refresh까지 실패 = 세션이 죽었다. 게이트 캐시를 버려 다음 beforeLoad가
    // 곧바로 로그인 리다이렉트하게 한다 — 폴링 주기를 기다리지 않는다.
    onSessionLost();
    return res;
  }
  return fetch(input, { ...init, credentials: 'include' });
}

export type Trpc = TRPCOptionsProxy<AppRouter>;

export interface RouterAppContext {
  queryClient: QueryClient;
  trpc: Trpc;
}

export function createTrpc(): RouterAppContext {
  // staleTime·gcTime은 React Query 기본값(0 / 5분)을 쓴다 — 기본값과 같은 값을 명시하지 않는다.
  // 캐시가 살아 있어야 loader의 ensureQueryData가 네트워크 없이 즉시 반환하고
  // (docs/authentication-architecture.md의 "네비게이션 블로킹 제로"), 화면의
  // useSuspenseQuery가 suspend 하지 않는다. staleTime 0이라 마운트 트리거에서
  // 백그라운드 재검증이 돌아 과거 데이터를 보는 창은 재요청 왕복 시간으로 묶인다.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  // 세션이 죽었을 때 게이트 캐시를 버리는 콜백 — trpc 프록시가 아래에서 만들어지므로
  // 요청 시점에 읽도록 지연 참조한다(첫 요청은 반드시 프록시 생성 이후에 일어난다).
  const dropSessionUser = (): void => {
    queryClient.removeQueries({ queryKey: trpc.user.me.queryKey() });
  };

  const trpcClient = createTRPCClient<AppRouter>({
    links: [
      // 노배치(httpLink): 쿼리가 GET 단일 경로 URL로 나가야 BFF의 HTTP 캐시 정책이 동작한다
      httpLink({
        url: bffUrl(TRPC_ENDPOINT),
        fetch: (input, init) => fetchWithRefresh(input, init, dropSessionUser),
        headers: () => resolveSsrCookieHeaders(),
      }),
    ],
  });

  const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient });
  return { queryClient, trpc };
}

/** 세션 게이트가 캐시를 신선하다고 볼 시간 — 이 동안은 재확인 요청이 나가지 않는다. */
const SESSION_STALE_MS = 15 * 60_000;
/**
 * 게이트 캐시 수명. 반드시 SESSION_STALE_MS보다 커야 한다 — user.me는 구독하는
 * 컴포넌트가 없어 백그라운드 갱신(fetch)만이 gc 타이머를 리셋할 수 있으므로,
 * gcTime이 더 짧으면 갱신 전에 캐시가 삭제돼 블로킹 요청이 생긴다.
 */
const SESSION_GC_MS = 30 * 60_000;

export async function fetchSessionUser({ queryClient, trpc }: RouterAppContext): Promise<User | null> {
  try {
    const { user } = await queryClient.ensureQueryData({
      ...trpc.user.me.queryOptions(),
      // 게이트 용도라 초 단위 정확도가 필요 없다. 캐시를 즉시 반환해 내비게이션을
      // 막지 않고, 낡았을 때만 뒤에서 세션 유효성을 재확인한다. 폐기를 즉시 잡는 건
      // 이 주기가 아니라 fetchWithRefresh의 세션 상실 콜백이 담당한다.
      staleTime: SESSION_STALE_MS,
      gcTime: SESSION_GC_MS,
      revalidateIfStale: true,
    });
    return user;
  } catch {
    return null;
  }
}
