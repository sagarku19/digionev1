import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { resolveProfileId } from '@/lib/server/resolve-profile';
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

// The receipt is a capability link (unguessable order UUID) but still public, so
// the buyer's email is masked unless the viewer is signed in AS the buyer or the
// selling creator. Keeps guest confirmation working without leaking a contactable
// identifier to anyone who gets the link.
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) return '•••';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local.slice(0, 2)}•••@${domain}`;
}

// Show the first name in full and reduce the rest of each word to an initial
// ("Asha Verma" → "Asha V.") so an unauthorized viewer can't read the full name.
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Customer';
  return parts
    .map((p, i) => (i === 0 ? p : `${p.charAt(0).toUpperCase()}.`))
    .join(' ');
}

type OrderItemRow = {
  price_at_purchase: number | null;
  products: { name: string | null } | { name: string | null }[] | null;
};

type ReceiptLine = { name: string; price: number };

export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; sub?: string }>;
}) {
  const { order_id, sub } = await searchParams;

  if (!order_id) return notFound();

  const supabase = createServiceClient();

  // Who's viewing? Used to decide whether the real email is shown or masked.
  const authClient = await createClient();
  const { data: { user: viewer } } = await authClient.auth.getUser();
  const viewerEmail = viewer?.email?.toLowerCase() ?? null;

  const isOrder = !sub;

  let details = {
    date: '',
    amount: 0,
    customerName: 'Customer',
    customerEmail: '',
    masked: false,
    lineItems: [] as ReceiptLine[],
    discount: 0,
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

    const subEmail = submission.customer_email || '';
    const subName = submission.customer_name || 'Customer';
    const subAuthorized = !!subEmail && !!viewerEmail && viewerEmail === subEmail.toLowerCase();

    details = {
      date: formatDate(submission.created_at),
      amount: submission.amount ?? 0,
      customerName: subAuthorized ? subName : maskName(subName),
      customerEmail: subEmail ? (subAuthorized ? subEmail : maskEmail(subEmail)) : '',
      masked: !subAuthorized,
      lineItems: [{ name: title, price: submission.amount ?? 0 }],
      discount: 0,
      orderId: submission.gateway_order_id || order_id,
      refNo: orderRef(submission.id),
    };
  } else {
    // Standard Checkout Order — order_id can be a UUID or a gateway order id (ord_...)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id);
    const col = isUUID ? 'id' : 'gateway_order_id';
    const { data: order } = await supabase
      .from('orders')
      .select('*, order_items(price_at_purchase, products(name))')
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

    // One receipt line per purchased product (each with its own price).
    const total = order.total_amount ?? 0;
    let lineItems: ReceiptLine[] = ((order.order_items ?? []) as OrderItemRow[])
      .map((i) => {
        const p = Array.isArray(i.products) ? i.products[0] : i.products;
        return { name: p?.name ?? 'Product', price: Number(i.price_at_purchase) || 0 };
      });
    if (lineItems.length === 0) lineItems = [{ name: 'Digital Products', price: total }];
    // Coupons discount the paid total below the sum of item prices — show the
    // difference as a discount row so the lines + discount reconcile to the total.
    const subtotal = lineItems.reduce((s, it) => s + it.price, 0);
    const discount = Math.max(0, subtotal - total);

    // Authorize the viewer: signed-in buyer (by user_id or matching email) or the
    // selling creator (by profile id). Anyone else gets a masked email.
    let authorized = false;
    if (viewer && buyerEmail) {
      const isBuyer =
        order.user_id === viewer.id ||
        viewerEmail === buyerEmail.toLowerCase();
      let isCreator = false;
      if (!isBuyer && order.creator_id) {
        const profileId = await resolveProfileId(viewer.id, viewer.email);
        isCreator = !!profileId && profileId === order.creator_id;
      }
      authorized = isBuyer || isCreator;
    }

    details = {
      date: formatDate(order.created_at),
      amount: total,
      customerName: authorized ? buyerName : maskName(buyerName),
      customerEmail: buyerEmail ? (authorized ? buyerEmail : maskEmail(buyerEmail)) : '',
      masked: !authorized,
      lineItems,
      discount,
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
              {details.masked && (
                <p className="mt-0.5 font-ledger text-[10px] tracking-[0.02em] text-black/35 print:hidden">
                  Hidden for privacy · sign in to view
                </p>
              )}
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
              {details.lineItems.map((line, i) => (
                <tr key={i} className="border-b border-black/[0.06]">
                  <td className="py-4 text-[14px] font-medium text-[#16130F]">{line.name}</td>
                  <td className="py-4 text-right font-ledger text-[14px] text-[#16130F]">{formatINR(line.price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {details.discount > 0 && (
                <tr>
                  <td className="pt-4 text-right text-[13px] font-medium text-black/50">Discount</td>
                  <td className="pt-4 text-right font-ledger text-[13px] text-black/50">-{formatINR(details.discount)}</td>
                </tr>
              )}
              <tr>
                <td className="pt-2.5 text-right text-[14px] font-bold text-[#16130F]">Total paid</td>
                <td className="pt-2.5 text-right font-ledger text-[17px] font-semibold text-[#16130F]">{formatINR(details.amount)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Footer */}
          <div className="mt-12 border-t border-black/[0.07] pt-6 text-center">
            <p className="text-[12.5px] text-black/45">Questions about this receipt? Contact support.</p>
            <p className="mt-1 font-ledger text-[10px] uppercase tracking-[0.14em] text-black/35">Secured by DigiOne · Encrypted payments</p>
          </div>
        </div>

        <PrintButton />

        {/* Receipt vs. invoice framing — invoices exist only for product orders */}
        {isOrder && (
          <div className="mt-6 flex flex-col items-center gap-2.5 print:hidden">
            <p className="max-w-md text-center text-[12.5px] leading-relaxed text-black/45">
              This is your payment receipt — instant proof that your payment went through.
              Need a formal <span className="font-semibold text-black/60">Bill of Supply</span> invoice
              (with an official invoice number for your accounting or expense records)? Download it below.
            </p>
            <DownloadInvoiceButton orderId={details.orderId} />
          </div>
        )}
      </div>
    </div>
  );
}
