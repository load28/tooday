import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { collectionOptions, DbClient, liveQueryCollectionOptions } from '@tanstack/react-db';
import { QueryClient } from '@tanstack/react-query';
import { type CurrentUserResponse, type LoginRequest, type SignupRequest, type User, userSchema } from '@tooday/shared';
import * as v from 'valibot';

const sessionRowSchema = v.object({ id: v.literal('current'), user: v.nullable(userSchema) });
export const authHydrationSchema = v.object({ rows: v.array(sessionRowSchema), updatedAt: v.number() });
type SessionRow = v.InferOutput<typeof sessionRowSchema>;
type AuthHydration = v.InferOutput<typeof authHydrationSchema>;
export interface AuthTransport {
  getCurrentUser(signal: AbortSignal): Promise<CurrentUserResponse>;
  login(input: LoginRequest, signal: AbortSignal): Promise<User>;
  signup(input: SignupRequest, signal: AbortSignal): Promise<User>;
  logout(signal: AbortSignal): Promise<void>;
  clearUserData(): Promise<void>;
}

/** router / SSR 요청별 인증 환경. UI와 가드 모두 같은 DB 원본을 사용한다. */
export function createAuthServerCache(transport: AuthTransport) {
  const db = new DbClient();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.mount();
  const queryKey = ['auth-session'] as const;
  let abort = new AbortController();
  let generation = 0;
  let userId: string | undefined;
  const options = {
    queryKey,
    staleTime: 15 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async ({ signal }: { signal: AbortSignal }): Promise<SessionRow[]> => {
      const combined = AbortSignal.any([abort.signal, signal]);
      const { user } = await transport.getCurrentUser(combined);
      combined.throwIfAborted();
      if (userId !== user?.id) await transport.clearUserData();
      combined.throwIfAborted();
      userId = user?.id;
      return [{ id: 'current', user }];
    },
  };
  const session = db.collection(
    collectionOptions(
      queryCollectionOptions({
        ...options,
        id: 'auth-session',
        queryClient,
        schema: sessionRowSchema,
        getKey: (row) => row.id,
      }),
    ),
  );
  function sessionView() {
    return db.collection(
      collectionOptions('auth-session-view', () =>
        liveQueryCollectionOptions({
          id: 'auth-session-view',
          query: (q) => q.from({ session }),
          gcTime: options.gcTime,
        }),
      ),
    );
  }
  async function authenticate(operation: (signal: AbortSignal) => Promise<User>) {
    const expected = ++generation;
    const signal = abort.signal;
    const user = await operation(signal);
    signal.throwIfAborted();
    if (expected !== generation) throw new DOMException('인증 세션이 변경되었습니다.', 'AbortError');
    await queryClient.cancelQueries({ queryKey });
    await transport.clearUserData();
    signal.throwIfAborted();
    if (expected !== generation) throw new DOMException('인증 세션이 변경되었습니다.', 'AbortError');
    userId = user.id;
    queryClient.setQueryData<SessionRow[]>(queryKey, [{ id: 'current', user }]);
    await sessionView().preload();
    return user;
  }
  async function clear() {
    generation++;
    abort.abort();
    abort = new AbortController();
    await queryClient.cancelQueries({ queryKey });
    userId = undefined;
    queryClient.setQueryData<SessionRow[]>(queryKey, [{ id: 'current', user: null }]);
    await transport.clearUserData();
  }
  return {
    sessionView,
    async resolveUser() {
      const rows = await queryClient.ensureQueryData({ ...options, revalidateIfStale: true });
      await sessionView().preload();
      return rows[0]?.user ?? null;
    },
    commands: {
      login: (input: LoginRequest) => authenticate((signal) => transport.login(input, signal)),
      signup: (input: SignupRequest) => authenticate((signal) => transport.signup(input, signal)),
      async logout() {
        await transport.logout(abort.signal);
        await clear();
      },
    },
    clear,
    dehydrate(): AuthHydration {
      return {
        rows: queryClient.getQueryData<SessionRow[]>(queryKey) ?? [],
        updatedAt: queryClient.getQueryState(queryKey)?.dataUpdatedAt ?? 0,
      };
    },
    hydrate(initial: AuthHydration) {
      userId = initial.rows[0]?.user?.id;
      if (initial.rows.length) queryClient.setQueryData(queryKey, initial.rows, { updatedAt: initial.updatedAt });
    },
    async dispose() {
      generation++;
      abort.abort();
      await db.cleanup();
      queryClient.clear();
      queryClient.unmount();
    },
  };
}
export type AuthServerCache = ReturnType<typeof createAuthServerCache>;
