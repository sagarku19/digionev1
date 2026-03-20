'use client';
// Buyer Referral Program — creator manages referral codes, buyers share to earn rewards.
// DB tables: referral_codes (read/write), order_referrals (read)

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import {
  Users, Plus, X, Copy, Check, Trash2, ToggleLeft, ToggleRight,
  AlertCircle, Gift, Link as LinkIcon, RefreshCw, Loader2
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type RCode = { id: string; code: string; is_active: boolean | null; created_at: string | null; metadata: any };
type Referral = { id: string; referral_code_id: string | null; commission_amount: number | null; status: string | null; created_at: string | null };

export default function ReferralsPage() {
  const supabase = createClient();

  const [codes, setCodes] = useState<RCode[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode] = useState(genCode());
  const [rewardPercent, setRewardPercent] = useState(10);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://digione.in';

  async function load() {
    setLoading(true);
    try {
      const profileId = await getCreatorProfileId(supabase);
      const { data: rc } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('owner_creator_id', profileId)
        .order('created_at', { ascending: false });
      setCodes(rc ?? []);

      if (rc && rc.length > 0) {
        const codeIds = rc.map(r => r.id);
        const { data: refs } = await supabase
          .from('order_referrals')
          .select('*')
          .in('referral_code_id', codeIds)
          .order('created_at', { ascending: false });
        setReferrals(refs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newCode.trim() || newCode.length < 4) { setFormError('Code must be at least 4 characters.'); return; }
    setSaving(true);
    try {
      const profileId = await getCreatorProfileId(supabase);
      const { error } = await supabase.from('referral_codes').insert({
        code: newCode.toUpperCase().trim(),
        owner_creator_id: profileId,
        is_active: true,
        metadata: { reward_percent: rewardPercent },
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
    if (!confirm('Delete this referral code?')) return;
    await supabase.from('referral_codes').delete().eq('id', id);
    await load();
  };

  const refsByCode = (codeId: string) => referrals.filter(r => r.referral_code_id === codeId);
  const totalCommission = referrals.reduce((s, r) => s + (r.commission_amount ?? 0), 0);
  const paidReferrals = referrals.filter(r => r.status === 'paid');

  return (
    <>
      <div className="space-y-6 pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Gift className="w-6 h-6 text-gray-400" />
              Referral Program
            </h1>
            <p className="text-sm text-gray-500 mt-1">Create referral codes that buyers share to earn rewards on each sale.</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setNewCode(genCode()); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Code
          </button>
        </div>

        {/* Stats */}
        {!loading && codes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Active Codes', value: codes.filter(c => c.is_active).length },
              { label: 'Total Referrals', value: referrals.length },
              { label: 'Paid Referrals', value: paidReferrals.length },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* How it works */}
        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-800/40 rounded-xl p-4">
          <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-2">How Referrals Work</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-indigo-600 dark:text-indigo-300">
            {[
              ['1. Create a code', 'Set a reward % for the referrer when their code is used at checkout'],
              ['2. Buyer shares it', 'Buyers share their unique link with friends to earn rewards'],
              ['3. Sale tracked', 'When someone buys using the code, the referrer gets their reward'],
            ].map(([title, desc]) => (
              <div key={title}>
                <p className="font-semibold mb-0.5">{title}</p>
                <p className="opacity-80">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        )}

        {/* Codes list */}
        {!loading && codes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-5">
              <LinkIcon className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No referral codes yet</h2>
            <p className="text-gray-500 text-sm max-w-xs mb-6">Create your first code and start a viral loop — buyers share, friends buy, everyone wins.</p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create first code
            </button>
          </div>
        )}

        {!loading && codes.length > 0 && (
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
            {codes.map(code => {
              const codeRefs = refsByCode(code.id);
              const shareUrl = `${origin}?ref=${code.code}`;
              return (
                <div key={code.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition">
                  {/* Code badge */}
                  <div className="shrink-0 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-mono text-sm font-bold text-gray-900 dark:text-white tracking-widest">
                    {code.code}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${code.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'}`}>
                        {code.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-500">{codeRefs.length} referral{codeRefs.length !== 1 ? 's' : ''}</span>
                      {code.metadata?.reward_percent && (
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{code.metadata.reward_percent}% reward</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400 truncate max-w-xs">{shareUrl}</p>
                      <CopyButton text={shareUrl} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleCode(code)} title={code.is_active ? 'Deactivate' : 'Activate'} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition">
                      {code.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => deleteCode(code.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Referral Code</h2>
              <button onClick={() => { setShowModal(false); setFormError(''); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Referral Code</label>
                <div className="flex gap-2">
                  <input
                    type="text" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    className={`${INPUT} font-mono tracking-widest`}
                    placeholder="FRIEND20"
                    maxLength={20}
                  />
                  <button type="button" onClick={() => setNewCode(genCode())} className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-500">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Referrer Reward</label>
                <div className="relative">
                  <input type="number" min={1} max={50} value={rewardPercent} onChange={e => setRewardPercent(parseInt(e.target.value) || 0)} className={`${INPUT} pr-8`} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">% of sale amount credited to the person who shared the code.</p>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all">
                {saving ? 'Creating…' : 'Create Code →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
