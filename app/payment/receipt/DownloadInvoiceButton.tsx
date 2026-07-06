'use client';

import { useDownloadSaleInvoice } from '@/hooks/commerce/useInvoices';

export function DownloadInvoiceButton({ orderId }: { orderId: string }) {
  const dl = useDownloadSaleInvoice();
  return (
    <button
      onClick={() => dl.mutate(orderId)}
      disabled={dl.isPending}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-black/[0.1] hover:border-black/[0.25] text-[#16130F] font-semibold text-[14px] transition-colors disabled:opacity-50"
    >
      {dl.isPending ? 'Preparing…' : 'Download invoice'}
    </button>
  );
}
