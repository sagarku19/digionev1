'use client';
// Orders dashboard — all orders for this creator with detail drawer.

import React, { useState, useMemo } from 'react';
import { useOrders, useRefundOrder, useOrderRefundInfo, type Order } from '@/hooks/commerce/useOrders';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ShoppingBag, CheckCircle2, XCircle, Clock, Search,
  ChevronRight, X, Package, Mail, Phone, Calendar,
  Download, TrendingUp, RotateCcw, FileDown,
} from 'lucide-react';
import { formatINR } from '@/lib/format';
import { computeRefundSplit } from '@/lib/shared/refund-math';

function exportOrdersCSV(orders: ReturnType<typeof useOrders>['orders']) {
  const header = ['Order ID', 'Customer Name', 'Customer Email', 'Customer Phone', 'Amount', 'Status', 'Products', 'Date'];
  const rows = orders.map(o => [
    o.id,
    o.customer_name ?? '',
    o.customer_email ?? '',
    o.customer_phone ?? '',
    o.total_amount,
    o.status,
    (o.order_items ?? []).map((i) => i.products?.name ?? '').filter(Boolean).join('; '),
    new Date(o.created_at).toLocaleDateString('en-IN'),
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'bg-[var(--success-bg)] text-[var(--success)]' },
  pending:   { label: 'Pending',   icon: Clock,         cls: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
  failed:    { label: 'Failed',    icon: XCircle,       cls: 'bg-[var(--danger-bg)] text-[var(--danger)]' },
  refunded:  { label: 'Refunded',  icon: RotateCcw,     cls: 'bg-[var(--surface-muted)] text-[var(--text-secondary)]' },
  cancelled: { label: 'Cancelled', icon: XCircle,       cls: 'bg-[var(--surface-muted)] text-[var(--text-secondary)]' },
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

function RefundPanel({ order, onClose }: { order: Order; onClose: () => void }) {
  const { data: info, isLoading } = useOrderRefundInfo(order.id);
  const refundOrder = useRefundOrder();
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const total = Number(order.total_amount);
  const remaining = info ? Math.round((total - info.priorAmount) * 100) / 100 : total;
  const amount = amountStr === '' ? remaining : Number(amountStr);

  let preview: { netClawback: number; feeReversed: number } | null = null;
  let previewError = '';
  if (info?.hasLedger && Number.isFinite(amount)) {
    try {
      preview = computeRefundSplit(total, info.fee, amount, info.priorAmount, info.priorFeeReversed);
    } catch (e) {
      previewError = e instanceof Error ? e.message : 'Invalid amount';
    }
  }

  const blocked = isLoading || !info?.hasLedger || info?.hasProcessing || remaining < 1;
  const blockedMessage = !isLoading && info
    ? !info.hasLedger
      ? 'This order is missing its sale record — contact support to refund it.'
      : info.hasProcessing
        ? 'A refund for this order is already processing.'
        : remaining < 1
          ? 'This order is fully refunded.'
          : ''
    : '';

  const submit = async () => {
    setError('');
    try {
      await refundOrder.mutateAsync({
        orderId: order.id,
        ...(amountStr === '' ? {} : { amount }),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refund failed.');
    }
  };

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">Refund this order</p>
      {blocked ? (
        <p className="text-sm text-[var(--text-secondary)]">{isLoading ? 'Loading…' : blockedMessage}</p>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Amount (max {formatINR(remaining)})
            </label>
            <input
              type="number"
              min={1}
              max={remaining}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder={String(remaining)}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being refunded?"
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow"
            />
          </div>
          {preview && (
            <p className="text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--danger)]">{formatINR(preview.netClawback)}</span> will be
              deducted from your balance. The {formatINR(preview.feeReversed)} platform fee on this portion is returned.
            </p>
          )}
          {previewError && <p className="text-xs text-[var(--danger)]">{previewError}</p>}
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!preview || refundOrder.isPending}
            className="w-full py-2.5 bg-[var(--danger)] hover:opacity-90 text-[var(--text-on-brand)] font-semibold rounded-[var(--radius-sm)] transition text-sm disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {refundOrder.isPending ? 'Processing…' : `Refund ${Number.isFinite(amount) ? formatINR(amount) : ''}`}
          </button>
          <ConfirmDialog
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={submit}
            title="Refund this order?"
            description={`The buyer gets ${Number.isFinite(amount) ? formatINR(amount) : ''} back to their original payment method (5–7 days). ${preview ? `${formatINR(preview.netClawback)} will be deducted from your balance and held until the refund completes.` : ''} This cannot be undone.`}
            confirmLabel="Refund"
            isDestructive
          />
        </>
      )}
    </div>
  );
}

function OrderDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const products = order.order_items ?? [];
  const receiptUrl = `/payment/receipt?order_id=${order.id}`;
  const [showRefund, setShowRefund] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--surface)] w-full max-w-md h-full overflow-y-auto shadow-[var(--shadow-lg)] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Order</p>
            <p className="font-mono text-sm text-[var(--text-primary)] font-semibold">{order.id.slice(0, 8)}…</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Status + Amount */}
          <div className="flex items-center justify-between">
            <StatusBadge status={order.status} />
            <span className="text-2xl font-extrabold text-[var(--text-primary)]">{formatINR(Number(order.total_amount))}</span>
          </div>

          {/* Customer */}
          <div className="bg-[var(--surface-muted)] rounded-[var(--radius-lg)] p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">Customer</p>
            <div className="space-y-2">
              {order.customer_name && (
                <div className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] flex items-center justify-center font-bold text-sm text-[var(--text-primary)] shrink-0">
                    {order.customer_name[0]?.toUpperCase()}
                  </div>
                  <span className="font-semibold">{order.customer_name}</span>
                </div>
              )}
              {order.customer_email && (
                <div className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>{order.customer_email}</span>
                </div>
              )}
              {order.customer_phone && (
                <div className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{order.customer_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          {products.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">Products</p>
              {products.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[var(--surface-muted)] rounded-[var(--radius-sm)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center shrink-0">
                    {item.products?.thumbnail_url ? (
                      <img src={item.products.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.products?.name ?? 'Product'}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{formatINR(Number(item.price_at_purchase))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Order Meta */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">Details</p>
            <div className="divide-y divide-[var(--border-subtle)]">
              {[
                { label: 'Order ID', value: order.id },
                { label: 'Gateway ID', value: order.gateway_order_id ?? '—' },
                { label: 'Payment ID', value: order.gateway_payment_id ?? '—' },
                { label: 'Date', value: new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                ...(order.payment_verified_at ? [{ label: 'Verified At', value: new Date(order.payment_verified_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2.5 text-sm">
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span className="font-mono text-xs text-[var(--text-primary)] text-right max-w-[200px] truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        {order.status === 'completed' && (
          <div className="sticky bottom-0 bg-[var(--surface)]">
            {showRefund && <RefundPanel order={order} onClose={onClose} />}
            <div className="border-t border-[var(--border)] p-4 space-y-2">
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] font-semibold rounded-[var(--radius-sm)] transition text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Download className="w-4 h-4" />
                Download Receipt
              </a>
              {order.gateway_payment_id && (
                <button
                  onClick={() => setShowRefund((v) => !v)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger-bg)] font-semibold rounded-[var(--radius-sm)] transition text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <RotateCcw className="w-4 h-4" />
                  {showRefund ? 'Hide refund' : 'Refund order'}
                </button>
              )}
            </div>
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => orders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || o.customer_email?.toLowerCase().includes(q)
      || o.customer_name?.toLowerCase().includes(q)
      || o.id.includes(q);
    const orderDate = o.created_at.split('T')[0];
    const matchFrom = !dateFrom || orderDate >= dateFrom;
    const matchTo = !dateTo || orderDate <= dateTo;
    return matchStatus && matchSearch && matchFrom && matchTo;
  }), [orders, statusFilter, search, dateFrom, dateTo]);

  const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total_amount), 0);
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  const todayRevenue = useMemo(() => orders
    .filter(o => o.status === 'completed' && o.created_at.startsWith(todayStr))
    .reduce((s, o) => s + Number(o.total_amount), 0), [orders, todayStr]);

  const todayCount = useMemo(() => orders.filter(o => o.created_at.startsWith(todayStr)).length, [orders, todayStr]);

  const hasDateFilter = dateFrom || dateTo;

  const exportButton = orders.length > 0 ? (
    <button
      onClick={() => exportOrdersCSV(filtered)}
      className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold transition shrink-0 shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <FileDown className="w-4 h-4" />
      Export CSV
    </button>
  ) : undefined;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Orders"
        description={`${orders.length} total orders across all your sites`}
        action={exportButton}
      />

      {/* Today's summary card */}
      {!isLoading && orders.length > 0 && (
        <div className="bg-[var(--brand)]/8 border border-[var(--brand)]/20 rounded-[var(--radius-lg)] p-5 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--brand)]/15 rounded-[var(--radius-sm)] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[var(--brand)]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--brand)] uppercase tracking-wide">Today</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
            </div>
          </div>
          <div className="flex gap-6 flex-wrap">
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">Revenue today</p>
              <p className="text-lg font-extrabold text-[var(--brand)]">{formatINR(todayRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">Orders today</p>
              <p className="text-lg font-extrabold text-[var(--text-primary)]">{todayCount}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">Pending</p>
              <p className="text-lg font-extrabold text-[var(--warning)]">{pendingCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {!isLoading && orders.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Revenue', value: formatINR(totalRevenue), icon: TrendingUp, cls: 'text-[var(--success)]' },
            { label: 'Completed', value: completedCount, icon: CheckCircle2, cls: 'text-[var(--success)]' },
            { label: 'Pending', value: pendingCount, icon: Clock, cls: 'text-[var(--warning)]' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-xs)]">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.cls}`} />
                <p className="text-xs font-medium text-[var(--text-secondary)]">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)]">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or order ID…"
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] focus:border-[var(--border-strong)]"
          />
        </div>
        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            max={dateTo || todayStr}
            className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] focus:border-[var(--border-strong)] cursor-pointer"
          />
          <span className="text-[var(--text-tertiary)] text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            min={dateFrom}
            max={todayStr}
            className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] focus:border-[var(--border-strong)] cursor-pointer"
          />
          {hasDateFilter && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              title="Clear date filter"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {['all', 'completed', 'pending', 'failed', 'refunded'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition capitalize focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                statusFilter === s
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
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
            <Skeleton key={i} className="h-16 w-full" rounded="lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && orders.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Orders will appear here once buyers complete purchases from your sites."
        />
      )}

      {/* Orders list */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-xs)]">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            <span>Customer</span>
            <span>Products</span>
            <span>Amount</span>
            <span>Status</span>
            <span />
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {filtered.map(order => {
              const products = order.order_items ?? [];
              const productNames = products.map((i) => i.products?.name).filter(Boolean);

              return (
                <button
                  key={order.id}
                  onClick={() => setSelected(order)}
                  className="w-full grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-5 py-4 text-left hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  {/* Customer */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)] flex items-center justify-center font-bold text-sm text-[var(--text-primary)] shrink-0">
                      {(order.customer_name ?? order.customer_email ?? '?')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{order.customer_name || '—'}</p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{order.customer_email}</p>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Package className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                    <span className="text-xs text-[var(--text-secondary)] truncate">
                      {productNames.length > 0 ? productNames.join(', ') : '—'}
                    </span>
                  </div>

                  {/* Amount */}
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {formatINR(Number(order.total_amount))}
                  </span>

                  {/* Status */}
                  <StatusBadge status={order.status} />

                  {/* Chevron + time */}
                  <div className="flex items-center gap-3 text-[var(--text-tertiary)] shrink-0">
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
        <div className="text-center py-12 text-[var(--text-secondary)]">
          No orders match your search.
          <button onClick={() => { setSearch(''); setStatusFilter('all'); }} className="ml-2 text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Clear filters</button>
        </div>
      )}

      {/* Detail drawer */}
      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
