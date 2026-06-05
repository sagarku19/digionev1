'use client';
// Customer CRM — aggregated buyer list from all creator's orders.
// DB tables: orders (read via useCustomers), sites (read)

import React, { useState } from 'react';
import Link from 'next/link';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Users, TrendingUp, ShoppingBag,
  Download, UserCircle2, Package, Store, ArrowRight,
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
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'recent'>('spent');

  const sorted = [...customers].sort((a, b) => {
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
          <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)] flex items-center justify-center shrink-0 text-[var(--text-primary)] font-bold text-sm">
            {(row.name ?? row.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{row.name || '—'}</p>
            <p className="text-xs text-[var(--text-secondary)] truncate">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Phone',
      accessorKey: 'phone',
      cell: (row) => (
        <span className="text-sm text-[var(--text-secondary)]">{row.phone || '—'}</span>
      )
    },
    {
      header: 'Orders',
      accessorKey: 'total_orders',
      sortable: true,
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--text-primary)]">
          <ShoppingBag className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          {row.total_orders}
        </span>
      )
    },
    {
      header: 'Lifetime Value',
      accessorKey: 'total_spent',
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[var(--success)]">{formatINR(row.total_spent)}</span>
          <span className="text-xs text-[var(--text-tertiary)] mt-0.5">{row.total_orders} order{row.total_orders !== 1 ? 's' : ''}</span>
        </div>
      )
    },
    {
      header: 'Last Order',
      accessorKey: 'last_order_at',
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {new Date(row.last_order_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
  ];

  const exportButton = customers.length > 0 ? (
    <button
      onClick={() => exportCSV(customers)}
      className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold transition shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <Download className="w-4 h-4" />
      Export CSV
    </button>
  ) : undefined;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Customers"
        description={`${customers.length} unique buyers across all your stores`}
        action={exportButton}
      />

      {/* Stats */}
      {!isLoading && customers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Customers', value: customers.length.toLocaleString('en-IN'), icon: Users },
            { label: 'Total Orders', value: totalOrders.toLocaleString('en-IN'), icon: ShoppingBag },
            { label: 'Revenue from Buyers', value: formatINR(totalRevenue), icon: TrendingUp },
            { label: 'Avg. Order Value', value: formatINR(avgOrderValue), icon: TrendingUp },
          ].map(stat => (
            <div key={stat.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-xs)]">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sort controls */}
      {customers.length > 0 && (
        <div className="flex gap-2">
          {(['spent', 'orders', 'recent'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition capitalize focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                sortBy === s
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
              }`}
            >
              {s === 'spent' ? 'Top Spenders' : s === 'orders' ? 'Most Orders' : 'Recent'}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" rounded="lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && customers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] px-8 shadow-[var(--shadow-xs)]">
          <div className="w-20 h-20 bg-[var(--brand)]/10 rounded-full flex items-center justify-center mb-5 shadow-inner">
            <UserCircle2 className="w-10 h-10 text-[var(--brand)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">No customers yet</h2>
          <p className="text-[var(--text-secondary)] text-sm max-w-xs mb-8">
            Once buyers complete purchases, they&apos;ll appear here with their full lifetime value and order history.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-sm">
            <Link
              href="/dashboard/products/new"
              className="flex items-center gap-3 px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] hover:border-[var(--brand)]/50 hover:shadow-[var(--shadow-sm)] transition-all group focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <div className="w-9 h-9 bg-[var(--brand)]/10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-[var(--brand)]" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Add a product</p>
                <p className="text-xs text-[var(--text-secondary)]">Start selling</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] ml-auto shrink-0 transition-colors" />
            </Link>
            <Link
              href="/dashboard/sites"
              className="flex items-center gap-3 px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] hover:border-[var(--brand)]/50 hover:shadow-[var(--shadow-sm)] transition-all group focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <div className="w-9 h-9 bg-[var(--brand)]/10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-[var(--brand)]" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Create a store</p>
                <p className="text-xs text-[var(--text-secondary)]">Get discoverable</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] ml-auto shrink-0 transition-colors" />
            </Link>
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && sorted.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-xs)]">
          <DataTable
            data={sorted}
            columns={columns}
            searchKeys={['email', 'name']}
            emptyState="No customers match your search."
          />
        </div>
      )}
    </div>
  );
}
