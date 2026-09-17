import { createContext, type PropsWithChildren, useContext } from 'react';
import type { AuthData } from '@/entities/auth/data';

const AuthContext = createContext<AuthData | null>(null);
export function AuthDataProvider({ data, children }: PropsWithChildren<{ data: AuthData }>) {
  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
}
export function useAuthData() {
  const data = useContext(AuthContext);
  if (!data) throw new Error('AuthDataProvider가 필요합니다.');
  return data;
}
