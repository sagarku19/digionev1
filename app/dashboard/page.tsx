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
  ShoppingBag, User2, AlertCircle, Hammer, CreditCard,
  FileText, Layers,
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
      <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-3">
          <ShoppingBag className="w-4 h-4 text-indigo-400" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No orders yet</p>
        <p className="text-xs text-gray-400 mt-1">Orders will appear here live</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {orders.slice(0, 8).map((order: any) => {
        const isSuccess = order.status === 'completed' || order.status === 'success';
        const isPending = order.status === 'pending';
        return (
          <div key={order.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isSuccess ? 'bg-emerald-50 dark:bg-emerald-500/10'
              : isPending ? 'bg-amber-50 dark:bg-amber-500/10'
              : 'bg-red-50 dark:bg-red-500/10'
            }`}>
              <ShoppingBag className={`w-3.5 h-3.5 ${
                isSuccess ? 'text-emerald-500'
                : isPending ? 'text-amber-500'
                : 'text-red-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                {order.customer_name || order.customer_email || 'Customer'}
              </p>
              <p className="text-[11px] text-gray-500">
                {formatINR(order.total_amount)} · {timeAgo(order.created_at)}
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
  { label: 'Add Product',   href: '/dashboard/products/new',         icon: Package,    bg: 'bg-indigo-50 dark:bg-indigo-500/10',  fg: 'text-indigo-600 dark:text-indigo-400'  },
  { label: 'Main Store',    href: '/dashboard/sites/new/store',      icon: Store,      bg: 'bg-violet-50 dark:bg-violet-500/10',  fg: 'text-violet-600 dark:text-violet-400'  },
  { label: 'Payment Link',  href: '/dashboard/sites/new/payment',    icon: CreditCard, bg: 'bg-emerald-50 dark:bg-emerald-500/10', fg: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Blog',          href: '/dashboard/sites/new/blog',       icon: FileText,   bg: 'bg-amber-50 dark:bg-amber-500/10',    fg: 'text-amber-600 dark:text-amber-400'    },
  { label: 'Single Page',   href: '/dashboard/sites/new/singlepage', icon: Layers,     bg: 'bg-sky-50 dark:bg-sky-500/10',        fg: 'text-sky-600 dark:text-sky-400'        },
  { label: 'Builder App',   href: '/dashboard/sites/new/builder',    icon: Hammer,     bg: 'bg-rose-50 dark:bg-rose-500/10',      fg: 'text-rose-600 dark:text-rose-400'      },
];

// ─── Page ─────────────────────────────────────────────────────
export default function DashboardHome() {
  const end   = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);

  const { stats, isLoading: analyticsLoading } = useAnalytics({
    start: start.toISOString(),
    end:   end.toISOString(),
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
        .filter((o: any) => o.created_at?.startsWith(ds))
        .reduce((acc: number, o: any) => acc + (o.total_amount || 0), 0);
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
    <div className="space-y-6 pt-2 pb-10">

      {/* ── Greeting header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
        {mainSite && mainSiteUrl && (
          <a
            href={mainSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-3 py-2 rounded-xl transition shrink-0"
          >
            {mainSiteDisplayUrl}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* LEFT (2/3) */}
        <div className="xl:col-span-2 space-y-5">

          {/* Revenue chart */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Revenue</h2>
                <p className="text-xs text-gray-500 mt-0.5">Last 30 days</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {analyticsLoading ? '—' : formatINR(stats.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500">{stats.totalSales} sales</p>
              </div>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#6366F1" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false} axisLine={false} minTickGap={28}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickFormatter={v => `₹${v}`}
                    tickLine={false} axisLine={false} width={52}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '10px',
                      fontSize: 12,
                    }}
                    itemStyle={{ color: '#e5e7eb' }}
                    formatter={(v: any) => [formatINR(Number(v)), 'Revenue']}
                  />
                  <Area
                    type="monotone" dataKey="revenue"
                    stroke="#6366F1" strokeWidth={2.5}
                    fill="url(#revGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Products</h2>
              <Link href="/dashboard/products" className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {productsLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <p className="text-sm text-gray-500">No products yet</p>
                <Link
                  href="/dashboard/products/new"
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {topProducts.map((p: any, idx: number) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/products/${p.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition group"
                  >
                    <span className="text-xs font-bold text-gray-300 dark:text-gray-700 w-4 shrink-0 text-center">
                      {idx + 1}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-500">{p.price === 0 ? 'Free' : formatINR(p.price)}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-700 group-hover:text-indigo-400 transition shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT (1/3) */}
        <div className="space-y-5">

          {/* Live activity feed */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Orders</h2>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <Link href="/dashboard/earnings" className="text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition font-medium">
                All
              </Link>
            </div>
            <ActivityFeed orders={orders} loading={ordersLoading} />
          </div>

          {/* Quick actions */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACTIONS.map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800/60 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition group"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${a.bg}`}>
                    <a.icon className={`w-4 h-4 ${a.fg}`} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 text-center leading-tight group-hover:text-gray-800 dark:group-hover:text-gray-200 transition">
                    {a.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Setup to-do */}
          {todos.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300">Get started</h2>
              </div>
              <div className="space-y-2">
                {todos.map(t => (
                  <Link
                    key={t.href}
                    href={t.href}
                    className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
