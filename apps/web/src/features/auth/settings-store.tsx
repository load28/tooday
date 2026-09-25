import { type Atom, createStoreContext, useCreateAtom } from '@tanstack/react-store';
import { type PropsWithChildren, useMemo } from 'react';

type SettingsStore = {
  logoutConfirmationOpenAtom: Atom<boolean>;
};

const { StoreProvider, useStoreContext } = createStoreContext<SettingsStore>();
export const useSettingsStore = useStoreContext;

export function SettingsStoreProvider({ children }: PropsWithChildren) {
  const logoutConfirmationOpenAtom = useCreateAtom(false);
  const value = useMemo(() => ({ logoutConfirmationOpenAtom }), [logoutConfirmationOpenAtom]);
  return <StoreProvider value={value}>{children}</StoreProvider>;
}
