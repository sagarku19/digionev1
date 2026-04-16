'use client';
// Affiliates — invite partners, set commission, toggle status, copy invite link, track earnings.
// DB: affiliates (via useAffiliates hook)

import React, { useState } from 'react';
import { useAffiliates } from '@/hooks/useAffiliates';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  Network, Plus, X, Copy, Check, Trash2, ToggleLeft, ToggleRight,
  Percent, AlertCircle, UserCheck, Info, Search, RefreshCw,
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function CommissionSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pct = Math.min(value, 80);
  const color = pct <= 20 ? 'bg-emerald-500' : pct <= 40 ? 'bg-indigo-500' : pct <= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Commission Rate</label>
        <span className={`text-base font-extrabold ${pct <= 20 ? 'text-emerald-600' : pct <= 40 ? 'text-indigo-600' : pct <= 60 ? 'text-amber-600' : 'text-red-600'}`}>
          {value}%
        </span>
      </div>
      <input type="range" min={1} max={80} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-gray-800"
        style={{ accentColor: pct <= 20 ? '#10b981' : pct <= 40 ? '#6366f1' : pct <= 60 ? '#f59e0b' : '#ef4444' }}
      />
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>1% min</span>
        <span className="text-emerald-600">Recommended: 10–30%</span>
        <span>80% max</span>
      </div>
    </div>
  );
}

export default function AffiliatesPage() {
  const { affiliates, isLoading, inviteAffiliate, updateAffiliate, removeAffiliate, isInviting } = useAffiliates();
  const [showModal, setShowModal]     = useState(false);
  const [affiliateUserId, setAffiliateUserId] = useState('');
  const [commission, setCommission]   = useState(20);
  const [formError, setFormError]     = useState('');
  const [search, setSearch]           = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editCommission, setEditCommission] = useState<{ id: string; value: number } | null>(null);
  const [savingCommission, setSavingCommission] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!affiliateUserId.trim()) { setFormError('Affiliate user ID is required.'); return; }
    if (commission <= 0 || commission > 80) { setFormError('Commission must be 1–80%.'); return; }
    try {
      await inviteAffiliate({ affiliate_user_id: affiliateUserId.trim(), commission_percent: commission });
      setShowModal(false);
      setAffiliateUserId('');
      setCommission(20);
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to add affiliate.');
    }
  };

  const handleSaveCommission = async () => {
    if (!editCommission) return;
    setSavingCommission(true);
    await updateAffiliate({ id: editCommission.id, updates: { commission_percent: editCommission.value } });
    setSavingCommission(false);
    setEditCommission(null);
  };

  const toggleActive = (aff: any) => updateAffiliate({ id: aff.id, updates: { is_active: !aff.is_active } });

  const filtered = affiliates.filter((a: any) =>
    !search || a.affiliate_user_id?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = affiliates.filter((a: any) => a.is_active).length;
  const avgCommission = affiliates.length ? Math.round(affiliates.reduce((s: number, a: any) => s + (a.commission_percent || 0), 0) / affiliates.length) : 0;

  return (
    <>
      <div className="space-y-5 pt-4 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Affiliates</h1>
            <p className="text-sm text-gray-500 mt-0.5">Invite partners to promote your products on commission</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition shrink-0">
            <Plus className="w-4 h-4" /> Add Affiliate
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Affiliates', value: affiliates.length, icon: Network,    color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
            { label: 'Active',           value: activeCount,       icon: UserCheck,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { label: 'Avg. Commission',  value: `${avgCommission}%`, icon: Percent,  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
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

        {/* How it works banner */}
        <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl">
          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-700 dark:text-indigo-400 space-y-1">
            <p className="font-bold">How affiliates work</p>
            <p className="text-xs leading-relaxed">Each affiliate gets a unique referral link. When a buyer uses it and completes a purchase, the affiliate earns their commission % — automatically credited to their wallet.</p>
          </div>
        </div>

        {/* Search */}
        {affiliates.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user ID…"
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 text-gray-900 dark:text-white placeholder-gray-400" />
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Affiliates</h2>
            <span className="text-xs text-gray-400">{filtered.length} partner{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {isLoading ? (
            <div className="p-10 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading affiliates…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-800">
                <Network className="w-7 h-7 text-gray-300 dark:text-gray-700" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">No affiliates yet</p>
              <p className="text-sm text-gray-500 mb-5 max-w-xs">Add your first partner to start growing your reach through commission-based promotion.</p>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition">
                <Plus className="w-4 h-4" /> Add First Affiliate
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((aff: any) => {
                const link = `${origin}/ref/${aff.affiliate_user_id}`;
                const isEditing = editCommission?.id === aff.id;
                return (
                  <div key={aff.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition group">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 text-white font-bold text-sm">
                      {aff.affiliate_user_id?.[0]?.toUpperCase() ?? 'A'}
                    </div>

                    {/* ID + link */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                        {aff.affiliate_user_id}
                      </p>
                      <CopyButton text={link} label="Copy referral link" />
                    </div>

                    {/* Commission — editable inline */}
                    <div className="shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input type="number" min={1} max={80} value={editCommission!.value}
                            onChange={e => setEditCommission({ id: aff.id, value: Number(e.target.value) })}
                            className="w-16 px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-indigo-400 rounded-lg text-sm font-bold text-center outline-none" />
                          <span className="text-gray-500 text-sm">%</span>
                          <button onClick={handleSaveCommission} disabled={savingCommission}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition">
                            {savingCommission ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setEditCommission(null)} className="p-1 text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditCommission({ id: aff.id, value: aff.commission_percent })}
                          className="flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition group/edit"
                          title="Click to edit">
                          <Percent className="w-3.5 h-3.5" />{aff.commission_percent}%
                          <span className="text-[10px] text-gray-300 dark:text-gray-700 group-hover/edit:text-indigo-400 ml-0.5">edit</span>
                        </button>
                      )}
                    </div>

                    {/* Status */}
                    <StatusPill status={aff.is_active ? 'active' : 'inactive'} />

                    {/* Joined */}
                    <span className="hidden md:inline text-xs text-gray-400 shrink-0">
                      {new Date(aff.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                      <button onClick={() => toggleActive(aff)} title={aff.is_active ? 'Pause' : 'Activate'}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        {aff.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => setDeleteConfirm(aff.id)}
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

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <Network className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Affiliate</h2>
              </div>
              <button onClick={() => { setShowModal(false); setFormError(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Affiliate's User ID</label>
                <input type="text" required autoFocus value={affiliateUserId} onChange={e => setAffiliateUserId(e.target.value)}
                  placeholder="Paste their DigiOne user ID" className={INPUT} />
                <p className="text-xs text-gray-400 mt-1.5">The affiliate must have a DigiOne account. Ask them to share their User ID from profile settings.</p>
              </div>

              <CommissionSlider value={commission} onChange={setCommission} />

              <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Their unique referral link will be: <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">{origin}/ref/[their-user-id]</span>
                </p>
              </div>

              <button type="submit" disabled={isInviting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">
                {isInviting ? 'Adding…' : 'Add Affiliate →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0D0E1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Remove affiliate?</h3>
            <p className="text-sm text-gray-500 mb-5">This partner will be permanently removed from your affiliate program.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={async () => { await removeAffiliate(deleteConfirm); setDeleteConfirm(null); }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
