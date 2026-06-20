'use client';

import React, { useState, useMemo } from 'react';
import { useAnalytics } from '@/hooks/analytics/useAnalytics';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  BarChart2, Package, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import { formatINR, formatINRCompact } from '@/lib/format';

const PERIODS = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];

function pctChange(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  const delta = pctChange(current, prev);
  if (delta > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--success)]">
      <ArrowUpRight size={13} /> +{delta}%
    </span>
  );
  if (delta < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--danger)]">
      <ArrowDownRight size={13} /> {delta}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--text-tertiary)]">
      <Minus size={13} /> 0%
    </span>
  );
}

type ChartTooltipProps = {
  active?: boolean;
  payload?: { value: number; color?: string }[];
  label?: string;
  formatter?: (value: number) => React.ReactNode;
};

const CustomTooltip = ({ active, payload, label, formatter }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 shadow-[var(--shadow-md)] text-sm">
      <p className="text-[var(--text-tertiary)] mb-1">{label}</p>
      {payload.map((p, i) => (
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
      const dayOrders = stats.orders.filter((o) =>
        o.created_at?.startsWith(ds) && (o.status === 'success' || o.status === 'completed')
      );
      data.push({
        name: daysBack <= 14
          ? d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          : daysBack <= 31
          ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        revenue: dayOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0),
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

  const periodToggle = (
    <div className="flex bg-[var(--surface-muted)] rounded-[var(--radius-sm)] p-1 border border-[var(--border)]">
      {PERIODS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => setDaysBack(value)}
          className={`px-4 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
            daysBack === value
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Analytics"
        description="Track revenue, sales volume, and top performing products."
        action={periodToggle}
      />

      {/* Stat Cards */}
      <KpiGrid>
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Revenue */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Revenue</span>
                <span className="p-1.5 bg-[var(--surface-muted)] rounded-[var(--radius-sm)]">
                  <DollarSign size={14} className="text-[var(--text-secondary)]" />
                </span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                {formatINRCompact(stats.totalRevenue)}
              </p>
              <div className="flex items-center gap-2">
                <DeltaBadge current={stats.totalRevenue} prev={stats.prevRevenue} />
                <span className="text-xs text-[var(--text-tertiary)]">vs prev period</span>
              </div>
            </div>

            {/* Sales */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Orders</span>
                <span className="p-1.5 bg-[var(--surface-muted)] rounded-[var(--radius-sm)]">
                  <ShoppingCart size={14} className="text-[var(--text-secondary)]" />
                </span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                {stats.totalSales}
              </p>
              <div className="flex items-center gap-2">
                <DeltaBadge current={stats.totalSales} prev={stats.prevSales} />
                <span className="text-xs text-[var(--text-tertiary)]">vs prev period</span>
              </div>
            </div>

            {/* AOV */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Avg. Order Value</span>
                <span className="p-1.5 bg-[var(--success-bg)] rounded-[var(--radius-sm)]">
                  <TrendingUp size={14} className="text-[var(--success)]" />
                </span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                {formatINRCompact(aov)}
              </p>
              <div className="flex items-center gap-2">
                <DeltaBadge current={aov} prev={prevAov} />
                <span className="text-xs text-[var(--text-tertiary)]">vs prev period</span>
              </div>
            </div>

            {/* Peak Day */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Peak Day</span>
                <span className="p-1.5 bg-[var(--warning-bg)] rounded-[var(--radius-sm)]">
                  <BarChart2 size={14} className="text-[var(--warning)]" />
                </span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                {peakDay ? formatINRCompact(peakDay.revenue) : '₹0'}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">{peakDay?.name ?? '—'}</p>
            </div>
          </>
        )}
      </KpiGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue Area Chart — 3 cols */}
        <Card className="lg:col-span-3">
          {isLoading ? (
            <>
              <Skeleton className="h-5 w-36 mb-6" />
              <Skeleton className="h-[260px] w-full" rounded="md" />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Revenue Trend</h2>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Daily revenue over the selected period</p>
                </div>
                <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-muted)] px-2 py-1 rounded-[var(--radius-sm)]">
                  {daysBack}D view
                </span>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={daysBack > 30 ? 14 : 8}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 500 }}
                      tickFormatter={(v) => formatINRCompact(v)}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <RechartsTooltip
                      content={<CustomTooltip formatter={(v: number) => formatINR(v)} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--brand)"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#revGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--brand)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Card>

        {/* Sales Volume Bar Chart — 2 cols */}
        <Card className="lg:col-span-2">
          {isLoading ? (
            <>
              <Skeleton className="h-5 w-32 mb-6" />
              <Skeleton className="h-[260px] w-full" rounded="md" />
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Sales Volume</h2>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Orders per day</p>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeriesData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={daysBack > 30 ? 14 : 8}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 500 }}
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
                      fill="var(--brand)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={daysBack <= 14 ? 32 : 20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Top Products */}
      <Card padded={false}>
        <div className="flex items-center gap-2 px-5 py-5 border-b border-[var(--border-subtle)]">
          <Package size={16} className="text-[var(--text-secondary)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Top Products</h2>
          <span className="ml-auto text-xs text-[var(--text-tertiary)]">by revenue · {daysBack}D</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton rounded="lg" className="w-9 h-9 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-2 w-full" rounded="full" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        ) : stats.topProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No product sales in this period"
            description="Sales data will appear here once orders are completed."
          />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {stats.topProducts.map((p, idx) => {
              const maxRevenue = stats.topProducts[0]?.revenue || 1;
              const pct = Math.round((p.revenue / maxRevenue) * 100);
              return (
                <div key={p.product_id} className="flex items-center gap-4 px-5 py-4">
                  {/* Rank / Thumbnail */}
                  <div className="w-9 h-9 rounded-[var(--radius-lg)] overflow-hidden shrink-0 bg-[var(--brand)] flex items-center justify-center text-[var(--text-on-brand)] text-xs font-bold">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      `#${idx + 1}`
                    )}
                  </div>
                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate pr-2">{p.name}</p>
                      <span className="text-xs text-[var(--text-tertiary)] shrink-0">{p.sales} sale{p.sales !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--brand)] transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {/* Revenue */}
                  <p className="text-sm font-semibold text-[var(--text-primary)] shrink-0 min-w-16 text-right">
                    {formatINRCompact(p.revenue)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
