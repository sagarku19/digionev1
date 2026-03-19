'use client';

import React, { useMemo } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { DollarSign, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardHome() {
  // Last 30 days window natively
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  
  const { stats, isLoading: analyticsLoading } = useAnalytics({ 
    start: startDate.toISOString(), 
    end: endDate.toISOString() 
  });
  
  const { products, isLoading: productsLoading } = useProducts();
  const { orders, isLoading: ordersLoading } = useOrders(5); // Fetch top 5 for recent

  const activeProductsCount = products.filter(p => p.is_published).length;
  
  const chartData = useMemo(() => {
    if (!stats?.orders) return [];
    const data = [];
    // Generate 30 day buckets
    for (let i = 29; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateString = targetDate.toISOString().split('T')[0];
      
      const dayOrders = stats.orders.filter(o => {
        if (!o.created_at) return false;
        return o.created_at.startsWith(dateString);
      });
      
      const revenue = dayOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
      
      data.push({
        name: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue
      });
    }
    return data;
  }, [stats]);

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const columns: any[] = [
    { 
      header: 'Order ID', 
      accessorKey: 'id',
      cell: (row: any) => <span className="text-gray-500 font-mono text-xs">{String(row.id).substring(0,8)}</span>
    },
    { 
      header: 'Date', 
      accessorKey: 'created_at',
      cell: (row: any) => new Date(row.created_at).toLocaleDateString()
    },
    { 
      header: 'Total', 
      accessorKey: 'total_amount',
      cell: (row: any) => <span className="font-medium text-gray-900 dark:text-gray-100">{formatINR(row.total_amount)}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row: any) => <StatusPill status={String(row.status)} />
    }
  ];

  // Only show full-page spinner on the very first load (not on subsequent errors/refetches)
  if (analyticsLoading && productsLoading) {
    return <div className="p-8 flex items-center justify-center text-gray-400">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="30-Day Revenue" 
          value={formatINR(stats.totalRevenue)} 
          icon={DollarSign} 
        />
        <StatCard 
          label="30-Day Sales" 
          value={stats.totalSales} 
          icon={TrendingUp} 
        />
        <StatCard 
          label="Active Products" 
          value={activeProductsCount} 
          icon={Package} 
          subValue={`Out of ${products.length} total`}
        />
        <StatCard 
          label="Lifetime Orders" 
          value={ordersLoading ? '...' : (orders.length >= 50 ? '50+' : orders.length)} 
          icon={ShoppingCart} 
        />
      </div>

      {/* Primary Chart */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Revenue Overview</h2>
          <p className="text-sm text-gray-500">Your earnings over the last 30 days.</p>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: '#888' }} 
                tickLine={false}
                axisLine={false}
                minTickGap={20}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#888' }}
                tickFormatter={(val) => `₹${val}`}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#111827', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: any) => [formatINR(Number(value)), 'Revenue']}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#6366F1" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Orders</h2>
        </div>
        <div className="p-0">
          {ordersLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No orders yet. Start promoting your store!</div>
          ) : (
            <DataTable 
              columns={columns} 
              data={orders} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
