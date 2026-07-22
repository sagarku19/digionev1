'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAnalytics } from '@/hooks/analytics/useAnalytics';
import { useProducts } from '@/hooks/products/useProducts';
import { useOrders, type Order } from '@/hooks/commerce/useOrders';
import { useSites } from '@/hooks/sites/useSites';
import { useEarnings } from '@/hooks/commerce/useEarnings';
import { useCreator } from '@/hooks/creator/useCreator';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  DollarSign, Package, TrendingUp, Wallet,
  Plus, Store, ChevronRight, ShoppingBag, AlertCircle, RefreshCw,
  Instagram, Link2, Ticket, Network, Zap, Sparkles,
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

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'C';
}

// Signed percentage change vs the previous period. Undefined when there's no baseline.
function pctChange(cur: number, prev: number): { value: number; isPositive: boolean } | undefined {
  if (prev <= 0) return cur > 0 ? { value: 100, isPositive: true } : undefined;
  const d = ((cur - prev) / prev) * 100;
  return { value: Math.round(d), isPositive: d >= 0 };
}

function inrAxis(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${Math.round(v / 1000)}k`;
  return `₹${v}`;
}

const RANGES = [7, 30, 90] as const;

// Platform growth tools surfaced on the overview (research: sidebar "Grow" group + dashboard-map)
const GROW_TOOLS = [
  { label: 'Instagram Auto DM', desc: 'Auto-reply to comments & DMs', href: '/dashboard/autodm',                icon: Instagram },
  { label: 'Short Links',       desc: 'Trackable branded links',       href: '/dashboard/links',                 icon: Link2 },
  { label: 'Coupons',           desc: 'Discount codes & offers',       href: '/dashboard/marketing/coupons',     icon: Ticket },
  { label: 'Affiliates',        desc: 'Reward partners for sales',     href: '/dashboard/marketing/affiliates',  icon: Network },
  { label: 'Integrations',      desc: 'Email, WhatsApp, Telegram',     href: '/dashboard/integrations',          icon: Zap },
];

const RECENT_INITIAL = 8;
const RECENT_STEP = 20;

// ─── Recent sales feed ────────────────────────────────────────
function ActivityFeed({ orders, loading }: { orders: Order[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="divide-y divide-[var(--border-subtle)]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton rounded="full" className="w-9 h-9 shrink-0" />
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
        description="Sales will appear here as they come in."
      />
    );
  }

  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {orders.map((order) => (
        <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-hover)] transition-colors">
          <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[11px] font-semibold text-[var(--text-secondary)]">
            {initials(order.customer_name || order.customer_email || 'C')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
              {order.customer_name || order.customer_email || 'Customer'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 tabular-nums">
              {formatINR(order.total_amount)} <span className="mx-1">·</span> {timeAgo(order.created_at)}
            </p>
          </div>
          <StatusPill status={order.status} />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function DashboardHome() {
  const [rangeDays, setRangeDays] = useState<(typeof RANGES)[number]>(30);
  const [visibleCount, setVisibleCount] = useState(RECENT_INITIAL);

  const todayKey = new Date().toISOString().split('T')[0];
  const { startISO, endISO } = useMemo(() => {
    const startKey = new Date(new Date().getTime() - rangeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return {
      startISO: `${startKey}T00:00:00.000Z`,
      endISO:   `${todayKey}T23:59:59.999Z`,
    };
  }, [rangeDays, todayKey]);

  const { stats, isLoading: analyticsLoading } = useAnalytics({ start: startISO, end: endISO });
  const { products, isLoading: productsLoading } = useProducts();
  const { orders,   isLoading: ordersLoading   } = useOrders();
  const { sites }                                 = useSites();
  const { creatorBalances, kyc, isLoading: earningsLoading } = useEarnings();
  const { profile } = useCreator();

  const mainSite            = sites?.find((s) => s.site_type === 'main' && s.is_active) ?? sites?.find((s) => s.site_type === 'main');
  const activeProductsCount = products.filter((p) => p.is_published).length;
  const availableBalance    = Math.max(0, creatorBalances?.available_balance ?? 0);

  const revenueTrend = analyticsLoading ? undefined : pctChange(stats.totalRevenue, stats.prevRevenue);
  const salesTrend   = analyticsLoading ? undefined : pctChange(stats.totalSales, stats.prevSales);

  const topProducts = stats.topProducts;
  const maxProductRevenue = topProducts.reduce((m, p) => Math.max(m, p.revenue), 0) || 1;

  const chartData = useMemo(() => {
    if (!stats?.orders) return [];
    return Array.from({ length: rangeDays }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (rangeDays - 1 - i));
      const ds = d.toISOString().split('T')[0];
      const revenue = stats.orders
        .filter((o) => o.created_at?.startsWith(ds) && o.status === 'completed')
        .reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
      return { name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue };
    });
  }, [stats, rangeDays]);

  // ── Setup checklist ──
  const setupSteps = [
    { label: 'Add your first product', done: products.length > 0,               href: '/dashboard/products/new' },
    { label: 'Create your storefront', done: !!mainSite,                        href: '/dashboard/sites/new/store' },
    { label: 'Make your first sale',   done: stats.totalSales > 0 || orders.length > 0, href: '/dashboard/products' },
    { label: 'Complete payout setup',  done: kyc?.status === 'verified',        href: '/dashboard/settings/billing' },
  ];
  const doneCount = setupSteps.filter((s) => s.done).length;
  const remainingSteps = setupSteps.filter((s) => !s.done);

  const firstName = profile?.full_name?.trim().split(' ')[0] ?? '';
  const greeting  = firstName ? `${getGreeting()}, ${firstName}` : getGreeting();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const visibleOrders = orders.slice(0, visibleCount);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Greeting header ── */}
      <PageHeader
        title={greeting}
        description={today}
        action={
          <>
            <Link
              href="/dashboard/sites/new"
              className="inline-flex items-center gap-2 text-sm font-medium bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)] px-3 py-2 rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Store className="w-4 h-4" /> Create site
            </Link>
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center gap-2 text-sm font-medium bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-3 py-2 rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Plus className="w-4 h-4" /> Add product
            </Link>
          </>
        }
      />

      <div className="space-y-6 w-full">
        {/* ── Stat cards ── */}
        <KpiGrid>
          <StatCard
            label={`${rangeDays}-day revenue`}
            value={analyticsLoading ? '—' : formatINR(stats.totalRevenue)}
            icon={DollarSign}
            trend={revenueTrend}
            subValue={revenueTrend ? `vs prev ${rangeDays}d` : undefined}
          />
          <StatCard
            label="Sales"
            value={analyticsLoading ? '—' : stats.totalSales}
            icon={TrendingUp}
            trend={salesTrend}
            subValue={salesTrend ? `vs prev ${rangeDays}d` : undefined}
          />
          <Link
            href="/dashboard/earnings"
            className="block rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <StatCard
              label="Available balance"
              value={earningsLoading ? '—' : formatINR(availableBalance)}
              icon={Wallet}
              subValue="Withdraw →"
            />
          </Link>
          <StatCard
            label="Active products"
            value={productsLoading ? '—' : activeProductsCount}
            icon={Package}
            subValue={productsLoading ? undefined : `${products.length} total`}
          />
        </KpiGrid>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT (2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Revenue chart */}
            <Card>
              <div className="flex items-start justify-between mb-5 gap-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Revenue</h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">Completed orders</p>
                </div>
                <div className="inline-flex p-0.5 gap-0.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-sm)]">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRangeDays(r)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-[6px] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                        rangeDays === r
                          ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {r}D
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end justify-between mb-2 gap-3">
                <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                  {analyticsLoading ? '—' : formatINR(stats.totalRevenue)}
                </div>
                {revenueTrend && (
                  <span className={`inline-flex items-center gap-1 mb-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-sm)] ${
                    revenueTrend.isPositive
                      ? 'bg-[var(--success-bg)] text-[var(--success)]'
                      : 'bg-[var(--danger-bg)] text-[var(--danger)]'
                  }`}>
                    <TrendingUp className="w-3 h-3" />
                    {revenueTrend.isPositive ? '+' : ''}{revenueTrend.value}% this period
                  </span>
                )}
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
                          <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.0} />
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
                        tickFormatter={inrAxis}
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
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[var(--text-tertiary)]" /> Top products
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">· by revenue</span>
                </h2>
                <Link href="/dashboard/products" className="group inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] py-1.5 px-3 rounded-[var(--radius-sm)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  View all <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {analyticsLoading ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <Skeleton rounded="lg" className="w-11 h-11 shrink-0" />
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
                  title="No sales yet"
                  description="Your best-selling products will appear here."
                  action={
                    <Link
                      href="/dashboard/products/new"
                      className="inline-flex items-center gap-1.5 text-sm font-medium bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-3 py-2 rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <Plus className="w-4 h-4" /> Add product
                    </Link>
                  }
                />
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {topProducts.map((p, idx) => (
                    <Link
                      key={p.product_id}
                      href={`/dashboard/products/${p.product_id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--surface-hover)] transition-colors group focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <span className="text-xs font-bold text-[var(--text-tertiary)] w-4 shrink-0 text-center tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                          {p.name}
                        </p>
                        <div className="h-1.5 rounded-full bg-[var(--surface-muted)] mt-2 overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.round((p.revenue / maxProductRevenue) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold text-[var(--text-primary)] tabular-nums">{formatINR(p.revenue)}</p>
                        <p className="text-[11px] text-[var(--text-tertiary)] tabular-nums mt-0.5">{p.sales} sale{p.sales !== 1 ? 's' : ''}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT (1/3) */}
          <div className="space-y-6">

            {/* Setup checklist */}
            {remainingSteps.length > 0 && (
              <Card padded="sm" className="!bg-[var(--warning-bg)] !border-[var(--warning)]/20">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-[52px] h-[52px] rounded-full grid place-items-center shrink-0"
                    style={{ background: `conic-gradient(var(--brand) ${(doneCount / setupSteps.length) * 100}%, var(--surface-muted) 0)` }}
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--surface)] grid place-items-center text-xs font-bold text-[var(--text-primary)] tabular-nums">
                      {doneCount}/{setupSteps.length}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-[var(--warning)]" /> Finish setting up
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {remainingSteps.length} step{remainingSteps.length !== 1 ? 's' : ''} left before you&apos;re fully live.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {remainingSteps.map((t) => (
                    <Link
                      key={t.href}
                      href={t.href}
                      className="group flex items-center gap-3 bg-[var(--surface)] hover:bg-[var(--surface-hover)] px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--border)] transition-all text-sm font-medium text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] shrink-0" />
                      <span className="flex-1">{t.label}</span>
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {/* Grow your store — platform tools */}
            <Card>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--brand)]" /> Grow your store
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Tools to sell more &amp; automate</p>
              <div className="mt-3 space-y-1">
                {GROW_TOOLS.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    className="group flex items-center gap-3 px-2 py-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-hover)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] grid place-items-center text-[var(--text-secondary)] group-hover:text-[var(--brand)] transition-colors shrink-0">
                      <t.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{t.label}</p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">{t.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </Card>

            {/* Live activity feed */}
            <Card padded={false}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[var(--text-tertiary)]" /> Recent sales
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--success-bg)] text-[var(--success)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                    Live
                  </span>
                </h2>
              </div>
              <ActivityFeed orders={visibleOrders} loading={ordersLoading} />
              {!ordersLoading && orders.length > 0 && (
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">
                    Showing {visibleOrders.length} of {orders.length}
                  </span>
                  <div className="flex items-center gap-2">
                    {visibleCount < orders.length && (
                      <button
                        onClick={() => setVisibleCount((v) => v + RECENT_STEP)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Load {RECENT_STEP} more
                      </button>
                    )}
                    <Link
                      href="/dashboard/orders"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      View all orders <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
