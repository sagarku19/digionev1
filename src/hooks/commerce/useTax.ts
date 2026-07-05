'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export interface PayoutTaxPreview {
  tds: number;
  tcs: number;
  fy: string;
  fy_turnover: number;
  gstin_present: boolean;
  registration_required: boolean;
}

export function usePayoutTaxPreview() {
  return useQuery({
    queryKey: ['earnings', 'tax-preview'],
    queryFn: async (): Promise<PayoutTaxPreview> => {
      const { data, error } = await supabase.rpc('get_payout_tax_preview');
      if (error) throw error;
      return data as unknown as PayoutTaxPreview;
    },
  });
}

export interface TaxSummaryRow {
  fy: string;
  tds: number;
  tcs: number;
  gstOnCommission: number;
  gross: number;
}

export function useTaxSummary() {
  return useQuery({
    queryKey: ['tax', 'summary'],
    queryFn: async (): Promise<TaxSummaryRow[]> => {
      const profileId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('tax_transactions')
        .select('fy, gross_amount, gst_on_commission, tds_amount, tcs_amount, status')
        .eq('creator_id', profileId);
      if (error) throw error;
      const byFy = new Map<string, TaxSummaryRow>();
      for (const r of data ?? []) {
        const sign = r.status === 'reversed' ? -1 : 1;
        const row = byFy.get(r.fy) ?? { fy: r.fy, tds: 0, tcs: 0, gstOnCommission: 0, gross: 0 };
        row.tds += sign * Number(r.tds_amount);
        row.tcs += sign * Number(r.tcs_amount);
        row.gstOnCommission += sign * Number(r.gst_on_commission);
        row.gross += sign * Number(r.gross_amount);
        byFy.set(r.fy, row);
      }
      return [...byFy.values()].sort((a, b) => b.fy.localeCompare(a.fy));
    },
  });
}

export function useAddGstin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gstin: string) => {
      const res = await fetch('/api/kyc/gstin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Could not save GSTIN.');
      return data as { ok: true; registered: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      queryClient.invalidateQueries({ queryKey: ['tax'] });
    },
  });
}
