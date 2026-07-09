// Unified payment status page — handles both product orders and payment link submissions.
// Checks Cashfree directly (no polling), syncs DB, shows result + product access links.
// Query params:
//   ?order_id=<uuid|gateway_id>         → product checkout
//   ?order_id=<gateway_id>&sub=<uuid>   → payment link submission

import { createServiceClient } from '@/lib/supabase/service';
import { fulfillOrder, fulfillPaymentLinkSubmission } from '@/lib/server/fulfillment';
import {
  CheckCircle2, XCircle, Clock, RotateCcw,
  Home, Package, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { buildAccessLinks, type AccessLink } from '@/lib/shared/access-links';
import { CartClearer } from './CartClearer';
import { LibraryCta } from './LibraryCta';
import { DeliveryLinks } from '@/components/store/DeliveryLinks';
import { StatusFiles } from './StatusFiles';

const CASHFREE_ENV = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

// ── Helpers ──────────────────────────────────────────────────

function formatINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

async function getCashfreeStatus(gatewayOrderId: string): Promise<string> {
  try {
    const res = await fetch(`${CASHFREE_ENV}/orders/${gatewayOrderId}`, {
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID!,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
      },
      cache: 'no-store',
    });
    if (!res.ok) return 'PENDING';
    const data = await res.json();
    return data.order_status ?? 'PENDING';
  } catch {
    return 'PENDING';
  }
}

