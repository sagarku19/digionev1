'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useSites } from '@/hooks/useSites';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  DollarSign, Package, ShoppingCart, TrendingUp,
  ArrowUpRight, Plus, Zap, Store, ChevronRight,
  ShoppingBag, User2, AlertCircle, CreditCard,
  Layers,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

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
function ActivityFeed({ orders, loading }: { orders: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-0 divide-y divide-gray-100 dark:divide-zinc-800/50">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded w-2/3" />
              <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4 opacity-70">
        <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-zinc-900 flex items-center justify-center mb-4 shadow-inner">
          <ShoppingBag className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm font-bold text-gray-600 dark:text-[var(--text-secondary)]">No orders yet</p>
        <p className="text-xs font-medium text-gray-400 mt-1">Orders will appear here live once active</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
      {orders.slice(0, 8).map((order: any) => {
        const isSuccess = order.status === 'completed' || order.status === 'success';
        const isPending = order.status === 'pending';
        return (
          <div key={order.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              isSuccess ? 'bg-emerald-50 dark:bg-emerald-500/10'
              : isPending ? 'bg-amber-50 dark:bg-amber-500/10'
              : 'bg-red-50 dark:bg-red-500/10'
            }`}>
              <ShoppingBag className={`w-4 h-4 ${
                isSuccess ? 'text-emerald-500'
                : isPending ? 'text-amber-500'
                : 'text-red-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {order.customer_name || order.customer_email || 'Customer'}
              </p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                {formatINR(order.total_amount)} <span className="mx-1.5">•</span> {timeAgo(order.created_at)}
              </p>
            </div>
            <div className="scale-90 opacity-90"><StatusPill status={order.status} /></div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Quick Actions ────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Add Product',   href: '/dashboard/products/new',         icon: Package,    bg: 'bg-white dark:bg-zinc-900',  fg: 'text-gray-800 dark:text-[var(--text-primary)]'  },
  { label: 'Main Store',    href: '/dashboard/sites/new/store',      icon: Store,      bg: 'bg-gray-100 dark:bg-[var(--bg-secondary)]',  fg: 'text-gray-700 dark:text-[var(--text-secondary)]'  },
  { label: 'Payment Link',  href: '/dashboard/sites/new/payment',    icon: CreditCard, bg: 'bg-emerald-50 dark:bg-emerald-500/10', fg: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Product Site',  href: '/dashboard/sites/new/singlepage', icon: Layers,     bg: 'bg-purple-50 dark:bg-purple-500/10',        fg: 'text-purple-600 dark:text-purple-400'        },
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
  const activeProductsCount = products.filter((p: any) => p.is_published).length;
  const topProducts         = useMemo(() => products.filter((p: any) => p.is_published).slice(0, 5), [products]);

  const chartData = useMemo(() => {
    if (!stats?.orders) return [];
    return Array.from({ length: 30 }, (_, i) => {
      const d  = new Date();
      d.setDate(d.getDate() - (29 - i));
      const ds = d.toISOString().split('T')[0];
      const revenue = stats.orders
        .filter((o: any) => o.created_at?.startsWith(ds) && o.status === 'completed')
        .reduce((acc: number, o: any) => acc + (Number(o.total_amount) || 0), 0);
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
    <div className="relative pt-6 pb-16 min-h-screen">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[0%] left-[10%] w-[40%] h-[40%] bg-gray-1000/5 dark:bg-gray-1000/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] bg-purple-500/5 dark:bg-purple-500/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="space-y-8 max-w-[1400px] mx-auto">
        {/* ── Greeting header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="relative inline-block">
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {getGreeting()}
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-1">{today}</p>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            label="30-Day Revenue"
            value={analyticsLoading ? '—' : formatINR(stats.totalRevenue)}
            icon={DollarSign}
            className="delay-0"
          />
          <StatCard
            label="Total Sales"
            value={analyticsLoading ? '—' : stats.totalSales}
            icon={TrendingUp}
            className="delay-75"
          />
          <StatCard
            label="Active Products"
            value={productsLoading ? '—' : activeProductsCount}
            icon={Package}
            subValue={productsLoading ? undefined : `${products.length} total`}
            className="delay-150"
          />
          <StatCard
            label="Lifetime Orders"
            value={ordersLoading ? '—' : orders.length >= 50 ? '50+' : orders.length}
            icon={ShoppingCart}
            className="delay-200"
          />
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">

          {/* LEFT (2/3) */}
          <div className="xl:col-span-2 space-y-6 md:space-y-8">

            {/* Revenue chart */}
            <div className="group bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl border border-gray-200/80 dark:border-zinc-800/80 rounded-[32px] p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Revenue</h2>
                  <p className="text-sm font-medium text-gray-500 mt-0.5">Last 30 days · completed orders</p>
                </div>
                <div className="text-right">
                  {analyticsLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-7 w-28 bg-gray-200 dark:bg-zinc-800 rounded-lg ml-auto" />
                      <div className="h-3.5 w-20 bg-gray-100 dark:bg-zinc-800/60 rounded ml-auto" />
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        {formatINR(stats.totalRevenue)}
                      </p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 mt-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {stats.totalSales} completed sale{stats.totalSales !== 1 ? 's' : ''}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="h-[260px] min-w-0 w-full">
                {analyticsLoading ? (
                  <div className="h-full w-full rounded-2xl bg-gray-100 dark:bg-zinc-900/60 animate-pulse" />
                ) : null}
                <ResponsiveContainer width="100%" height="100%" minWidth={0} style={analyticsLoading ? { display: 'none' } : {}}>
                  <AreaChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#6366F1" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0.0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-zinc-800/80" opacity={0.6} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }}
                      tickLine={false} axisLine={false} minTickGap={30}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }}
                      tickFormatter={v => `₹${v}`}
                      tickLine={false} axisLine={false} width={56}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'white',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                        padding: '10px 14px'
                      }}
                      itemStyle={{ color: '#e5e7eb' }}
                      formatter={(v: any) => [formatINR(Number(v)), 'Revenue']}
                      cursor={{ stroke: '#6366F1', strokeWidth: 2, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone" dataKey="revenue"
                      stroke="#6366F1" strokeWidth={3}
                      fill="url(#revGrad)"
                      dot={false}
                      activeDot={{ r: 6, fill: '#6366F1', stroke: '#fff', strokeWidth: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl border border-gray-200/80 dark:border-zinc-800/80 rounded-[32px] overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30">
                <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-600 dark:text-[var(--text-secondary)]" /> Top Performaing Products
                </h2>
                <Link href="/dashboard/products" className="group flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-white dark:bg-zinc-900 py-1.5 px-3 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                  View all <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {productsLoading ? (
                <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-gray-100 dark:bg-zinc-800 rounded w-1/3" />
                        <div className="h-2.5 bg-gray-100 dark:bg-zinc-800 rounded w-1/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : topProducts.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3 opacity-80">
                  <Package className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-1" />
                  <p className="text-sm font-bold text-gray-500">No products yet</p>
                  <Link
                    href="/dashboard/products/new"
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-[var(--text-secondary)] bg-gray-100 dark:bg-[var(--bg-secondary)] px-4 py-2 rounded-xl border border-indigo-100 dark:border-gray-900 dark:border-white/20 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Product
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                  {topProducts.map((p: any, idx: number) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/products/${p.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      <span className="text-xs font-extrabold text-gray-400 dark:text-gray-600 w-4 shrink-0 text-center">
                        {idx + 1}
                      </span>
                      <div className="w-12 h-12 rounded-[14px] bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {p.name}
                        </p>
                        <p className="text-xs font-medium text-gray-500 mt-1">{p.price === 0 ? 'Free' : formatINR(p.price)}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-900 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-1000/10 transition-colors border border-transparent group-hover:border-indigo-100 dark:group-hover:border-gray-900 dark:border-white/20">
                         <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors shrink-0 translate-x-[1px]" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT (1/3) */}
          <div className="space-y-6 md:space-y-8">

            {/* Setup to-do */}
            {todos.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border-2 border-amber-200/50 dark:border-amber-500/20 rounded-[24px] p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-2xl rounded-full -mr-10 -mt-10" />
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-base font-extrabold text-amber-900 dark:text-amber-100">Setup Required</h2>
                </div>
                <div className="space-y-2.5 relative z-10">
                  {todos.map(t => (
                    <Link
                      key={t.href}
                      href={t.href}
                      className="group flex items-center gap-3 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-amber-100 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-500/50 hover:bg-white dark:hover:bg-zinc-900/80 transition-all text-sm font-bold text-amber-800 dark:text-amber-200"
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0 group-hover:scale-125 transition-transform" />
                      {t.label}
                      <ChevronRight className="w-4 h-4 ml-auto text-amber-400 group-hover:text-amber-600 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Live activity feed */}
            <div className="bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl border border-gray-200/80 dark:border-zinc-800/80 rounded-[32px] overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-extrabold text-[var(--text-primary)] inline-flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-gray-400" /> Recent Sales
                  </h2>
                  <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 uppercase tracking-widest px-2.5 py-1 rounded-full shadow-inner border border-emerald-200/50 dark:border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
                <Link href="/dashboard/earnings" className="text-xs font-bold text-gray-400 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition bg-gray-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800">
                  View All
                </Link>
              </div>
              <ActivityFeed orders={orders} loading={ordersLoading} />
            </div>

            {/* Quick actions */}
            <div className="bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl border border-gray-200/80 dark:border-zinc-800/80 rounded-[32px] p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-[var(--text-primary)] mb-5 flex items-center gap-2">
                 <Zap className="w-4 h-4 text-gray-600 dark:text-[var(--text-secondary)]" /> Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map(a => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl border-2 border-gray-100 dark:border-zinc-800/80 hover:border-indigo-200 dark:hover:border-gray-900 dark:border-white/30 bg-white/50 dark:bg-zinc-900/20 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${a.bg} border-black/5 dark:border-white/5 group-hover:scale-110 transition-transform duration-300`}>
                      <a.icon className={`w-5 h-5 ${a.fg}`} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-600 dark:text-[var(--text-secondary)] text-center leading-tight group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {a.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
