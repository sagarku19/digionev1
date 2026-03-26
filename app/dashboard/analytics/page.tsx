'use client';

import React, { useState, useMemo } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useProducts } from '@/hooks/useProducts';
import { StatCard } from '@/components/ui/StatCard';
import { ArrowRightLeft, MousePointerClick, TrendingUp } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area 
} from 'recharts';

export default function AnalyticsPage() {
  const [daysBack, setDaysBack] = useState(30);

  // CRITICAL: Memoize dates so the queryKey is stable between renders.
  // Without useMemo, new Date() produces a different ms-precision string every render,
  // causing React Query to treat it as a brand-new request → infinite loading loop.
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
  
  const { products } = useProducts();

  const timeSeriesData = useMemo(() => {
    if (!stats?.orders) return [];
    const data = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateString = targetDate.toISOString().split('T')[0];
      
      const dayOrders = stats.orders.filter(o => o.created_at?.startsWith(dateString));
      const revenue = dayOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
      
      data.push({
        name: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue,
        sales: dayOrders.length
      });
    }
    return data;
  }, [stats, daysBack]);

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading Analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Deep dive into your sales and traffic performance.</p>
        </div>
        
        <div className="flex bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-800 shadow-sm">
          {[7, 30, 90].map(val => (
            <button
              key={val}
              onClick={() => setDaysBack(val)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                daysBack === val 
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] dark:bg-[var(--accent)]/20 dark:text-[var(--text-secondary)]' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {val} Days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <StatCard 
          label={`Total Revenue (${daysBack}D)`} 
          value={formatINR(stats.totalRevenue)} 
          icon={TrendingUp} 
        />
        <StatCard 
          label={`Total Sales (${daysBack}D)`} 
          value={stats.totalSales} 
          icon={MousePointerClick} 
        />
        <StatCard 
          label="Average Order Value" 
          value={stats.totalSales > 0 ? formatINR(stats.totalRevenue / stats.totalSales) : '₹0'} 
          icon={ArrowRightLeft} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Volume Area Chart */}
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Revenue Trajectory</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={timeSeriesData} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(val) => `₹${val}`} axisLine={false} tickLine={false} width={60} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [formatINR(Number(value)), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Count Bar Chart */}
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sales Volume</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={timeSeriesData} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} width={40} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`${value} orders`, 'Sales']}
                />
                <Bar dataKey="sales" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
