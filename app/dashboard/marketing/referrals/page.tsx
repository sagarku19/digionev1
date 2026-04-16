'use client';
// Referral Program — create codes, per-code analytics, activity feed.
// DB: referral_codes, order_referrals (direct Supabase)

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import {
  Gift, Plus, X, Copy, Check, Trash2, ToggleLeft, ToggleRight,
  AlertCircle, RefreshCw, Loader2, Users, TrendingUp, IndianRupee,
  Clock, ChevronDown, ChevronUp, BarChart3,
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type RCode = {
  id: string; code: string; is_active: boolean | null;
  created_at: string | null; metadata: any;
};
type Referral = {
  id: string; referral_code_id: string | null;
  commission_amount: number | null; status: string | null;
  created_at: string | null;
};

export default function ReferralsPage() {
  const supabase  = createClient();
  const [codes, setCodes]       = useState<RCode[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode]   = useState(genCode());
  const [rewardPct, setRewardPct] = useState(10);
  const [formError, setFormError] = useState('');
  const [saving, setSaving]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedCode, setExpandedCode]   = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://digione.ai';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pid = await getCreatorProfileId(supabase);
      const { data: rc } = await supabase
        .from('referral_codes').select('*')
        .eq('owner_creator_id', pid).order('created_at', { ascending: false });
      setCodes(rc ?? []);

      if (rc && rc.length > 0) {
        const { data: refs } = await supabase
          .from('order_referrals').select('*')
          .in('referral_code_id', rc.map(r => r.id))
          .order('created_at', { ascending: false });
        setReferrals(refs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newCode.trim() || newCode.length < 4) { setFormError('Code must be at least 4 characters.'); return; }
    setSaving(true);
    try {
      const pid = await getCreatorProfileId(supabase);
      const { error } = await supabase.from('referral_codes').insert({
        code: newCode.toUpperCase().trim(),
        owner_creator_id: pid,
        is_active: true,
        metadata: { reward_percent: rewardPct },
      });
      if (error) throw error;
      setShowModal(false);
      setNewCode(genCode());
      await load();
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to create code.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCode = async (code: RCode) => {
    await supabase.from('referral_codes').update({ is_active: !code.is_active }).eq('id', code.id);
    await load();
  };

  const deleteCode = async (id: string) => {
    await supabase.from('referral_codes').delete().eq('id', id);
    setDeleteConfirm(null);
    await load();
  };

  const refsForCode = (id: string) => referrals.filter(r => r.referral_code_id === id);
  const totalRevenue = referrals.reduce((s, r) => s + (r.commission_amount ?? 0), 0);
  const paidCount    = referrals.filter(r => r.status === 'paid' || r.status === 'settled').length;

  return (
    <>
      <div className="space-y-5 pt-4 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referral Program</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create codes that buyers share to earn rewards</p>
          </div>
          <button onClick={() => { setShowModal(true); setNewCode(genCode()); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition shrink-0">
            <Plus className="w-4 h-4" /> New Code
          </button>
        </div>

        {/* Stats */}
        {!loading && codes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Active Codes',    value: codes.filter(c => c.is_active).length, icon: Gift,         color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
              { label: 'Total Referrals', value: referrals.length,                      icon: Users,        color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
              { label: 'Paid Out',        value: paidCount,                             icon: Check,        color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
              { label: 'Total Rewarded',  value: `₹${totalRevenue.toFixed(0)}`,         icon: IndianRupee,  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
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
        )}

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: '1', title: 'Create a code', desc: 'Set a reward % the referrer earns when their code is used at checkout.' },
            { step: '2', title: 'Buyer shares it', desc: 'Buyers share their unique referral link with friends to earn rewards.' },
            { step: '3', title: 'Sale tracked', desc: 'When someone buys using the code, the referrer earns automatically.' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">{s.step}</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{s.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        )}

        {/* Empty */}
        {!loading && codes.length === 0 && (
          <div className="flex flex-col items-center py-24 text-center bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-800">
              <Gift className="w-7 h-7 text-gray-300 dark:text-gray-700" />
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">No referral codes yet</p>
            <p className="text-sm text-gray-500 max-w-xs mb-5">Create your first code and start a viral loop — buyers share, friends buy, everyone wins.</p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition">
              <Plus className="w-4 h-4" /> Create First Code
            </button>
          </div>
        )}

        {/* Codes list with expandable per-code analytics */}
        {!loading && codes.length > 0 && (
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Referral Codes</h2>
              <span className="text-xs text-gray-400">{codes.length} code{codes.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {codes.map(code => {
                const codeRefs  = refsForCode(code.id);
                const shareUrl  = `${origin}?ref=${code.code}`;
                const isExpanded = expandedCode === code.id;
                const earned    = codeRefs.reduce((s, r) => s + (r.commission_amount ?? 0), 0);

                return (
                  <div key={code.id}>
                    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition group">
                      {/* Code badge */}
                      <div className="shrink-0 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-mono text-sm font-bold text-gray-900 dark:text-white tracking-widest">
                        {code.code}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            code.is_active ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                           : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          }`}>{code.is_active ? 'Active' : 'Inactive'}</span>
                          {code.metadata?.reward_percent && (
                            <span className="text-xs text-gray-500 font-medium">{code.metadata.reward_percent}% reward</span>
                          )}
                          <span className="text-xs text-gray-400">{codeRefs.length} use{codeRefs.length !== 1 ? 's' : ''}</span>
                          {earned > 0 && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">₹{earned.toFixed(0)} rewarded</span>}
                        </div>
                        <CopyButton text={shareUrl} />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {codeRefs.length > 0 && (
                          <button onClick={() => setExpandedCode(isExpanded ? null : code.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
                            title="View referrals">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        <button onClick={() => toggleCode(code)} title={code.is_active ? 'Pause' : 'Activate'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                          {code.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => setDeleteConfirm(code.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable referral activity */}
                    {isExpanded && codeRefs.length > 0 && (
                      <div className="px-5 pb-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-3 mb-2">Referral Activity</p>
                        <div className="space-y-2">
                          {codeRefs.map(ref => (
                            <div key={ref.id} className="flex items-center gap-3 text-xs">
                              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <span className="text-gray-600 dark:text-gray-400 flex-1">Order referral</span>
                              {ref.commission_amount && (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{ref.commission_amount}</span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${
                                ref.status === 'settled' || ref.status === 'paid'
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}>{ref.status ?? 'pending'}</span>
                              {ref.created_at && (
                                <span className="text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent activity feed */}
        {!loading && referrals.length > 0 && (
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" /> Recent Activity
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {referrals.slice(0, 8).map(ref => {
                const codeName = codes.find(c => c.id === ref.referral_code_id)?.code ?? '—';
                return (
                  <div key={ref.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Gift className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        Referral via <span className="font-mono font-semibold">{codeName}</span>
                      </p>
                      {ref.created_at && (
                        <p className="text-xs text-gray-400">{new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      )}
                    </div>
                    {ref.commission_amount ? (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{ref.commission_amount}</span>
                    ) : null}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      ref.status === 'settled' || ref.status === 'paid'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>{ref.status ?? 'pending'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <Gift className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">New Referral Code</h2>
              </div>
              <button onClick={() => { setShowModal(false); setFormError(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Referral Code</label>
                <div className="flex gap-2">
                  <input type="text" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    className={`${INPUT} font-mono tracking-widest`} placeholder="FRIEND20" maxLength={20} />
                  <button type="button" onClick={() => setNewCode(genCode())}
                    className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-500" title="Generate random">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Referrer Reward</label>
                  <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">{rewardPct}%</span>
                </div>
                <input type="range" min={1} max={50} value={rewardPct} onChange={e => setRewardPct(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-gray-800"
                  style={{ accentColor: '#6366f1' }} />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>1%</span><span>Recommended: 5–15%</span><span>50%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">% of sale amount credited to the referrer when their code is used.</p>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">
                {saving ? 'Creating…' : 'Create Code →'}
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
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Delete referral code?</h3>
            <p className="text-sm text-gray-500 mb-5">All referral history for this code will also be removed.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={() => deleteCode(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
