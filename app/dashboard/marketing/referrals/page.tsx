'use client';
// Referral Program — create codes, per-code analytics, activity feed.
// DB: referral_codes, order_referrals (direct Supabase)

import React, { useState } from 'react';
import { useReferrals, type ReferralCode } from '@/hooks/useReferrals';
import {
  Gift, Plus, X, Copy, Check, Trash2, ToggleLeft, ToggleRight,
  AlertCircle, RefreshCw, Loader2, Users, TrendingUp, IndianRupee,
  Clock, ChevronDown, ChevronUp, BarChart3,
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-lg)] text-sm focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:underline font-medium focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
      {copied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function ReferralsPage() {
  const {
    codes,
    redemptions: referrals,
    isLoading: loading,
    createCode,
    toggleActive,
    deleteCode: deleteRefCode,
  } = useReferrals();
  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode]   = useState(genCode());
  const [rewardPct, setRewardPct] = useState(10);
  const [formError, setFormError] = useState('');
  const [saving, setSaving]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedCode, setExpandedCode]   = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://digione.ai';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newCode.trim() || newCode.length < 4) { setFormError('Code must be at least 4 characters.'); return; }
    setSaving(true);
    try {
      await createCode({ code: newCode.toUpperCase().trim(), reward_percent: rewardPct });
      setShowModal(false);
      setNewCode(genCode());
    } catch (err) {
      setFormError((err as Error).message ?? 'Failed to create code.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCode = (code: ReferralCode) => { toggleActive(code); };

  const deleteCode = (id: string) => { deleteRefCode(id); setDeleteConfirm(null); };

  const refsForCode = (id: string) => referrals.filter(r => r.referral_code_id === id);
  const totalRevenue = referrals.reduce((s, r) => s + (r.commission_amount ?? 0), 0);
  const paidCount    = referrals.filter(r => r.status === 'paid' || r.status === 'settled').length;

  return (
    <>
      <div className="space-y-5 pt-4 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Referral Program</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Create codes that buyers share to earn rewards</p>
          </div>
          <button onClick={() => { setShowModal(true); setNewCode(genCode()); }}
            className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-4 py-2.5 rounded-[var(--radius-lg)] font-semibold text-sm shadow-[var(--shadow-xs)] transition shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <Plus className="w-4 h-4" /> New Code
          </button>
        </div>

        {/* Stats */}
        {!loading && codes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Active Codes',    value: codes.filter(c => c.is_active).length, icon: Gift,        color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--surface-muted)]' },
              { label: 'Total Referrals', value: referrals.length,                      icon: Users,       color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--surface-muted)]' },
              { label: 'Paid Out',        value: paidCount,                             icon: Check,       color: 'text-[var(--success)]',        bg: 'bg-[var(--success-bg)]' },
              { label: 'Total Rewarded',  value: `₹${totalRevenue.toFixed(0)}`,         icon: IndianRupee, color: 'text-[var(--warning)]',        bg: 'bg-[var(--warning-bg)]' },
            ].map(s => (
              <div key={s.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0 ${s.bg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-[var(--text-primary)] leading-none">{s.value}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{s.label}</p>
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
            <div key={s.step} className="flex items-start gap-3 p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-lg)]">
              <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-extrabold flex items-center justify-center shrink-0">{s.step}</div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">{s.title}</p>
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--text-secondary)]" />
          </div>
        )}

        {/* Empty */}
        {!loading && codes.length === 0 && (
          <div className="flex flex-col items-center py-24 text-center bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
            <div className="w-14 h-14 bg-[var(--surface-muted)] rounded-[var(--radius-lg)] flex items-center justify-center mb-4 border border-[var(--border)]">
              <Gift className="w-7 h-7 text-[var(--text-tertiary)]" />
            </div>
            <p className="font-semibold text-[var(--text-primary)] mb-1">No referral codes yet</p>
            <p className="text-sm text-[var(--text-tertiary)] max-w-xs mb-5">Create your first code and start a viral loop — buyers share, friends buy, everyone wins.</p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-5 py-2.5 rounded-[var(--radius-lg)] font-semibold text-sm shadow-[var(--shadow-xs)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              <Plus className="w-4 h-4" /> Create First Code
            </button>
          </div>
        )}

        {/* Codes list with expandable per-code analytics */}
        {!loading && codes.length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Referral Codes</h2>
              <span className="text-xs text-[var(--text-tertiary)]">{codes.length} code{codes.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {codes.map(code => {
                const codeRefs  = refsForCode(code.id);
                const shareUrl  = `${origin}?ref=${code.code}`;
                const isExpanded = expandedCode === code.id;
                const earned    = codeRefs.reduce((s, r) => s + (r.commission_amount ?? 0), 0);

                return (
                  <div key={code.id}>
                    <div className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--surface-hover)] transition group">
                      {/* Code badge */}
                      <div className="shrink-0 bg-[var(--surface-muted)] px-3 py-1.5 rounded-[var(--radius-sm)] font-mono text-sm font-bold text-[var(--text-primary)] tracking-widest">
                        {code.code}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            code.is_active ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                           : 'bg-[var(--surface-muted)] text-[var(--text-tertiary)]'
                          }`}>{code.is_active ? 'Active' : 'Inactive'}</span>
                          {code.metadata?.reward_percent && (
                            <span className="text-xs text-[var(--text-tertiary)] font-medium">{code.metadata.reward_percent}% reward</span>
                          )}
                          <span className="text-xs text-[var(--text-tertiary)]">{codeRefs.length} use{codeRefs.length !== 1 ? 's' : ''}</span>
                          {earned > 0 && <span className="text-xs text-[var(--success)] font-semibold">₹{earned.toFixed(0)} rewarded</span>}
                        </div>
                        <CopyButton text={shareUrl} />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {codeRefs.length > 0 && (
                          <button onClick={() => setExpandedCode(isExpanded ? null : code.id)}
                            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--brand)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                            title="View referrals">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        <button onClick={() => toggleCode(code)} title={code.is_active ? 'Pause' : 'Activate'}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                          {code.is_active ? <ToggleRight className="w-5 h-5 text-[var(--success)]" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => setDeleteConfirm(code.id)}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable referral activity */}
                    {isExpanded && codeRefs.length > 0 && (
                      <div className="px-5 pb-4 bg-[var(--surface-muted)] border-t border-[var(--border)]">
                        <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mt-3 mb-2">Referral Activity</p>
                        <div className="space-y-2">
                          {codeRefs.map(ref => (
                            <div key={ref.id} className="flex items-center gap-3 text-xs">
                              <div className="w-5 h-5 rounded-full bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
                                <TrendingUp className="w-2.5 h-2.5 text-[var(--text-secondary)]" />
                              </div>
                              <span className="text-[var(--text-secondary)] flex-1">Order referral</span>
                              {ref.commission_amount && (
                                <span className="font-semibold text-[var(--success)]">₹{ref.commission_amount}</span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${
                                ref.status === 'settled' || ref.status === 'paid'
                                  ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                  : 'bg-[var(--warning-bg)] text-[var(--warning)]'
                              }`}>{ref.status ?? 'pending'}</span>
                              {ref.created_at && (
                                <span className="text-[var(--text-tertiary)] flex items-center gap-1">
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
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)]">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[var(--text-secondary)]" /> Recent Activity
              </h2>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {referrals.slice(0, 8).map(ref => {
                const codeName = codes.find(c => c.id === ref.referral_code_id)?.code ?? '—';
                return (
                  <div key={ref.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
                      <Gift className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)]">
                        Referral via <span className="font-mono font-semibold">{codeName}</span>
                      </p>
                      {ref.created_at && (
                        <p className="text-xs text-[var(--text-tertiary)]">{new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      )}
                    </div>
                    {ref.commission_amount ? (
                      <span className="text-sm font-bold text-[var(--success)]">₹{ref.commission_amount}</span>
                    ) : null}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      ref.status === 'settled' || ref.status === 'paid'
                        ? 'bg-[var(--success-bg)] text-[var(--success)]'
                        : 'bg-[var(--warning-bg)] text-[var(--warning)]'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-md border border-[var(--border)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[var(--surface-muted)] rounded-[var(--radius-lg)] flex items-center justify-center">
                  <Gift className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">New Referral Code</h2>
              </div>
              <button onClick={() => { setShowModal(false); setFormError(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[var(--radius-lg)] text-sm text-[var(--danger)]">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Referral Code</label>
                <div className="flex gap-2">
                  <input type="text" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    className={`${INPUT} font-mono tracking-widest`} placeholder="FRIEND20" maxLength={20} />
                  <button type="button" onClick={() => setNewCode(genCode())}
                    className="p-2.5 border border-[var(--border)] rounded-[var(--radius-lg)] hover:bg-[var(--surface-hover)] transition text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]" title="Generate random">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Referrer Reward</label>
                  <span className="text-base font-extrabold text-[var(--text-primary)]">{rewardPct}%</span>
                </div>
                <input type="range" min={1} max={50} value={rewardPct} onChange={e => setRewardPct(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--border)]"
                  style={{ accentColor: 'var(--brand)' }} />
                <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mt-1">
                  <span>1%</span><span>Recommended: 5–15%</span><span>50%</span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1.5">% of sale amount credited to the referrer when their code is used.</p>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] py-3 rounded-[var(--radius-lg)] font-bold text-sm shadow-[var(--shadow-xs)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                {saving ? 'Creating…' : 'Create Code →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-sm w-full shadow-[var(--shadow-lg)]">
            <div className="w-12 h-12 rounded-full bg-[var(--danger-bg)] flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-[var(--danger)]" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-1">Delete referral code?</h3>
            <p className="text-sm text-[var(--text-tertiary)] mb-5">All referral history for this code will also be removed.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-[var(--border)] rounded-[var(--radius-lg)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Cancel</button>
              <button onClick={() => deleteCode(deleteConfirm)}
                className="flex-1 py-2.5 bg-[var(--danger)] hover:opacity-90 text-white rounded-[var(--radius-lg)] text-sm font-semibold transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
