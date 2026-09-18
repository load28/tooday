import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import type { AuthServerCache } from '@/entities/auth/server-cache';

type AuthServerQueries = Pick<AuthServerCache, 'sessionView'>;
type AuthCommands = AuthServerCache['commands'];
const QueriesContext = createContext<AuthServerQueries | null>(null);
const CommandsContext = createContext<AuthCommands | null>(null);

/** 화면에는 조회와 변경 명령만 공급한다. 캐시 수명 관리는 라우터가 소유한다. */
export function AuthServerCacheProvider({ cache, children }: PropsWithChildren<{ cache: AuthServerCache }>) {
  const queries = useMemo(() => ({ sessionView: cache.sessionView }), [cache]);
  return (
    <QueriesContext.Provider value={queries}>
      <CommandsContext.Provider value={cache.commands}>{children}</CommandsContext.Provider>
    </QueriesContext.Provider>
  );
}

export function useAuthServerQueries(): AuthServerQueries {
  const queries = useContext(QueriesContext);
  if (!queries) throw new Error('AuthServerCacheProvider가 필요합니다.');
  return queries;
}

export function useAuthCommands(): AuthCommands {
  const commands = useContext(CommandsContext);
  if (!commands) throw new Error('AuthServerCacheProvider가 필요합니다.');
  return commands;
}
