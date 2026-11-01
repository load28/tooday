import { QueryClient } from '@tanstack/react-query';
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import type { AuthServerCache } from '@/entities/auth/server-cache';
import { type CommandMutation, useCommandMutation } from '@/shared/command-mutation';

type AuthServerQueries = Pick<AuthServerCache, 'sessionView'>;
type AuthCommands = AuthServerCache['commands'];
type AuthActions = { commands: AuthCommands; client: QueryClient };
const QueriesContext = createContext<AuthServerQueries | null>(null);
const ActionsContext = createContext<AuthActions | null>(null);

/** 화면에는 조회와 업무 액션만 공급한다. 캐시 수명 관리는 라우터가 소유한다. */
export function AuthServerCacheProvider({ cache, children }: PropsWithChildren<{ cache: AuthServerCache }>) {
  const queries = useMemo(() => ({ sessionView: cache.sessionView }), [cache]);
  const actions = useMemo(() => ({ commands: cache.commands, client: new QueryClient() }), [cache]);
  return (
    <QueriesContext.Provider value={queries}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </QueriesContext.Provider>
  );
}

export function useAuthServerQueries(): AuthServerQueries {
  const queries = useContext(QueriesContext);
  if (!queries) throw new Error('AuthServerCacheProvider가 필요합니다.');
  return queries;
}

/** 이름 있는 인증 명령을 mutation으로 실행한다. 대기·오류는 반환값의 상태로 읽는다. */
export function useAuthAction<K extends keyof AuthCommands>(name: K): CommandMutation<AuthCommands[K]> {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('AuthServerCacheProvider가 필요합니다.');
  return useCommandMutation(actions.commands[name], actions.client);
}
