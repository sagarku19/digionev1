'use client';

import React, { useState, useMemo } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  BarChart2, Package, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

const PERIODS = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];

function formatINR(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatINRFull(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function pctChange(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  const delta = pctChange(current, prev);
  if (delta > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-400">
      <ArrowUpRight size={13} /> +{delta}%
    </span>
  );
  if (delta < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-400">
      <ArrowDownRight size={13} /> {delta}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-400">
      <Minus size={13} /> 0%
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 animate-pulse">
      <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
      <div className="h-65 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 shadow-xl text-sm">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [daysBack, setDaysBack] = useState(30);

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);
    return { startDate: start, endDate: end };
  }, [daysBack]);

  const { stats, isLoading } = useAnalytics({
    start: startDate.toISOString(),
    end: endDate.toISOString()
  });

  const timeSeriesData = useMemo(() => {
    if (!stats?.orders) return [];
    const data = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayOrders = stats.orders.filter((o: any) =>
        o.created_at?.startsWith(ds) && (o.status === 'success' || o.status === 'completed')
      );
      data.push({
        name: daysBack <= 14
          ? d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          : daysBack <= 31
          ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        revenue: dayOrders.reduce((acc: number, o: any) => acc + (o.total_amount || 0), 0),
        sales: dayOrders.length,
      });
    }
    return data;
  }, [stats, daysBack]);

  const aov = stats.totalSales > 0
    ? Math.round(stats.totalRevenue / stats.totalSales)
    : 0;
  const prevAov = stats.prevSales > 0
    ? Math.round(stats.prevRevenue / stats.prevSales)
    : 0;

  const peakDay = useMemo(() => {
    if (!timeSeriesData.length) return null;
    return timeSeriesData.reduce((best, d) => d.revenue > best.revenue ? d : best, timeSeriesData[0]);
  }, [timeSeriesData]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white pt-4">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Track revenue, sales volume, and top performing products.
          </p>
        </div>
        <div className="flex bg-gray-100 dark:bg-[#0D0D1F] rounded-xl p-1 border border-gray-200 dark:border-gray-800">
          {PERIODS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setDaysBack(value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                daysBack === value
                  ? 'bg-white dark:bg-indigo-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            {/* Revenue */}
            <div className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</span>
                <span className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                  <DollarSign size={14} className="text-indigo-600 dark:text-indigo-400" />
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {formatINR(stats.totalRevenue)}
              </p>
              <div className="flex items-center gap-2">
                <DeltaBadge current={stats.totalRevenue} prev={stats.prevRevenue} />
                <span className="text-xs text-gray-400">vs prev period</span>
              </div>
            </div>

            {/* Sales */}
            <div className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Orders</span>
                <span className="p-1.5 bg-violet-100 dark:bg-violet-500/20 rounded-lg">
                  <ShoppingCart size={14} className="text-violet-600 dark:text-violet-400" />
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.totalSales}
              </p>
              <div className="flex items-center gap-2">
                <DeltaBadge current={stats.totalSales} prev={stats.prevSales} />
                <span className="text-xs text-gray-400">vs prev period</span>
              </div>
            </div>

            {/* AOV */}
            <div className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg. Order Value</span>
                <span className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                  <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {formatINR(aov)}
              </p>
              <div className="flex items-center gap-2">
                <DeltaBadge current={aov} prev={prevAov} />
                <span className="text-xs text-gray-400">vs prev period</span>
              </div>
            </div>

            {/* Peak Day */}
            <div className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Peak Day</span>
                <span className="p-1.5 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                  <BarChart2 size={14} className="text-amber-600 dark:text-amber-400" />
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {peakDay ? formatINR(peakDay.revenue) : '₹0'}
              </p>
              <p className="text-xs text-gray-400">{peakDay?.name ?? '—'}</p>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue Area Chart — 3 cols */}
        <div className="lg:col-span-3 bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          {isLoading ? (
            <SkeletonChart />
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Revenue Trend</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Daily revenue over the selected period</p>
                </div>
                <span className="text-xs font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-lg">
                  {daysBack}D view
                </span>
              </div>
              <div className="h-65">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={daysBack > 30 ? 14 : 8}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      tickFormatter={(v) => formatINR(v)}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <RechartsTooltip
                      content={<CustomTooltip formatter={(v: number) => formatINRFull(v)} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#revGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#6366F1' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {/* Sales Volume Bar Chart — 2 cols */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          {isLoading ? (
            <SkeletonChart />
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sales Volume</h2>
                <p className="text-xs text-gray-400 mt-0.5">Orders per day</p>
              </div>
              <div className="h-65">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeriesData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={daysBack > 30 ? 14 : 8}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      content={<CustomTooltip formatter={(v: number) => `${v} orders`} />}
                    />
                    <Bar
                      dataKey="sales"
                      fill="#8B5CF6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={daysBack <= 14 ? 32 : 20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Package size={16} className="text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Top Products</h2>
          <span className="ml-auto text-xs text-gray-400">by revenue · {daysBack}D</span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full" />
                </div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded shrink-0" />
              </div>
            ))}
          </div>
        ) : stats.topProducts.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No product sales in this period</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stats.topProducts.map((p, idx) => {
              const maxRevenue = stats.topProducts[0]?.revenue || 1;
              const pct = Math.round((p.revenue / maxRevenue) * 100);
              return (
                <div key={p.product_id} className="flex items-center gap-4">
                  {/* Rank / Thumbnail */}
                  <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      `#${idx + 1}`
                    )}
                  </div>
                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-2">{p.name}</p>
                      <span className="text-xs text-gray-400 shrink-0">{p.sales} sale{p.sales !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {/* Revenue */}
                  <p className="text-sm font-semibold text-gray-900 dark:text-white shrink-0 min-w-16 text-right">
                    {formatINR(p.revenue)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