// Fetch the SUCCESS payment's cf_payment_id for a Cashfree order so the
// status-page reconcile stores the same gateway_payment_id (and ledger
// record_hash) the webhook would have. Cashfree's guidance: dedupe by
// cf_payment_id, not order_id. Failure → undefined (fall back to the old
// behavior: fulfill without a payment id).
async function getCashfreePaymentId(gatewayOrderId: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${CASHFREE_ENV}/orders/${gatewayOrderId}/payments`, {
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID!,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
      },
      cache: 'no-store',
    });
    if (!res.ok) return undefined;
    const payments: unknown = await res.json();
    if (!Array.isArray(payments)) return undefined;
    // reason: Cashfree response is untyped at the fetch boundary; narrow the two fields used
    const success = (payments as Array<{ payment_status?: string; cf_payment_id?: string | number }>)
      .find((p) => p?.payment_status === 'SUCCESS');
    return success?.cf_payment_id != null ? String(success.cf_payment_id) : undefined;
  } catch {
    return undefined;
  }
}

function cfToDbStatus(cfStatus: string): 'completed' | 'failed' | 'pending' {
  if (cfStatus === 'PAID') return 'completed';
  if (['EXPIRED', 'USER_DROPPED', 'DROPPED', 'FAILED'].includes(cfStatus)) return 'failed';
  return 'pending';
}

type ProductAccess = {
  id: string;
  name: string;
  thumbnail_url: string | null;
  post_purchase_instructions: string | null;
  price: number;
  links: AccessLink[];
};

// ── Page ─────────────────────────────────────────────────────

export default async function PaymentStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; sub?: string }>;
}) {
  const { order_id, sub } = await searchParams;

  if (!order_id) {
    return (
      <Shell status="failed">
        <div className="px-6 py-10 text-center">
          <StatusIcon type="failed" />
          <h1 className="mb-1.5 text-[20px] font-bold tracking-[-0.02em] text-[#16130F]">Invalid request</h1>
          <p className="mb-7 text-[13.5px] font-medium text-black/50">Missing order information.</p>
          <Link href="/" className="text-[13.5px] font-semibold text-[#E83A2E] transition-colors hover:text-[#C92F24]">
            Return home
          </Link>
        </div>
      </Shell>
    );
  }

  const supabase = createServiceClient();

  let status: 'completed' | 'failed' | 'pending' = 'pending';
  let amount = 0;
  let customerName = 'Customer';
  let customerEmail = '';
  let itemName = 'Digital Product';
  let receiptUrl = '';
  let internalOrderId = order_id;
  let products: ProductAccess[] = [];

  if (sub) {
    // ═══ Payment Link flow ═══
    const { data: submission } = await supabase
      .from('payment_submissions')
      .select('*, payment_requests(title)')
      .eq('id', sub)
      .single();

    if (submission) {
      if (submission.payment_status === 'completed') {
        status = 'completed';
      } else if (submission.payment_status === 'failed' || submission.payment_status === 'refunded') {
        status = 'failed';
      } else {
        // Still pending in our DB — reconcile against Cashfree (finding #27)
        const cfStatus = await getCashfreeStatus(submission.gateway_order_id || order_id);
        status = cfToDbStatus(cfStatus);
        if (status === 'completed') {
          const gatewayPaymentId = await getCashfreePaymentId(submission.gateway_order_id || order_id);
          await fulfillPaymentLinkSubmission(submission.id, gatewayPaymentId);
        }
        // 'failed' is display-only here; the webhook owns failure transitions
      }

      amount = submission.amount ?? 0;
      customerName = submission.customer_name || 'Customer';
      customerEmail = submission.customer_email || '';
      const pr = Array.isArray(submission.payment_requests)
        ? submission.payment_requests[0]
        : submission.payment_requests;
      itemName = pr?.title || 'Payment';
      receiptUrl = `/payment/receipt?order_id=${order_id}&sub=${sub}`;
    }
  } else {
    // ═══ Product checkout flow ═══
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id);
    const col = isUUID ? 'id' : 'gateway_order_id';

    const { data: order } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          price_at_purchase,
          products(id, name, thumbnail_url, post_purchase_instructions, post_purchase_url, access_links)
        )
      `)
      .eq(col, order_id)
      .single();

    if (order) {
      internalOrderId = order.id;

      if (order.status === 'completed') {
        status = 'completed';
      } else if (order.status === 'failed' || order.status === 'refunded') {
        status = 'failed';
      } else {
        // Still pending in our DB — reconcile against Cashfree (finding #27)
        const cfStatus = await getCashfreeStatus(order.gateway_order_id || order_id);
        status = cfToDbStatus(cfStatus);
        if (status === 'completed') {
          const gatewayPaymentId = await getCashfreePaymentId(order.gateway_order_id || order_id);
          // shared claim — no raw writes here; payment id keeps the ledger
          // record_hash identical to the webhook path (no more ':free' hashes)
          await fulfillOrder(order.id, gatewayPaymentId ? { gatewayPaymentId } : undefined);
        }
        // 'failed' is display-only here; the webhook owns failure transitions
      }

      amount = order.total_amount ?? 0;
      customerName = order.customer_name || 'Customer';
      customerEmail = order.customer_email || '';
      receiptUrl = `/payment/receipt?order_id=${internalOrderId}`;

      // Build product access list
      products = (order.order_items ?? [])
        .map((item) => {
          const p = Array.isArray(item.products) ? item.products[0] : item.products;
          return p
            ? {
                id: p.id,
                name: p.name,
                thumbnail_url: p.thumbnail_url,
                post_purchase_instructions: p.post_purchase_instructions,
                price: Number(item.price_at_purchase) || 0,
                links: buildAccessLinks({ postPurchaseUrl: p.post_purchase_url, accessLinks: p.access_links }),
              }
            : null;
        })
        .filter((p): p is ProductAccess => p !== null);

      const names = products.map((p) => p.name);
      itemName = names.length ? names.join(', ') : 'Digital Products';
    }
  }

  // ── Render ──

  return (
    <Shell status={status}>
      {status === 'completed' && !sub && <CartClearer />}

      {/* ── SUCCESS ── */}
      {status === 'completed' && (
        <div className="w-full">
          {/* Hero */}
          <div className="px-6 pt-8 pb-5 text-center">
            <StatusIcon type="completed" />
            <p className="mb-2 font-ledger text-[10px] uppercase tracking-[0.18em] text-emerald-700">Payment confirmed</p>
            <h1 className="mb-1 text-[22px] font-bold tracking-[-0.02em] text-[#16130F]">
              Thank you, {customerName.split(' ')[0]}
            </h1>
            <p className="text-[13.5px] font-medium text-black/50">Your purchase is confirmed.</p>
            {customerEmail && (
              <p className="mt-2 font-ledger text-[10px] text-black/40">
                Receipt sent to <span className="text-black/60">{customerEmail}</span>
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="mx-6 mb-6 flex items-center justify-between rounded-xl border border-black/[0.07] bg-[#FAF8F6] px-5 py-4">
            <span className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/40">Amount paid</span>
            <span className="font-ledger text-[24px] font-semibold leading-none tracking-tight text-[#16130F]">{formatINR(amount)}</span>
          </div>

          {/* Product access */}
          {products.length > 0 && (
            <div className="mb-5 px-6">
              <div className="mb-3 flex items-center gap-3 font-ledger text-[10px]">
                <span className="font-semibold text-[#E83A2E]">{'>>'}</span>
                <span className="uppercase tracking-[0.18em] text-black/35">your products</span>
                <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
              </div>
              <div className="overflow-hidden rounded-xl border border-black/[0.07]">
                {products.map((p, i) => (
                  <div key={i} className={i > 0 ? 'border-t border-black/[0.06]' : ''}>
                    <div className="flex items-center gap-3 p-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/[0.07] bg-[#FAF8F6]">
                        {p.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumbnail_url} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-black/25" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-[#16130F]">{p.name}</p>
                        <p className="font-ledger text-[11px] text-black/45">{formatINR(p.price)}</p>
                      </div>
                    </div>

                    {p.post_purchase_instructions && (
                      <div className="px-4 pb-3">
                        <p className="rounded-lg border border-black/[0.06] bg-[#FAF8F6] p-3 text-[12px] leading-relaxed text-black/55">
                          {p.post_purchase_instructions}
                        </p>
                      </div>
                    )}

                    {/* Files (logged-in + access gated) + labelled links */}
                    <div className="space-y-2.5 px-4 pb-4">
                      <StatusFiles productId={p.id} />
                      {p.links.length > 0 && <DeliveryLinks links={p.links} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment-link success (no products) */}
          {products.length === 0 && sub && (
            <div className="mb-5 px-6">
              <div className="rounded-xl border border-black/[0.07] bg-[#FAF8F6] p-4 text-center">
                <p className="mb-1 text-[13.5px] font-semibold text-[#16130F]">{itemName}</p>
                <p className="font-ledger text-[11px] text-black/45">The creator has been notified of your payment.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5 px-6 pb-6">
            {!sub && <LibraryCta email={customerEmail} />}
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/[0.1] py-3 text-[13.5px] font-semibold text-[#16130F] transition-colors hover:border-black/[0.25] hover:bg-[#FAF8F6]"
              >
                <FileText className="h-4 w-4 text-black/40" />
                Download receipt
              </a>
            )}
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FAF8F6] py-3 text-[13.5px] font-semibold text-black/55 transition-colors hover:bg-black/[0.05]"
            >
              <Home className="h-4 w-4" />
              Return home
            </Link>
          </div>

          {/* Order id */}
          <div className="border-t border-black/[0.06] px-6 py-4 text-center">
            <p className="font-ledger text-[10px] uppercase tracking-[0.14em] text-black/35">
              Order {internalOrderId.slice(0, 8)}
            </p>
          </div>
        </div>
      )}

      {/* ── FAILED ── */}
      {status === 'failed' && (
        <div className="w-full px-6 py-8">
          <div className="text-center">
            <StatusIcon type="failed" />
            <h1 className="mb-1.5 text-[22px] font-bold tracking-[-0.02em] text-[#16130F]">Payment failed</h1>
            <p className="text-[13.5px] font-medium text-black/50">We couldn&apos;t process your payment. No charges were made.</p>
          </div>

          <div className="mt-6 rounded-xl border border-[#E83A2E]/15 bg-[#E83A2E]/[0.05] p-4">
            <p className="mb-2.5 font-ledger text-[10px] uppercase tracking-[0.16em] text-[#E83A2E]">Common reasons</p>
            <ul className="space-y-1.5 text-[12.5px] text-black/55">
              {[
                'Insufficient funds or daily limit reached',
                'Incorrect card details or expired card',
                'Payment window closed before completing',
                'Bank server timeout — try again in a minute',
              ].map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-black/25" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 space-y-2.5">
            <Link
              href="/checkout"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E83A2E] py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#C92F24]"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </Link>
            <Link
              href="/"
              className="flex w-full items-center justify-center rounded-lg border border-black/[0.1] py-3.5 text-[14px] font-semibold text-[#16130F] transition-colors hover:border-black/[0.25] hover:bg-[#FAF8F6]"
            >
              Return home
            </Link>
          </div>
        </div>
      )}

      {/* ── PENDING ── */}
      {status === 'pending' && (
        <div className="w-full px-6 py-8 text-center">
          <StatusIcon type="pending" />
          <h1 className="mb-1.5 text-[22px] font-bold tracking-[-0.02em] text-[#16130F]">Payment processing</h1>
          <p className="mx-auto max-w-xs text-[13.5px] font-medium leading-relaxed text-black/50">
            We&apos;re verifying your payment with the bank. This usually takes a few seconds.
          </p>

          <Link
            href={`/payment/status?order_id=${order_id}${sub ? `&sub=${sub}` : ''}`}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#16130F] py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-black"
          >
            <RotateCcw className="h-4 w-4" />
            Refresh status
          </Link>
          <p className="mt-3 font-ledger text-[10px] uppercase tracking-[0.14em] text-black/35">
            Access is granted automatically once confirmed
          </p>
        </div>
      )}
    </Shell>
  );
}

// ── Sub-components ───────────────────────────────────────────

function Shell({ children, status }: { children: React.ReactNode; status: 'completed' | 'failed' | 'pending' }) {
  const rule =
    status === 'completed' ? 'bg-emerald-500'
    : status === 'failed' ? 'bg-[#E83A2E]'
    : 'bg-amber-500';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#FAF8F6] px-4 py-10 text-[#16130F]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(22,19,15,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.025) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, #000 0%, transparent 85%)',
          maskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, #000 0%, transparent 85%)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_24px_70px_-40px_rgba(22,19,15,0.35)]">
          <div className={`h-1 w-full ${rule}`} />
          {children}
        </div>
        <p className="mt-4 text-center font-ledger text-[10px] uppercase tracking-[0.16em] text-black/35">
          Secured by DigiOne · Payments via Cashfree
        </p>
      </div>
    </div>
  );
}

function StatusIcon({ type }: { type: 'completed' | 'failed' | 'pending' }) {
  const icon = {
    completed: <CheckCircle2 className="h-7 w-7 text-emerald-600" strokeWidth={1.8} />,
    failed: <XCircle className="h-7 w-7 text-[#E83A2E]" strokeWidth={1.8} />,
    pending: <Clock className="h-7 w-7 animate-pulse text-amber-600" strokeWidth={1.8} />,
  }[type];

  return (
    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-black/[0.07] bg-[#FAF8F6]">
      {icon}
    </div>
  );
}
