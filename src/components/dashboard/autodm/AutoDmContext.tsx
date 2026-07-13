'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { useInstaAccount } from '@/hooks/instaauto/useInstaAccount';

interface Ctx { accountId?: string; isSimulated: boolean; connected: boolean; connectConfigured: boolean; isLoading: boolean; }
const AutoDmContext = createContext<Ctx>({ isSimulated: false, connected: false, connectConfigured: false, isLoading: true });
export const useAutoDm = () => useContext(AutoDmContext);

export function AutoDmProvider({ children }: { children: ReactNode }) {
  const { account, connectConfigured, isLoading } = useInstaAccount();
  return (
    <AutoDmContext.Provider value={{
      accountId: account?.id, isSimulated: account?.is_simulated ?? false,
      connected: account?.status === 'active', connectConfigured, isLoading,
    }}>
      {children}
    </AutoDmContext.Provider>
  );
}
