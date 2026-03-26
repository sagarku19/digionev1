'use client';
// Promotions Engine — full coupon management with expiry, toggle, and min-order rules.
// DB tables: coupons (read/write via useCoupons)

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useCoupons } from '@/hooks/useCoupons';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  Ticket, Plus, X, Percent, IndianRupee, ToggleLeft,
  ToggleRight, Trash2, Copy, Check, Calendar, AlertCircle,
  Users, Network, Gift, Tag,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

// ─── Marketing Hub Nav ────────────────────────────────────────
const HUB_TABS = [
  { label: 'Coupons',    href: '/dashboard/coupons',    icon: Ticket  },
  { label: 'Leads',      href: '/dashboard/leads',      icon: Users   },
  { label: 'Affiliates', href: '/dashboard/affiliates', icon: Network },
  { label: 'Referrals',  href: '/dashboard/referrals',  icon: Gift    },
];

function MarketingHubNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl w-fit flex-wrap">
      {HUB_TABS.map(tab => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              active
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

// ─── Copy code button ─────────────────────────────────────────
function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function CouponsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { coupons, isLoading, createCoupon, isCreating } = useCoupons();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    max_uses: '',
    valid_until: '',
    min_order_value: '',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleToggle = async (coupon: any) => {
    setToggling(coupon.id);
    await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
    queryClient.invalidateQueries({ queryKey: ['coupons'] });
    setToggling(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon permanently?')) return;
    setDeleting(id);
    await supabase.from('coupons').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['coupons'] });
    setDeleting(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (formData.code.length < 3) throw new Error('Code must be at least 3 characters.');
      if (formData.discount_value <= 0) throw new Error('Discount value must be greater than zero.');
      if (formData.discount_type === 'percentage' && formData.discount_value > 100) throw new Error('Percentage cannot exceed 100.');
      await createCoupon({
        code: formData.code.toUpperCase().replace(/\s/g, ''),
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        is_active: true,
        current_uses: 0,
        valid_from: new Date().toISOString(),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        metadata: formData.min_order_value ? { min_order_value: Number(formData.min_order_value) } : null,
      });
      setIsModalOpen(false);
      setFormData({ code: '', discount_type: 'percentage', discount_value: 0, max_uses: '', valid_until: '', min_order_value: '' });
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Failed to create coupon.');
    }
  };

  // Stats
  const totalCoupons  = coupons.length;
  const activeCoupons = coupons.filter((c: any) => c.is_active).length;
  const totalUses     = coupons.reduce((acc: number, c: any) => acc + (c.current_uses ?? 0), 0);
  const expiredCount  = coupons.filter((c: any) => c.valid_until && new Date(c.valid_until) < new Date()).length;

  const columns: ColumnDef<any>[] = [
    {
      header: 'Code',
      accessorKey: 'code',
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-gray-900 dark:text-white tracking-wider bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
            {row.code}
          </span>
          <CopyCode code={row.code} />
        </div>
      ),
    },
    {
      header: 'Discount',
      accessorKey: 'discount_value',
      cell: (row: any) => (
        <span className={`inline-flex items-center gap-1 font-bold text-sm px-2.5 py-1 rounded-full ${
          row.discount_type === 'percentage'
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
        }`}>
          {row.discount_type === 'percentage'
            ? <><Percent className="w-3 h-3" />{row.discount_value}% off</>
            : <>₹{row.discount_value} off</>
          }
        </span>
      ),
    },
    {
      header: 'Uses',
      accessorKey: 'current_uses',
      cell: (row: any) => (
        <div className="text-sm">
          <span className="font-semibold text-gray-900 dark:text-white">{row.current_uses ?? 0}</span>
          {row.max_uses && <span className="text-gray-400"> / {row.max_uses}</span>}
        </div>
      ),
    },
    {
      header: 'Expires',
      accessorKey: 'valid_until',
      cell: (row: any) => {
        if (!row.valid_until) return <span className="text-xs text-gray-400">Never</span>;
        const expired = new Date(row.valid_until) < new Date();
        return (
          <span className={`text-xs font-medium flex items-center gap-1 ${expired ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
            <Calendar className="w-3 h-3" />
            {new Date(row.valid_until).toLocaleDateString('en-IN')}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'is_active',
      cell: (row: any) => <StatusPill status={row.is_active ? 'active' : 'inactive'} />,
    },
    {
      header: '',
      accessorKey: 'id',
      cell: (row: any) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => handleToggle(row)}
            disabled={toggling === row.id}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
            title={row.is_active ? 'Deactivate' : 'Activate'}
          >
            {row.is_active
              ? <ToggleRight className="w-5 h-5 text-emerald-500" />
              : <ToggleLeft className="w-5 h-5" />
            }
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            disabled={deleting === row.id}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6 pt-4 pb-20">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your promotions, leads, and growth tools</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> New Coupon
          </button>
        </div>

        {/* Hub nav */}
        <MarketingHubNav />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Coupons',  value: totalCoupons,  color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-500/10'  },
            { label: 'Active',         value: activeCoupons, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { label: 'Total Redeemed', value: totalUses,     color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-500/10'  },
            { label: 'Expired',        value: expiredCount,  color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-500/10'        },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${s.bg}`}>
                <Tag className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Coupons</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading coupons…</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Ticket className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">No coupons yet</p>
              <p className="text-sm text-gray-500 mb-5 max-w-xs">Create discount codes to boost conversions and reward your audience.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition"
              >
                <Plus className="w-4 h-4" /> Create First Coupon
              </button>
            </div>
          ) : (
            <DataTable columns={columns} data={coupons} />
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">New Coupon</h2>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setErrorMsg(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Coupon Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                  className={`${INPUT} font-mono tracking-widest`}
                  placeholder="SAVE20"
                  maxLength={20}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                  <div className="flex gap-2">
                    {(['percentage', 'fixed'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, discount_type: t }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border-2 transition ${
                          formData.discount_type === t
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {t === 'percentage' ? <Percent className="w-3 h-3" /> : <IndianRupee className="w-3 h-3" />}
                        {t === 'percentage' ? '%' : '₹'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Value {formData.discount_type === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={formData.discount_type === 'percentage' ? 100 : undefined}
                    value={formData.discount_value}
                    onChange={e => setFormData(p => ({ ...p, discount_value: Number(e.target.value) }))}
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max Uses</label>
                  <input
                    type="number" min={1}
                    value={formData.max_uses}
                    onChange={e => setFormData(p => ({ ...p, max_uses: e.target.value }))}
                    className={INPUT} placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={e => setFormData(p => ({ ...p, valid_until: e.target.value }))}
                    className={INPUT}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Min. Order Value (₹)</label>
                <input
                  type="number" min={0}
                  value={formData.min_order_value}
                  onChange={e => setFormData(p => ({ ...p, min_order_value: e.target.value }))}
                  className={INPUT} placeholder="No minimum"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all"
              >
                {isCreating ? 'Creating…' : 'Create Coupon →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
