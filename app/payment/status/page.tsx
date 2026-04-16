// Unified payment status page — handles both product orders and payment link submissions.
// Checks Cashfree directly (no polling), syncs DB, shows result + product access links.
// Query params:
//   ?order_id=<uuid|gateway_id>         → product checkout
//   ?order_id=<gateway_id>&sub=<uuid>   → payment link submission

import { createClient } from '@supabase/supabase-js';
import {
  CheckCircle2, XCircle, Clock, Download, RotateCcw,
  Home, ExternalLink, Package, ArrowRight, ShieldCheck,
  BookOpen, Video, FileText, Link2,
} from 'lucide-react';
import Link from 'next/link';
import { CartClearer } from './CartClearer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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

function cfToDbStatus(cfStatus: string): 'completed' | 'failed' | 'pending' {
  if (cfStatus === 'PAID') return 'completed';
  if (['EXPIRED', 'USER_DROPPED', 'DROPPED', 'FAILED'].includes(cfStatus)) return 'failed';
  return 'pending';
}

type ProductAccess = {
  name: string;
  thumbnail_url: string | null;
  product_link: string | null;
  post_purchase_url: string | null;
  post_purchase_instructions: string | null;
  price: number;
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
        <StatusIcon type="failed" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Request</h1>
        <p className="text-sm text-gray-500 mb-8">Missing order information.</p>
        <Link href="/" className="text-indigo-600 font-semibold hover:underline">Return home</Link>
      </Shell>
    );
  }

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
      const cfStatus = await getCashfreeStatus(submission.gateway_order_id || order_id);
      status = cfToDbStatus(cfStatus);

      if (status !== 'pending') {
        await supabase.from('payment_submissions')
          .update({ payment_status: status })
          .eq('id', sub);
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

    const { data: order } = await (supabase
      .from('orders')
      .select(`
        *,
        order_items(
          price_at_purchase,
          products(name, thumbnail_url, product_link, post_purchase_url, post_purchase_instructions)
        )
      `) as any)
      .eq(col, order_id)
      .single();

    if (order) {
      internalOrderId = order.id;
      const cfOrderId = order.gateway_order_id || order_id;
      const cfStatus = await getCashfreeStatus(cfOrderId);
      status = cfToDbStatus(cfStatus);

      if (status !== 'pending' && order.status === 'pending') {
        const syncUpdate: Record<string, any> = { status };
        if (status === 'completed') syncUpdate.payment_verified_at = new Date().toISOString();
        let { error: syncErr } = await (supabase.from('orders') as any).update(syncUpdate).eq('id', order.id);
        if (syncErr?.message?.includes('payment_verified_at')) {
          await (supabase.from('orders') as any).update({ status }).eq('id', order.id);
        }
      } else if (order.status === 'completed') {
        status = 'completed';
      } else if (order.status === 'failed') {
        status = 'failed';
      }

      amount = order.total_amount ?? 0;
      customerName = order.customer_name || 'Customer';
      customerEmail = order.customer_email || '';
      receiptUrl = `/payment/receipt?order_id=${internalOrderId}`;

      // Build product access list
      products = (order.order_items ?? [])
        .map((item: any) => item.products ? {
          name: item.products.name,
          thumbnail_url: item.products.thumbnail_url,
          product_link: item.products.product_link,
          post_purchase_url: item.products.post_purchase_url,
          post_purchase_instructions: item.products.post_purchase_instructions,
          price: Number(item.price_at_purchase) || 0,
        } : null)
        .filter(Boolean) as ProductAccess[];

      const names = products.map(p => p.name);
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
          <div className="text-center px-6 pt-8 pb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 mb-4 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Payment Successful!
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Hi {customerName.split(' ')[0]}, your purchase is confirmed.
            </p>
            {customerEmail && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                A confirmation has been sent to <span className="font-medium text-gray-600 dark:text-gray-300">{customerEmail}</span>
              </p>
            )}
          </div>

          {/* Amount pill */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full px-5 py-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{formatINR(amount)}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">paid</span>
            </div>
          </div>

          {/* Product access cards */}
          {products.length > 0 && (
            <div className="px-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 px-1">
                Your Products
              </p>
              <div className="space-y-3">
                {products.map((p, i) => {
                  const accessUrl = p.post_purchase_url || p.product_link;
                  return (
                    <div
                      key={i}
                      className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-4">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.thumbnail_url ? (
                            <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">{formatINR(p.price)}</p>
                        </div>
                      </div>

                      {/* Instructions */}
                      {p.post_purchase_instructions && (
                        <div className="px-4 pb-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800/60 rounded-xl p-3 leading-relaxed border border-gray-100 dark:border-gray-700/40">
                            {p.post_purchase_instructions}
                          </p>
                        </div>
                      )}

                      {/* Access button */}
                      {accessUrl ? (
                        <div className="px-4 pb-4">
                          <a
                            href={accessUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-indigo-500/20"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Access Product
                            <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                          </a>
                        </div>
                      ) : (
                        <div className="px-4 pb-4">
                          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl px-3 py-2.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>The creator will share access details via email shortly.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment link success (no products) */}
          {products.length === 0 && sub && (
            <div className="px-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-4 text-center">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{itemName}</p>
                <p className="text-xs text-gray-500">The creator has been notified of your payment.</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="px-4 pb-6 space-y-2.5 mt-2">
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition"
              >
                <FileText className="w-4 h-4 text-gray-400" />
                Download Receipt
              </a>
            )}
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-xl transition"
            >
              <Home className="w-4 h-4" />
              Return to Homepage
            </Link>
          </div>

          {/* Order ID */}
          <div className="px-6 pb-6 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-600">
              Order <span className="font-mono">{internalOrderId.slice(0, 8)}…</span>
            </p>
          </div>
        </div>
      )}

      {/* ── FAILED ── */}
      {status === 'failed' && (
        <div className="w-full text-center px-6 py-8 space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 shadow-lg shadow-red-500/10">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Failed</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">We were unable to process your payment. No charges were made.</p>
          </div>

          <div className="text-left bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 text-red-700 dark:text-red-400 text-xs space-y-2">
            <p className="font-semibold text-sm">Common reasons:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Insufficient funds or daily limit reached</li>
              <li>Incorrect card details or expired card</li>
              <li>Payment window closed before completing</li>
              <li>Bank server timeout — try again in a minute</li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-500/20 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 font-semibold rounded-xl transition hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
            >
              Return Home
            </Link>
          </div>
        </div>
      )}

      {/* ── PENDING ── */}
      {status === 'pending' && (
        <div className="w-full text-center px-6 py-8 space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/20 shadow-lg shadow-amber-500/10">
            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Processing</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
              We are verifying your payment with the bank. This usually takes a few seconds.
            </p>
          </div>

          <Link
            href={`/payment/status?order_id=${order_id}${sub ? `&sub=${sub}` : ''}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-500/20 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh Status
          </Link>
          <p className="text-xs text-gray-400">
            If you were charged, your access will be granted automatically.
          </p>
        </div>
      )}
    </Shell>
  );
}

// ── Sub-components ───────────────────────────────────────────

function Shell({ children, status }: { children: React.ReactNode; status: 'completed' | 'failed' | 'pending' }) {
  const glowColor =
    status === 'completed' ? 'from-emerald-500/10 via-transparent'
    : status === 'failed' ? 'from-red-500/10 via-transparent'
    : 'from-amber-500/10 via-transparent';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0F] p-4">
      <div className="w-full max-w-md">
        {/* Glow backdrop */}
        <div className={`absolute inset-0 flex justify-center pointer-events-none`}>
          <div className={`w-[600px] h-[600px] rounded-full bg-gradient-radial ${glowColor} blur-3xl opacity-60`} />
        </div>

        <div className="relative bg-white dark:bg-[#111118] border border-gray-200 dark:border-gray-800/80 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
          {/* Top accent line */}
          {status === 'completed' && (
            <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />
          )}
          {status === 'failed' && (
            <div className="h-1 w-full bg-gradient-to-r from-red-400 to-rose-500" />
          )}
          {status === 'pending' && (
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />
          )}

          {children}
        </div>

        {/* Powered by */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
          Secured by <span className="font-semibold">DigiOne</span> · Payments via Cashfree
        </p>
      </div>
    </div>
  );
}

function StatusIcon({ type }: { type: 'completed' | 'failed' | 'pending' }) {
  const config = {
    completed: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', shadow: 'shadow-emerald-500/10', icon: <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" /> },
    failed:    { bg: 'bg-red-100 dark:bg-red-500/20', shadow: 'shadow-red-500/10', icon: <XCircle className="w-9 h-9 text-red-600 dark:text-red-400" /> },
    pending:   { bg: 'bg-amber-100 dark:bg-amber-500/20', shadow: 'shadow-amber-500/10', icon: <Clock className="w-9 h-9 text-amber-600 dark:text-amber-400 animate-pulse" /> },
  }[type];

  return (
    <div className={`w-18 h-18 ${config.bg} rounded-full flex items-center justify-center shadow-lg ${config.shadow} mb-5`}>
      {config.icon}
    </div>
  );
}
