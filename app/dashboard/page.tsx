'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useProducts } from '@/hooks/useProducts';
import { useOrders, type Order } from '@/hooks/useOrders';
import { useSites } from '@/hooks/useSites';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  DollarSign, Package, ShoppingCart, TrendingUp,
  ArrowUpRight, Plus, Zap, Store, ChevronRight,
  ShoppingBag, User2, AlertCircle, CreditCard,
  Layers,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatINR } from '@/lib/format';

// ─── Helpers ─────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Activity Feed ────────────────────────────────────────────
function ActivityFeed({ orders, loading }: { orders: Order[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-0 divide-y divide-[var(--border-subtle)]">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton rounded="full" className="w-10 h-10 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="No orders yet"
        description="Orders will appear here live once active."
      />
    );
  }

  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {orders.slice(0, 8).map((order) => {
        const isSuccess = order.status === 'completed' || order.status === 'success';
        const isPending = order.status === 'pending';
        return (
          <div key={order.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--surface-hover)] transition-colors">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              isSuccess ? 'bg-[var(--success-bg)]'
              : isPending ? 'bg-[var(--warning-bg)]'
              : 'bg-[var(--danger-bg)]'
            }`}>
              <ShoppingBag className={`w-4 h-4 ${
                isSuccess ? 'text-[var(--success)]'
                : isPending ? 'text-[var(--warning)]'
                : 'text-[var(--danger)]'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                {order.customer_name || order.customer_email || 'Customer'}
              </p>
              <p className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5">
                {formatINR(order.total_amount)} <span className="mx-1.5">•</span> {timeAgo(order.created_at)}
              </p>
            </div>
            <StatusPill status={order.status} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Quick Actions ────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Add Product',  href: '/dashboard/products/new',         icon: Package },
  { label: 'Main Store',   href: '/dashboard/sites/new/store',      icon: Store },
  { label: 'Payment Link', href: '/dashboard/sites/new/payment',    icon: CreditCard },
  { label: 'Product Site', href: '/dashboard/sites/new/singlepage', icon: Layers },
];

// ─── Page ─────────────────────────────────────────────────────
export default function DashboardHome() {
  // Stable date strings keyed to today's date — same value on every mount within the same day
  const todayKey = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoKey = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startISO = `${thirtyDaysAgoKey}T00:00:00.000Z`;
  const endISO   = `${todayKey}T23:59:59.999Z`;

  const { stats, isLoading: analyticsLoading } = useAnalytics({
    start: startISO,
    end:   endISO,
  });
  const { products, isLoading: productsLoading } = useProducts();
  const { orders,   isLoading: ordersLoading   } = useOrders(20);
  const { sites }                                 = useSites();

  const mainSite            = sites?.find(s => s.site_type === 'main' && s.is_active) ?? sites?.find(s => s.site_type === 'main');
  const activeProductsCount = products.filter((p) => p.is_published).length;
  const topProducts         = useMemo(() => products.filter((p) => p.is_published).slice(0, 5), [products]);

  const chartData = useMemo(() => {
    if (!stats?.orders) return [];
    return Array.from({ length: 30 }, (_, i) => {
      const d  = new Date();
      d.setDate(d.getDate() - (29 - i));
      const ds = d.toISOString().split('T')[0];
      const revenue = stats.orders
        .filter((o) => o.created_at?.startsWith(ds) && o.status === 'completed')
        .reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
      return { name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue };
    });
  }, [stats]);

  const todos = [
    !mainSite              && { label: 'Create your main store',    href: '/dashboard/sites/new/store'  },
    activeProductsCount === 0 && { label: 'Add your first product', href: '/dashboard/products/new' },
  ].filter(Boolean) as { label: string; href: string }[];

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const mainSiteUrl = mainSite ? getSitePublicPath(mainSite) : null;
  const mainSiteDisplayUrl = mainSite ? getSiteDisplayUrl(mainSite) : null;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Greeting header ── */}
      <PageHeader title={getGreeting()} description={today} />

      <div className="space-y-6 w-full">
        {/* ── Stat cards ── */}
        <KpiGrid>
          <StatCard
            label="30-Day Revenue"
            value={analyticsLoading ? '—' : formatINR(stats.totalRevenue)}
            icon={DollarSign}
          />
          <StatCard
            label="Total Sales"
            value={analyticsLoading ? '—' : stats.totalSales}
            icon={TrendingUp}
          />
          <StatCard
            label="Active Products"
            value={productsLoading ? '—' : activeProductsCount}
            icon={Package}
            subValue={productsLoading ? undefined : `${products.length} total`}
          />
          <StatCard
            label="Lifetime Orders"
            value={ordersLoading ? '—' : orders.length >= 50 ? '50+' : orders.length}
            icon={ShoppingCart}
          />
        </KpiGrid>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEFT (2/3) */}
          <div className="xl:col-span-2 space-y-6">

            {/* Revenue chart */}
            <Card>
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Revenue</h2>
                  <p className="text-sm font-medium text-[var(--text-secondary)] mt-0.5">Last 30 days · completed orders</p>
                </div>
                <div className="text-right">
                  {analyticsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-7 w-28 ml-auto" />
                      <Skeleton className="h-3.5 w-20 ml-auto" />
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {formatINR(stats.totalRevenue)}
                      </p>
                      <p className="text-xs font-bold text-[var(--success)] flex items-center justify-end gap-1 mt-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {stats.totalSales} completed sale{stats.totalSales !== 1 ? 's' : ''}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="h-[260px] min-w-0 w-full">
                {analyticsLoading ? (
                  <Skeleton className="h-[260px] w-full" />
                ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="var(--brand)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 500 }}
                      tickLine={false} axisLine={false} minTickGap={30}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 500 }}
                      tickFormatter={v => `₹${v}`}
                      tickLine={false} axisLine={false} width={56}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-md)',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        fontWeight: 500,
                        padding: '8px 12px',
                      }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      formatter={(v) => [formatINR(Number(v)), 'Revenue']}
                      cursor={{ stroke: 'var(--brand)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone" dataKey="revenue"
                      stroke="var(--brand)" strokeWidth={2}
                      fill="url(#revGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: 'var(--brand)', stroke: 'var(--surface)', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Top Products */}
            <Card padded={false}>
              <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--border-subtle)]">
                <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[var(--text-secondary)]" /> Top Performing Products
                </h2>
                <Link href="/dashboard/products" className="group flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] py-1.5 px-3 rounded-[var(--radius-sm)] transition-colors">
                  View all <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {productsLoading ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                      <Skeleton rounded="lg" className="w-12 h-12 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : topProducts.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No products yet"
                  description="Add your first product to see it here."
                  action={
                    <Link
                      href="/dashboard/products/new"
                      className="inline-flex items-center gap-1.5 text-sm font-medium bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-3 py-2 rounded-[var(--radius-sm)] transition"
                    >
                      <Plus className="w-4 h-4" /> Add Product
                    </Link>
                  }
                />
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {topProducts.map((p, idx) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/products/${p.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--surface-hover)] transition-colors group"
                    >
                      <span className="text-xs font-extrabold text-[var(--text-tertiary)] w-4 shrink-0 text-center">
                        {idx + 1}
                      </span>
                      <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-muted)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                          {p.name}
                        </p>
                        <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">{p.price === 0 ? 'Free' : formatINR(p.price)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT (1/3) */}
          <div className="space-y-6">

            {/* Setup to-do */}
            {todos.length > 0 && (
              <Card className="!bg-[var(--warning-bg)] !border-[var(--warning)]/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[var(--warning)]/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-[var(--warning)]" />
                  </div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Setup Required</h2>
                </div>
                <div className="space-y-2">
                  {todos.map(t => (
                    <Link
                      key={t.href}
                      href={t.href}
                      className="group flex items-center gap-3 bg-[var(--surface)] hover:bg-[var(--surface-hover)] px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--border)] transition-all text-sm font-medium text-[var(--text-primary)]"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] shrink-0" />
                      <span className="flex-1">{t.label}</span>
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {/* Live activity feed */}
            <Card padded={false}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-[var(--text-tertiary)]" /> Recent Sales
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--success-bg)] text-[var(--success)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                    Live
                  </span>
                </div>
                <Link href="/dashboard/earnings" className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors">
                  View all
                </Link>
              </div>
              <ActivityFeed orders={orders} loading={ordersLoading} />
            </Card>

            {/* Quick actions */}
            <Card>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--text-tertiary)]" /> Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map(a => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group flex flex-col items-center gap-2 py-4 px-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-center justify-center group-hover:bg-[var(--surface)] transition-colors">
                      <a.icon className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--brand)] transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-secondary)] text-center leading-tight group-hover:text-[var(--text-primary)] transition-colors">
                      {a.label}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
