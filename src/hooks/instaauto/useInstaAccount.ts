'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AccountStatus {
  account: { id: string; username: string | null; status: string; is_simulated: boolean; avatar_url: string | null; connected_at: string; token_expires_at: string | null } | null;
  connectConfigured: boolean;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

export function useInstaAccount() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['instaauto', 'account'],
    queryFn: () => getJson<AccountStatus>('/api/instaauto/account'),
  });

  const addDemo = useMutation({
    mutationFn: () => getJson('/api/instaauto/account/demo', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instaauto'] }),
  });
  const disconnect = useMutation({
    mutationFn: () => getJson('/api/instaauto/account/disconnect', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instaauto'] }),
  });

  return {
    account: query.data?.account ?? null,
    connectConfigured: query.data?.connectConfigured ?? false,
    isLoading: query.isLoading,
    addDemoAccount: addDemo.mutateAsync,
    disconnect: disconnect.mutateAsync,
    isMutating: addDemo.isPending || disconnect.isPending,
  };
}
