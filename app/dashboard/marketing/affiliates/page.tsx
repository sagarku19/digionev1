'use client';
// Affiliates — invite partners, set commission, toggle status, copy invite link, track earnings.
// DB: affiliates (via useAffiliates hook)

import React, { useState } from 'react';
import { GuideButton } from '@/components/dashboard/guides/GuideButton';
import { useAffiliates } from '@/hooks/marketing/useAffiliates';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  Network, Plus, X, Copy, Check, Trash2, ToggleLeft, ToggleRight,
  Percent, AlertCircle, UserCheck, Info, Search, RefreshCw,
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition';

function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-[var(--brand)] hover:underline font-medium focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
      {copied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function CommissionSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pct = Math.min(value, 80);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--text-secondary)]">Commission Rate</label>
        <span className={`text-base font-extrabold ${pct <= 20 ? 'text-[var(--success)]' : pct <= 40 ? 'text-[var(--brand)]' : pct <= 60 ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`}>
          {value}%
        </span>
      </div>
      <input type="range" min={1} max={80} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--border)]"
        style={{ accentColor: pct <= 20 ? 'var(--success)' : pct <= 40 ? 'var(--brand)' : pct <= 60 ? 'var(--warning)' : 'var(--danger)' }}
      />
      <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
        <span>1% min</span>
        <span className="text-[var(--success)]">Recommended: 10–30%</span>
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
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to add affiliate.');
    }
  };

  const handleSaveCommission = async () => {
    if (!editCommission) return;
    setSavingCommission(true);
    await updateAffiliate({ id: editCommission.id, updates: { commission_percent: editCommission.value } });
    setSavingCommission(false);
    setEditCommission(null);
  };

  const toggleActive = (aff: typeof affiliates[number]) => updateAffiliate({ id: aff.id, updates: { is_active: !aff.is_active } });

  const filtered = affiliates.filter((a) =>
    !search || a.affiliate_user_id?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = affiliates.filter((a) => a.is_active).length;
  const avgCommission = affiliates.length ? Math.round(affiliates.reduce((s, a) => s + (a.commission_percent || 0), 0) / affiliates.length) : 0;

  return (
    <>
      <div className="space-y-5 pt-4 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Affiliates</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Invite partners to promote your products on commission</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <GuideButton guideKey="affiliates" />
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2.5 rounded-[var(--radius-sm)] font-semibold text-sm shadow-[var(--shadow-xs)] transition shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              <Plus className="w-4 h-4" /> Add Affiliate
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Affiliates', value: affiliates.length, icon: Network,   color: 'text-[var(--brand)]',    bg: 'bg-[var(--surface-muted)]' },
            { label: 'Active',           value: activeCount,       icon: UserCheck, color: 'text-[var(--success)]',  bg: 'bg-[var(--success-bg)]' },
            { label: 'Avg. Commission',  value: `${avgCommission}%`, icon: Percent, color: 'text-[var(--warning)]',  bg: 'bg-[var(--warning-bg)]' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-[var(--text-primary)] leading-none">{s.value}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* How it works banner */}
        <div className="flex items-start gap-3 p-4 bg-[var(--info-bg)] border border-[var(--info)]/20 rounded-[var(--radius-lg)]">
          <Info className="w-4 h-4 text-[var(--info)] shrink-0 mt-0.5" />
          <div className="text-sm text-[var(--info)] space-y-1">
            <p className="font-bold">How affiliates work</p>
            <p className="text-xs leading-relaxed">Each affiliate gets a unique referral link. When a buyer uses it and completes a purchase, the affiliate earns their commission % — automatically credited to their wallet.</p>
          </div>
        </div>

        {/* Search */}
        {affiliates.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user ID…"
              className="w-full pl-9 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm outline-none focus:border-[var(--border-strong)] focus-visible:shadow-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
          </div>
        )}

        {/* Table */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">All Affiliates</h2>
            <span className="text-xs text-[var(--text-tertiary)]">{filtered.length} partner{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {isLoading ? (
            <div className="p-10 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-[var(--brand)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-tertiary)]">Loading affiliates…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="w-14 h-14 bg-[var(--surface-muted)] rounded-[var(--radius-lg)] flex items-center justify-center mb-4 border border-[var(--border)]">
                <Network className="w-7 h-7 text-[var(--text-tertiary)]" />
              </div>
              <p className="font-semibold text-[var(--text-primary)] mb-1">No affiliates yet</p>
              <p className="text-sm text-[var(--text-tertiary)] mb-5 max-w-xs">Add your first partner to start growing your reach through commission-based promotion.</p>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold shadow-[var(--shadow-xs)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <Plus className="w-4 h-4" /> Add First Affiliate
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((aff) => {
                const link = `${origin}/ref/${aff.affiliate_user_id}`;
                const isEditing = editCommission?.id === aff.id;
                return (
                  <div key={aff.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--surface-hover)] transition group">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-[var(--brand)] flex items-center justify-center shrink-0 text-[var(--text-on-brand)] font-bold text-sm">
                      {aff.affiliate_user_id?.[0]?.toUpperCase() ?? 'A'}
                    </div>

                    {/* ID + link */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-semibold text-[var(--text-primary)] truncate max-w-[180px]">
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
                            className="w-16 px-2 py-1 bg-[var(--surface-muted)] border border-[var(--brand)] rounded-[var(--radius-sm)] text-sm font-bold text-center focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]" />
                          <span className="text-[var(--text-secondary)] text-sm">%</span>
                          <button onClick={handleSaveCommission} disabled={savingCommission}
                            className="px-2 py-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] rounded-[var(--radius-sm)] text-xs font-bold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                            {savingCommission ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setEditCommission(null)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditCommission({ id: aff.id, value: aff.commission_percent })}
                          className="flex items-center gap-1 text-sm font-bold text-[var(--text-primary)] hover:text-[var(--brand)] transition group/edit focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                          title="Click to edit">
                          <Percent className="w-3.5 h-3.5" />{aff.commission_percent}%
                          <span className="text-[10px] text-[var(--text-tertiary)] group-hover/edit:text-[var(--brand)] ml-0.5">edit</span>
                        </button>
                      )}
                    </div>

                    {/* Status */}
                    <StatusPill status={aff.is_active ? 'active' : 'inactive'} />

                    {/* Joined */}
                    <span className="hidden md:inline text-xs text-[var(--text-tertiary)] shrink-0">
                      {new Date(aff.created_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                      <button onClick={() => toggleActive(aff)} title={aff.is_active ? 'Pause' : 'Activate'}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                        {aff.is_active ? <ToggleRight className="w-5 h-5 text-[var(--success)]" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => setDeleteConfirm(aff.id)}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-md border border-[var(--border)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[var(--surface-muted)] rounded-[var(--radius-sm)] flex items-center justify-center">
                  <Network className="w-4 h-4 text-[var(--brand)]" />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Add Affiliate</h2>
              </div>
              <button onClick={() => { setShowModal(false); setFormError(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[var(--radius-sm)] text-sm text-[var(--danger)]">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Affiliate&apos;s User ID</label>
                <input type="text" required autoFocus value={affiliateUserId} onChange={e => setAffiliateUserId(e.target.value)}
                  placeholder="Paste their DigiOne user ID" className={INPUT} />
                <p className="text-xs text-[var(--text-tertiary)] mt-1.5">The affiliate must have a DigiOne account. Ask them to share their User ID from profile settings.</p>
              </div>

              <CommissionSlider value={commission} onChange={setCommission} />

              <div className="p-3 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-sm)]">
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                  Their unique referral link will be: <span className="font-mono text-[var(--brand)] break-all">{origin}/ref/[their-user-id]</span>
                </p>
              </div>

              <button type="submit" disabled={isInviting}
                className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-[var(--text-on-brand)] py-3 rounded-[var(--radius-sm)] font-bold text-sm shadow-[var(--shadow-xs)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                {isInviting ? 'Adding…' : 'Add Affiliate →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 max-w-sm w-full shadow-[var(--shadow-lg)]">
            <div className="w-12 h-12 rounded-full bg-[var(--danger-bg)] flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-[var(--danger)]" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-1">Remove affiliate?</h3>
            <p className="text-sm text-[var(--text-tertiary)] mb-5">This partner will be permanently removed from your affiliate program.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-[var(--border)] rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Cancel</button>
              <button onClick={async () => { await removeAffiliate(deleteConfirm); setDeleteConfirm(null); }}
                className="flex-1 py-2.5 bg-[var(--danger)] hover:opacity-90 text-white rounded-[var(--radius-sm)] text-sm font-semibold transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <Trash2 className="w-4 h-4" /> Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
