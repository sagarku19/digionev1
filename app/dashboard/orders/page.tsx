'use client';
// Orders dashboard — all orders for this creator with detail drawer.

import React, { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import {
  ShoppingBag, CheckCircle2, XCircle, Clock, Search,
  ChevronRight, X, Package, Mail, Phone, Calendar,
  Download, TrendingUp, RotateCcw,
} from 'lucide-react';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  pending:   { label: 'Pending',   icon: Clock,         cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  failed:    { label: 'Failed',    icon: XCircle,       cls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  refunded:  { label: 'Refunded',  icon: RotateCcw,     cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  cancelled: { label: 'Cancelled', icon: XCircle,       cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function OrderDrawer({ order, onClose }: { order: any; onClose: () => void }) {
  const products = order.order_items ?? [];
  const receiptUrl = `/payment/receipt?order_id=${order.id}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#0D0E1A] w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#0D0E1A] border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order</p>
            <p className="font-mono text-sm text-gray-900 dark:text-white font-semibold">{order.id.slice(0, 8)}…</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Status + Amount */}
          <div className="flex items-center justify-between">
            <StatusBadge status={order.status} />
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{formatINR(Number(order.total_amount))}</span>
          </div>

          {/* Customer */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Customer</p>
            <div className="space-y-2">
              {order.customer_name && (
                <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center font-bold text-sm text-[var(--text-primary)] shrink-0">
                    {order.customer_name[0]?.toUpperCase()}
                  </div>
                  <span className="font-semibold">{order.customer_name}</span>
                </div>
              )}
              {order.customer_email && (
                <div className="flex items-center gap-2.5 text-sm text-gray-500">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>{order.customer_email}</span>
                </div>
              )}
              {order.customer_phone && (
                <div className="flex items-center gap-2.5 text-sm text-gray-500">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{order.customer_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          {products.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Products</p>
              {products.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    {item.products?.thumbnail_url ? (
                      <img src={item.products.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.products?.name ?? 'Product'}</p>
                    <p className="text-xs text-gray-500">{formatINR(Number(item.price_at_purchase))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Order Meta */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Details</p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                { label: 'Order ID', value: order.id },
                { label: 'Gateway ID', value: order.gateway_order_id ?? '—' },
                { label: 'Payment ID', value: order.gateway_payment_id ?? '—' },
                { label: 'Date', value: new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                ...(order.payment_verified_at ? [{ label: 'Verified At', value: new Date(order.payment_verified_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2.5 text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-mono text-xs text-gray-900 dark:text-white text-right max-w-[200px] truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        {order.status === 'completed' && (
          <div className="sticky bottom-0 bg-white dark:bg-[#0D0E1A] border-t border-gray-200 dark:border-gray-800 p-4">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] font-semibold rounded-xl transition text-sm"
            >
              <Download className="w-4 h-4" />
              Download Receipt
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { orders, isLoading } = useOrders();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<any>(null);

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || o.customer_email?.toLowerCase().includes(q)
      || o.customer_name?.toLowerCase().includes(q)
      || o.id.includes(q);
    return matchStatus && matchSearch;
  });

  const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total_amount), 0);
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{orders.length} total orders across all your sites</p>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && orders.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Revenue', value: formatINR(totalRevenue), icon: TrendingUp, cls: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Completed', value: completedCount, icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Pending', value: pendingCount, icon: Clock, cls: 'text-amber-600 dark:text-amber-400' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.cls}`} />
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or order ID…"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'completed', 'pending', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition capitalize ${
                statusFilter === s
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-[var(--accent)]'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mb-5">
            <ShoppingBag className="w-10 h-10 text-[var(--text-secondary)]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No orders yet</h2>
          <p className="text-gray-500 text-sm max-w-xs">Orders will appear here once buyers complete purchases from your sites.</p>
        </div>
      )}

      {/* Orders list */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span>Customer</span>
            <span>Products</span>
            <span>Amount</span>
            <span>Status</span>
            <span />
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map(order => {
              const products = order.order_items ?? [];
              const productNames = products.map((i: any) => i.products?.name).filter(Boolean);

              return (
                <button
                  key={order.id}
                  onClick={() => setSelected(order)}
                  className="w-full grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 transition"
                >
                  {/* Customer */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center font-bold text-sm text-[var(--text-primary)] shrink-0">
                      {(order.customer_name ?? order.customer_email ?? '?')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{order.customer_name || '—'}</p>
                      <p className="text-xs text-gray-500 truncate">{order.customer_email}</p>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {productNames.length > 0 ? productNames.join(', ') : '—'}
                    </span>
                  </div>

                  {/* Amount */}
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatINR(Number(order.total_amount))}
                  </span>

                  {/* Status */}
                  <StatusBadge status={order.status} />

                  {/* Chevron + time */}
                  <div className="flex items-center gap-3 text-gray-400 shrink-0">
                    <span className="text-xs hidden xl:block">{timeAgo(order.created_at)}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && orders.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No orders match your search.
          <button onClick={() => { setSearch(''); setStatusFilter('all'); }} className="ml-2 text-[var(--text-secondary)] hover:underline">Clear filters</button>
        </div>
      )}

      {/* Detail drawer */}
      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
