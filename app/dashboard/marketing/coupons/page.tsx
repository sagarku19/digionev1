'use client';
// Coupons — full CRUD with stats, inline toggle/delete, bulk code generator, expiry tracking.
// DB: coupons (via useCoupons hook + direct supabase for toggle/delete)

import React, { useState } from 'react';
import { useCoupons } from '@/hooks/useCoupons';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Ticket, Plus, X, Percent, IndianRupee, ToggleLeft, ToggleRight,
  Trash2, Copy, Check, Calendar, AlertCircle, Tag, RefreshCw,
  Zap, Search,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function isExpired(valid_until: string | null) {
  return !!valid_until && new Date(valid_until) < new Date();
}

function UsageBar({ current, max }: { current: number; max: number | null }) {
  if (!max) return <span className="text-sm font-semibold text-gray-900 dark:text-white">{current} <span className="text-gray-400 font-normal text-xs">uses</span></span>;
  const pct = Math.min((current / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 shrink-0">{current}/{max}</span>
    </div>
  );
}

function genCode(prefix = '') {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return prefix ? `${prefix.toUpperCase()}${rand}` : rand;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CouponsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { coupons, isLoading, createCoupon, isCreating } = useCoupons();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 20,
    max_uses: '',
    valid_until: '',
    min_order_value: '',
  });
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkMode, setBulkMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleToggle = async (coupon: any) => {
    setToggling(coupon.id);
    await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
    queryClient.invalidateQueries({ queryKey: ['coupons'] });
    setToggling(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from('coupons').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['coupons'] });
    setDeleting(null);
    setDeleteConfirm(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (!bulkMode) {
        if (formData.code.length < 3) throw new Error('Code must be at least 3 characters.');
        if (formData.discount_value <= 0) throw new Error('Discount value must be > 0.');
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
      } else {
        // Bulk generate
        await Promise.all(
          Array.from({ length: bulkCount }, () =>
            createCoupon({
              code: genCode(bulkPrefix),
              discount_type: formData.discount_type,
              discount_value: Number(formData.discount_value),
              max_uses: formData.max_uses ? Number(formData.max_uses) : null,
              is_active: true,
              current_uses: 0,
              valid_from: new Date().toISOString(),
              valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
              metadata: formData.min_order_value ? { min_order_value: Number(formData.min_order_value) } : null,
            })
          )
        );
      }
      setIsModalOpen(false);
      setFormData({ code: '', discount_type: 'percentage', discount_value: 20, max_uses: '', valid_until: '', min_order_value: '' });
      setBulkMode(false);
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Failed to create coupon.');
    }
  };

  // Stats
  const totalCoupons  = coupons.length;
  const activeCoupons = coupons.filter((c: any) => c.is_active).length;
  const totalUses     = coupons.reduce((a: number, c: any) => a + (c.current_uses ?? 0), 0);
  const expiredCount  = coupons.filter((c: any) => isExpired(c.valid_until)).length;

  const filtered = coupons.filter((c: any) => {
    const matchSearch = !search || c.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' ? true
      : filterStatus === 'active' ? c.is_active && !isExpired(c.valid_until)
      : filterStatus === 'inactive' ? !c.is_active
      : isExpired(c.valid_until);
    return matchSearch && matchStatus;
  });

  return (
    <>
      <div className="space-y-5 pt-4 pb-20">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coupons</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create and manage discount codes for your products</p>
          </div>
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition shrink-0">
            <Plus className="w-4 h-4" /> New Coupon
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: totalCoupons, icon: Tag, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900' },
            { label: 'Active', value: activeCoupons, icon: Zap, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { label: 'Redeemed', value: totalUses, icon: Check, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
            { label: 'Expired', value: expiredCount, icon: Calendar, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900 dark:text-white leading-none">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code…"
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 text-gray-900 dark:text-white placeholder-gray-400" />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'active', 'inactive', 'expired'] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition ${
                  filterStatus === f ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-indigo-400'
                }`}>{f}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Coupons</h2>
            <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {isLoading ? (
            <div className="p-10 text-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading coupons…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-800">
                <Ticket className="w-7 h-7 text-gray-300 dark:text-gray-700" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{search ? `No coupons matching "${search}"` : 'No coupons yet'}</p>
              <p className="text-sm text-gray-500 mb-5 max-w-xs">Create discount codes to boost conversions and reward your audience.</p>
              <button onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition">
                <Plus className="w-4 h-4" /> Create First Coupon
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((coupon: any) => {
                const expired = isExpired(coupon.valid_until);
                return (
                  <div key={coupon.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition group">
                    {/* Code */}
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <span className="font-mono font-bold text-sm text-gray-900 dark:text-white tracking-widest bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                        {coupon.code}
                      </span>
                      <CopyCode code={coupon.code} />
                    </div>

                    {/* Discount */}
                    <span className={`hidden sm:inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-full ${
                      coupon.discount_type === 'percentage'
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    }`}>
                      {coupon.discount_type === 'percentage' ? <><Percent className="w-3 h-3" />{coupon.discount_value}% off</> : <>₹{coupon.discount_value} off</>}
                    </span>

                    {/* Usage bar */}
                    <div className="flex-1 hidden md:block">
                      <UsageBar current={coupon.current_uses ?? 0} max={coupon.max_uses} />
                    </div>

                    {/* Expiry */}
                    <div className="hidden lg:flex items-center gap-1 text-xs min-w-[100px]">
                      {coupon.valid_until ? (
                        <span className={expired ? 'text-red-500 font-medium' : 'text-gray-500'}>
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {expired ? 'Expired ' : ''}{new Date(coupon.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      ) : (
                        <span className="text-gray-400">No expiry</span>
                      )}
                    </div>

                    {/* Min order */}
                    {coupon.metadata?.min_order_value && (
                      <span className="hidden xl:inline text-xs text-gray-400">Min ₹{coupon.metadata.min_order_value}</span>
                    )}

                    {/* Status pill */}
                    <span className={`hidden sm:inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      expired ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                      : coupon.is_active ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                    }`}>
                      {expired ? 'Expired' : coupon.is_active ? 'Active' : 'Paused'}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-auto opacity-60 group-hover:opacity-100 transition">
                      <button onClick={() => handleToggle(coupon)} disabled={toggling === coupon.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        title={coupon.is_active ? 'Pause' : 'Activate'}>
                        {coupon.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => setDeleteConfirm(coupon.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#0D0D1F] z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">New Coupon</h2>
              </div>
              <button onClick={() => { setIsModalOpen(false); setErrorMsg(''); setBulkMode(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              {/* Single vs Bulk toggle */}
              <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit">
                {([['Single', false], ['Bulk Generate', true]] as [string, boolean][]).map(([label, val]) => (
                  <button key={label} type="button" onClick={() => setBulkMode(val)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                      bulkMode === val ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                    }`}>{label}</button>
                ))}
              </div>

              {/* Code field — single only */}
              {!bulkMode ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Coupon Code</label>
                  <div className="flex gap-2">
                    <input type="text" value={formData.code}
                      onChange={e => setFormData(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                      className={`${INPUT} font-mono tracking-widest`} placeholder="SAVE20" maxLength={20} />
                    <button type="button" onClick={() => setFormData(p => ({ ...p, code: genCode() }))}
                      className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-500" title="Random">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Code Prefix</label>
                    <input type="text" value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value.toUpperCase())}
                      className={`${INPUT} font-mono tracking-widest`} placeholder="SALE" maxLength={8} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Count</label>
                    <input type="number" min={2} max={50} value={bulkCount} onChange={e => setBulkCount(Number(e.target.value))}
                      className={INPUT} />
                  </div>
                </div>
              )}

              {/* Discount type + value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                  <div className="flex gap-2">
                    {(['percentage', 'fixed'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setFormData(p => ({ ...p, discount_type: t }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border-2 transition ${
                          formData.discount_type === t ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                                                       : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
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
                  <input type="number" min={0} max={formData.discount_type === 'percentage' ? 100 : undefined}
                    value={formData.discount_value} onChange={e => setFormData(p => ({ ...p, discount_value: Number(e.target.value) }))}
                    className={INPUT} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max Uses</label>
                  <input type="number" min={1} value={formData.max_uses}
                    onChange={e => setFormData(p => ({ ...p, max_uses: e.target.value }))}
                    className={INPUT} placeholder="Unlimited" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expiry Date</label>
                  <input type="date" value={formData.valid_until}
                    onChange={e => setFormData(p => ({ ...p, valid_until: e.target.value }))}
                    className={INPUT} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Min. Order Value (₹) <span className="text-gray-400 font-normal">optional</span></label>
                <input type="number" min={0} value={formData.min_order_value}
                  onChange={e => setFormData(p => ({ ...p, min_order_value: e.target.value }))}
                  className={INPUT} placeholder="No minimum" />
              </div>

              <button type="submit" disabled={isCreating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition-all">
                {isCreating ? 'Creating…' : bulkMode ? `Generate ${bulkCount} Coupons →` : 'Create Coupon →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0D0E1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Delete coupon?</h3>
            <p className="text-sm text-gray-500 mb-5">This coupon will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting === deleteConfirm}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                {deleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
