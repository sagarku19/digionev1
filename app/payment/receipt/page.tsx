import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';
import { PrintButton } from './PrintButton';
import { DownloadInvoiceButton } from './DownloadInvoiceButton';
import { DigiOneLogo } from '@/src/components/assets/DigiOneLogo';
import { orderRef } from '@/lib/shared/order-ref';

export const revalidate = 0;

function formatINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function formatDate(iso: string | null | undefined) {
  return iso
    ? new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
}

type OrderItemRow = { products: { name: string | null } | { name: string | null }[] | null };

export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; sub?: string }>;
}) {
  const { order_id, sub } = await searchParams;

  if (!order_id) return notFound();

  const supabase = createServiceClient();

  let details = {
    date: '',
    amount: 0,
    customerName: 'Customer',
    customerEmail: '',
    itemName: 'Digital Product / Service',
    orderId: order_id,
    refNo: '',
  };

  if (sub) {
    // Payment Link submission
    const { data: submission, error: subErr } = await supabase
      .from('payment_submissions')
      .select('*')
      .eq('id', sub)
      .single();

    if (subErr) {
      console.error('Receipt sub fetch err:', subErr);
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FAF8F6] px-4 text-[13.5px] font-medium text-[#E83A2E]">
          Error loading receipt: {subErr.message}
        </div>
      );
    }
    if (!submission) return notFound();

    let title = 'Payment';
    if (submission.payment_request_id) {
      const { data: pr } = await supabase
        .from('payment_requests')
        .select('title')
        .eq('id', submission.payment_request_id)
        .maybeSingle();
      if (pr?.title) title = pr.title;
    }

    details = {
      date: formatDate(submission.created_at),
      amount: submission.amount ?? 0,
      customerName: submission.customer_name || 'Customer',
      customerEmail: submission.customer_email || '',
      itemName: title,
      orderId: submission.gateway_order_id || order_id,
      refNo: orderRef(submission.id),
    };
  } else {
    // Standard Checkout Order — order_id can be a UUID or a gateway order id (ord_...)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id);
    const col = isUUID ? 'id' : 'gateway_order_id';
    const { data: order } = await supabase
      .from('orders')
      .select('*, order_items(products(name))')
      .eq(col, order_id)
      .single();

    if (!order) return notFound();

    // Try to fetch buyer details safely
    let buyerName = order.customer_name || 'Customer';
    const buyerEmail = order.customer_email || '';
    if (order.user_id && buyerName === 'Customer') {
      const { data: buyer } = await supabase.from('profiles').select('*').eq('id', order.user_id).maybeSingle();
      if (buyer) {
        buyerName = buyer.full_name || 'Customer';
      }
    }

    const itemNames = ((order.order_items ?? []) as OrderItemRow[])
      .map((i) => (Array.isArray(i.products) ? i.products[0]?.name : i.products?.name))
      .filter(Boolean)
      .join(', ');

    details = {
      date: formatDate(order.created_at),
      amount: order.total_amount ?? 0,
      customerName: buyerName,
      customerEmail: buyerEmail,
      itemName: itemNames || 'Digital Products',
      orderId: order.id,
      refNo: orderRef(order.id),
    };
  }

  return (
    <div className="min-h-screen bg-[#FAF8F6] px-4 py-10 text-[#16130F] antialiased print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-black/[0.07] bg-white p-8 shadow-[0_24px_70px_-40px_rgba(22,19,15,0.35)] sm:p-10 print:rounded-none print:border-0 print:shadow-none">

          {/* Header */}
          <div className="mb-8 flex items-start justify-between border-b border-black/[0.07] pb-8">
            <div className="flex items-center gap-2.5">
              <DigiOneLogo width={26} height={26} />
              <div>
                <p className="text-[17px] font-bold tracking-tight text-[#16130F]">
                  DigiOne<span className="font-ledger align-super text-[9px] font-semibold text-[#E83A2E] ml-0.5">.ai</span>
                </p>
                <p className="font-ledger text-[10px] uppercase tracking-[0.16em] text-black/40">Payment receipt</p>
              </div>
            </div>
            <div className="text-right">
              <p className="mb-1 font-ledger text-[9px] uppercase tracking-[0.16em] text-black/35">Receipt no.</p>
              <p className="break-all font-ledger text-[12px] text-[#16130F]">{details.refNo}</p>
              <p className="mt-1.5 font-ledger text-[11px] text-black/45">{details.date}</p>
            </div>
          </div>

          {/* Billed to / amount */}
          <div className="mb-10 grid grid-cols-2 gap-8">
            <div>
              <p className="mb-2 font-ledger text-[9px] uppercase tracking-[0.16em] text-black/35">Billed to</p>
              <p className="text-[14px] font-semibold text-[#16130F]">{details.customerName}</p>
              {details.customerEmail && <p className="text-[13px] text-black/50">{details.customerEmail}</p>}
            </div>
            <div className="text-right">
              <p className="mb-2 font-ledger text-[9px] uppercase tracking-[0.16em] text-black/35">Amount paid</p>
              <p className="font-ledger text-[28px] font-semibold leading-none tracking-tight text-[#16130F]">{formatINR(details.amount)}</p>
            </div>
          </div>

          {/* Line items */}
          <table className="mb-10 w-full text-left">
            <thead>
              <tr className="border-y border-black/[0.08]">
                <th className="py-3 font-ledger text-[9px] font-semibold uppercase tracking-[0.16em] text-black/40">Description</th>
                <th className="py-3 text-right font-ledger text-[9px] font-semibold uppercase tracking-[0.16em] text-black/40">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black/[0.06]">
                <td className="py-4 text-[14px] font-medium text-[#16130F]">{details.itemName}</td>
                <td className="py-4 text-right font-ledger text-[14px] text-[#16130F]">{formatINR(details.amount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-4 text-right text-[14px] font-bold text-[#16130F]">Total paid</td>
                <td className="pt-4 text-right font-ledger text-[17px] font-semibold text-[#16130F]">{formatINR(details.amount)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Footer */}
          <div className="mt-12 border-t border-black/[0.07] pt-6 text-center">
            <p className="text-[12.5px] text-black/45">Questions about this receipt? Contact support.</p>
            <p className="mt-1 font-ledger text-[10px] uppercase tracking-[0.14em] text-black/35">Secured by DigiOne · Payments via Cashfree</p>
          </div>
        </div>

        <PrintButton />
        <div className="mt-3 flex justify-center print:hidden">
          <DownloadInvoiceButton orderId={details.orderId} />
        </div>
      </div>
    </div>
  );
}
