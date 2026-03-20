'use client';
// Promotions Engine — full coupon management with expiry, toggle, and min-order rules.
// DB tables: coupons (read/write via useCoupons)

import React, { useState } from 'react';
import { useCoupons } from '@/hooks/useCoupons';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  Ticket, Plus, X, Percent, IndianRupee, ToggleLeft,
  ToggleRight, Trash2, Copy, Check, Calendar, AlertCircle, Zap
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

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

export default function CouponsPage() {
  const supabase = createClient();
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

  // Local toggle & delete (direct supabase — invalidates via refetch)
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleToggle = async (coupon: any) => {
    setToggling(coupon.id);
    await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
    // Force refetch by reloading — simpler than wiring mutation through hook
    window.location.reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon permanently?')) return;
    setDeleting(id);
    await supabase.from('coupons').delete().eq('id', id);
    window.location.reload();
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

  const isExpired = (coupon: any) => coupon.valid_until && new Date(coupon.valid_until) < new Date();
  const activeCoupons = coupons.filter((c: any) => c.is_active && !isExpired(c)).length;

  const columns: ColumnDef<any>[] = [
    {
      header: 'Code',
      accessorKey: 'code',
      sortable: true,
      cell: (row: any) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono tracking-widest text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
            {row.code}
          </span>
          <CopyCode code={row.code} />
        </div>
      )
    },
    {
      header: 'Discount',
      accessorKey: 'discount_value',
      cell: (row: any) => (
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
          {row.discount_type === 'percentage' ? `${row.discount_value}% OFF` : `₹${row.discount_value} OFF`}
        </span>
      )
    },
    {
      header: 'Uses',
      accessorKey: 'current_uses',
      cell: (row: any) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.current_uses ?? 0} / {row.max_uses ?? '∞'}
        </span>
      )
    },
    {
      header: 'Expires',
      accessorKey: 'valid_until',
      cell: (row: any) => row.valid_until ? (
        <span className={`text-sm ${isExpired(row) ? 'text-red-500 dark:text-red-400' : 'text-gray-500'}`}>
          {isExpired(row) ? '⚠ ' : ''}{new Date(row.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ) : <span className="text-sm text-gray-400">No expiry</span>
    },
    {
      header: 'Status',
      accessorKey: 'is_active',
      cell: (row: any) => (
        isExpired(row)
          ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">Expired</span>
          : <StatusPill status={row.is_active ? 'active' : 'inactive'} />
      )
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row: any) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleToggle(row)}
            disabled={toggling === row.id || isExpired(row)}
            title={row.is_active ? 'Deactivate' : 'Activate'}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition disabled:opacity-40"
          >
            {row.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            disabled={deleting === row.id}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ];

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading promotions…</div>;

  return (
    <>
      <div className="space-y-6 pt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Ticket className="w-6 h-6 text-gray-400" />
              Discount Coupons
            </h1>
            <p className="text-sm text-gray-500 mt-1">Create promo codes to drive conversions. {activeCoupons} active.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Coupon
          </button>
        </div>

        {/* Stats */}
        {coupons.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Coupons', value: coupons.length },
              { label: 'Active', value: activeCoupons },
              { label: 'Total Redemptions', value: coupons.reduce((s: number, c: any) => s + (c.current_uses ?? 0), 0) },
              { label: 'Expired', value: coupons.filter((c: any) => isExpired(c)).length },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <DataTable
            data={coupons}
            columns={columns}
            searchKeys={['code']}
            emptyState="No coupons yet. Create one to boost your conversion rate!"
          />
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#0D0D1F] z-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-500" />
                New Coupon
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Coupon Code</label>
                <input
                  type="text" required value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  className={`${INPUT} font-mono tracking-widest`}
                  placeholder="LAUNCH50"
                />
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Discount Type</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'percentage', icon: Percent, label: '%' },
                      { value: 'fixed', icon: IndianRupee, label: '₹' },
                    ].map(t => (
                      <button
                        key={t.value} type="button"
                        onClick={() => setFormData({ ...formData, discount_type: t.value as any })}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-semibold transition ${
                          formData.discount_type === t.value
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                        }`}
                      >
                        <t.icon className="w-4 h-4" /> {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Value {formData.discount_type === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number" required min="1" max={formData.discount_type === 'percentage' ? 100 : undefined}
                    value={formData.discount_value || ''}
                    onChange={e => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                    className={INPUT} placeholder="20"
                  />
                </div>
              </div>

              {/* Optional settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Max Uses <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number" min="1" value={formData.max_uses}
                    onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                    className={INPUT} placeholder="∞ unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Min. Order <span className="text-gray-400 font-normal">(₹)</span>
                  </label>
                  <input
                    type="number" min="0" value={formData.min_order_value}
                    onChange={e => setFormData({ ...formData, min_order_value: e.target.value })}
                    className={INPUT} placeholder="0"
                  />
                </div>
              </div>

              {/* Expiry date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Expiry Date <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="date" value={formData.valid_until}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                  className={INPUT}
                />
              </div>

              <button
                type="submit" disabled={isCreating}
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
