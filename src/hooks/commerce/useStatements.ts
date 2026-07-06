'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

async function openStatement(url: string) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Could not generate statement.');
  const { signedUrl } = data as { signedUrl: string };
  window.open(signedUrl, '_blank', 'noopener');
  return signedUrl;
}

export function useDownloadAnnualStatement() {
  return useMutation({ mutationFn: (fy: string) => openStatement(`/api/statements/annual/${fy}`) });
}

function fyOfDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
}

// Financial years that have any posted sale activity, newest first.
export function useStatementYears() {
  return useQuery({
    queryKey: ['statements', 'years'],
    queryFn: async (): Promise<string[]> => {
      const profileId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('tax_transactions')
        .select('created_at, status')
        .eq('creator_id', profileId);
      if (error) throw error;
      const years = new Set<string>();
      for (const r of data ?? []) {
        if (r.status === 'reversed') continue;
        years.add(fyOfDate(String(r.created_at)));
      }
      return [...years].sort((a, b) => b.localeCompare(a));
    },
  });
}
