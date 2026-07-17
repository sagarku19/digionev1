'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

async function openInvoice(url: string) {
  // Open the tab NOW — react-query runs this mutationFn synchronously inside the
  // click gesture, so opening before any await dodges popup blockers. We point it
  // at the signed URL once minted. No 'noopener' (it would null the handle); the
  // destination is our own signed R2 URL, and we clear opener defensively.
  const win = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  if (win) win.opener = null;
  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Could not generate invoice.');
    const { signedUrl } = data as { signedUrl?: string };
    if (!signedUrl) throw new Error('Invoice link missing from response.');
    if (win && !win.closed) win.location.href = signedUrl;
    else if (typeof window !== 'undefined') window.location.assign(signedUrl); // popup blocked → same-tab fallback
    return signedUrl;
  } catch (e) {
    win?.close();
    throw e;
  }
}

export function useDownloadSaleInvoice() {
  return useMutation({ mutationFn: (orderId: string) => openInvoice(`/api/invoices/sale/${orderId}`) });
}

export function useDownloadCommissionInvoice() {
  return useMutation({ mutationFn: (month: string) => openInvoice(`/api/invoices/commission/${month}`) });
}

// Months (YYYY-MM) in the current data that have commission, for the earnings "Tax invoices" list.
export function useCommissionMonths() {
  return useQuery({
    queryKey: ['invoices', 'commission-months'],
    queryFn: async (): Promise<{ month: string; label: string }[]> => {
      const profileId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('tax_transactions')
        .select('created_at, gst_on_commission, status')
        .eq('creator_id', profileId);
      if (error) throw error;
      const totals = new Map<string, number>();
      for (const r of data ?? []) {
        if (r.status === 'reversed') continue; // posted sales only (matches the commission route)
        const month = String(r.created_at).slice(0, 7);
        totals.set(month, (totals.get(month) ?? 0) + Number(r.gst_on_commission));
      }
      return [...totals.entries()]
        .filter(([, v]) => v > 0)
        .map(([month]) => ({
          month,
          label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
        }))
        .sort((a, b) => b.month.localeCompare(a.month));
    },
  });
}
