'use client';
// Customer CRM — aggregated buyer list from all creator's orders.
// DB tables: orders (read via useCustomers), sites (read)

import React, { useState } from 'react';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import {
  Users, Mail, Phone, TrendingUp, ShoppingBag,
  Download, Search, UserCircle2
} from 'lucide-react';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function exportCSV(customers: Customer[]) {
  const header = ['Email', 'Name', 'Phone', 'Orders', 'Total Spent', 'First Order', 'Last Order'];
  const rows = customers.map(c => [
    c.email,
    c.name ?? '',
    c.phone ?? '',
    c.total_orders,
    c.total_spent,
    new Date(c.first_order_at).toLocaleDateString('en-IN'),
    new Date(c.last_order_at).toLocaleDateString('en-IN'),
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'customers.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useCustomers();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'recent'>('spent');

  const filtered = customers
    .filter(c =>
      c.email.includes(search.toLowerCase()) ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
    .sort((a, b) => {
      if (sortBy === 'orders') return b.total_orders - a.total_orders;
      if (sortBy === 'recent') return new Date(b.last_order_at).getTime() - new Date(a.last_order_at).getTime();
      return b.total_spent - a.total_spent;
    });

  const totalRevenue = customers.reduce((s, c) => s + c.total_spent, 0);
  const totalOrders  = customers.reduce((s, c) => s + c.total_orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const columns: ColumnDef<Customer>[] = [
    {
      header: 'Customer',
      accessorKey: 'email',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 text-[var(--text-primary)] font-bold text-sm">
            {(row.name ?? row.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{row.name || '—'}</p>
            <p className="text-xs text-gray-500 truncate">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Phone',
      accessorKey: 'phone',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{row.phone || '—'}</span>
      )
    },
    {
      header: 'Orders',
      accessorKey: 'total_orders',
      sortable: true,
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
          <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
          {row.total_orders}
        </span>
      )
    },
    {
      header: 'Total Spent',
      accessorKey: 'total_spent',
      sortable: true,
      cell: (row) => (
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatINR(row.total_spent)}</span>
      )
    },
    {
      header: 'Last Order',
      accessorKey: 'last_order_at',
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.last_order_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
  ];

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-gray-400" />
            Customers
          </h1>
          <p className="text-sm text-gray-500 mt-1">{customers.length} unique buyers across all your stores</p>
        </div>
        {customers.length > 0 && (
          <button
            onClick={() => exportCSV(customers)}
            className="flex items-center gap-2 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 hover:border-[var(--accent)] dark:hover:border-[var(--accent)] text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && customers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Customers', value: customers.length.toLocaleString('en-IN'), icon: Users, color: 'neutral' },
            { label: 'Total Orders', value: totalOrders.toLocaleString('en-IN'), icon: ShoppingBag, color: 'neutral' },
            { label: 'Revenue from Buyers', value: formatINR(totalRevenue), icon: TrendingUp, color: 'emerald' },
            { label: 'Avg. Order Value', value: formatINR(avgOrderValue), icon: TrendingUp, color: 'amber' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {customers.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone…"
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            />
          </div>
          <div className="flex gap-2">
            {(['spent', 'orders', 'recent'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition capitalize ${
                  sortBy === s
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-[var(--accent)]'
                }`}
              >
                {s === 'spent' ? 'Top Spenders' : s === 'orders' ? 'Most Orders' : 'Recent'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && customers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mb-5">
            <UserCircle2 className="w-10 h-10 text-[var(--text-secondary)]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No customers yet</h2>
          <p className="text-gray-500 text-sm max-w-xs">Once buyers complete purchases, they'll appear here with their full order history.</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <DataTable
            data={filtered}
            columns={columns}
            searchKeys={['email', 'name']}
            emptyState="No customers match your search."
          />
        </div>
      )}
    </div>
  );
}
