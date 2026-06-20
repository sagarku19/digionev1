'use client';

import React, { useState, useMemo } from 'react';
import { useEarnings } from '@/hooks/commerce/useEarnings';
import { StatusPill } from '@/components/ui/StatusPill';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ArrowUpRight, CheckCircle2, AlertCircle, Clock, TrendingUp,
  X, Building2, Wallet, CreditCard, History, ChevronRight,
  IndianRupee, ArrowDownLeft, Banknote, ShieldCheck, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { formatINR, formatINRCompact } from '@/lib/format';

type Tab = 'history' | 'overview';

export default function EarningsPage() {
  const { creatorBalances, payouts, kyc, isLoading, refreshEarnings } = useEarnings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isKycVerified = kyc?.status === 'verified';
  const available = creatorBalances?.available_balance || 0;
  const pending = creatorBalances?.pending_payout || 0;
  const totalEarnings = creatorBalances?.total_earnings || 0;
  const totalPaidOut = creatorBalances?.total_paid_out || 0;
  const platformFees = creatorBalances?.total_platform_fees || 0;

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const amt = parseFloat(payoutAmount);
    if (!amt || amt <= 0) { setErrorMsg('Please enter a valid amount.'); return; }
    if (amt > available) { setErrorMsg('Cannot request more than your available balance.'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to request payout');
      setIsModalOpen(false);
      setPayoutAmount('');
      refreshEarnings();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to request payout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPayouts = useMemo(() => {
    if (statusFilter === 'all') return payouts;
    return payouts.filter((p) => p.status === statusFilter);
  }, [payouts, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: payouts.length };
    for (const p of payouts) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [payouts]);

  const totalWithdrawn = useMemo(() =>
    payouts
      .filter((p) => p.status === 'completed' || p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0),
    [payouts]
  );

  const requestPayoutButton = (
    <button
      onClick={() => setIsModalOpen(true)}
      disabled={available <= 0 || isLoading}
      className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-on-brand)] px-5 py-2.5 rounded-[var(--radius-sm)] font-semibold shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <ArrowUpRight size={16} />
      Request Payout
    </button>
  );

  return (
    <>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Earnings & Payouts"
          description="Track your balance, request withdrawals, and manage payout history."
          action={requestPayoutButton}
        />

        {/* Payout Eligibility Banner */}
        {!isLoading && isKycVerified && available > 0 && available < 100 && (
          <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-[var(--radius-lg)] p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--warning)]/20 rounded-[var(--radius-sm)] shrink-0">
                <AlertCircle size={18} className="text-[var(--warning)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Below minimum payout threshold</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Your available balance is {formatINR(available)}. A minimum of ₹100 is required to request a payout.
                  You need {formatINR(100 - available)} more.
                </p>
              </div>
            </div>
            <div className="shrink-0 px-4 py-1.5 bg-[var(--warning)]/15 rounded-[var(--radius-sm)] text-xs font-bold text-[var(--warning)] border border-[var(--warning)]/20">
              {formatINR(available)} / ₹100 min
            </div>
          </div>
        )}

        {/* Payout Ready Banner */}
        {!isLoading && isKycVerified && available >= 100 && (
          <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-[var(--radius-lg)] p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--success)]/20 rounded-[var(--radius-sm)] shrink-0">
                <CheckCircle2 size={18} className="text-[var(--success)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Payout available</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {formatINR(available)} is ready to withdraw. Minimum threshold of ₹100 met.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--success)] text-sm font-semibold px-4 py-2 border border-[var(--success)]/30 rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              Withdraw Now <ArrowUpRight size={14} />
            </button>
          </div>
        )}

        {/* KYC Banner */}
        {!isLoading && !isKycVerified && (
          <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-[var(--radius-lg)] p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--warning)]/20 rounded-[var(--radius-sm)]">
                <ShieldAlert size={18} className="text-[var(--warning)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">KYC verification required to withdraw</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Complete your identity and bank account verification to enable payouts.</p>
              </div>
            </div>
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-1.5 whitespace-nowrap bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--warning)] text-sm font-semibold px-4 py-2 border border-[var(--warning)]/30 rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              Complete KYC <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Balance Cards */}
        <KpiGrid>
          {isLoading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
                  <Skeleton className="h-3 w-24 mb-4" />
                  <Skeleton className="h-9 w-36 mb-3" />
                  <Skeleton className="h-2 w-20" />
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Available */}
              <div className="bg-[var(--brand)] rounded-[var(--radius-lg)] p-5 text-[var(--text-on-brand)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--text-on-brand)]/10 rounded-full -translate-y-8 translate-x-8" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-[var(--text-on-brand)]/70 uppercase tracking-wider">Available</span>
                    <Wallet size={16} className="text-[var(--text-on-brand)]/70" />
                  </div>
                  <p className="text-3xl font-bold tracking-tight mb-1">{formatINRCompact(available)}</p>
                  <p className="text-xs text-[var(--text-on-brand)]/70">Ready to withdraw</p>
                </div>
              </div>

              {/* Pending */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Pending</span>
                  <span className="p-1.5 bg-[var(--warning-bg)] rounded-[var(--radius-sm)]">
                    <Clock size={14} className="text-[var(--warning)]" />
                  </span>
                </div>
                <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-1">{formatINRCompact(pending)}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Under 48hr settlement</p>
              </div>

              {/* Total Earnings */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Earned</span>
                  <span className="p-1.5 bg-[var(--success-bg)] rounded-[var(--radius-sm)]">
                    <TrendingUp size={14} className="text-[var(--success)]" />
                  </span>
                </div>
                <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-1">{formatINRCompact(totalEarnings)}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Lifetime gross revenue</p>
              </div>

              {/* Total Paid Out */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Withdrawn</span>
                  <span className="p-1.5 bg-[var(--info-bg)] rounded-[var(--radius-sm)]">
                    <ArrowDownLeft size={14} className="text-[var(--info)]" />
                  </span>
                </div>
                <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-1">{formatINRCompact(totalPaidOut)}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Total disbursed</p>
              </div>
            </>
          )}
        </KpiGrid>

        {/* Ledger Breakdown */}
        {!isLoading && totalEarnings > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Balance Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Gross Earnings', amount: totalEarnings, color: 'bg-[var(--success)]', icon: IndianRupee },
                { label: 'Platform Fees', amount: -platformFees, color: 'bg-[var(--danger)]', icon: CreditCard },
                { label: 'Total Paid Out', amount: -totalPaidOut, color: 'bg-[var(--info)]', icon: Banknote },
                { label: 'Pending Clearance', amount: -pending, color: 'bg-[var(--warning)]', icon: Clock },
              ].map(({ label, amount, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon size={13} className="text-[var(--text-tertiary)] shrink-0" />
                    <span className="text-sm text-[var(--text-secondary)] truncate">{label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${amount < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                    {amount < 0 ? `- ${formatINR(-amount)}` : formatINR(amount)}
                  </span>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-secondary)]">Net Available</span>
                <span className="text-sm font-bold text-[var(--text-secondary)]">{formatINR(available)}</span>
              </div>
            </div>
          </Card>
        )}

        {/* KYC Status Card */}
        {!isLoading && (
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isKycVerified ? (
                  <div className="p-2 bg-[var(--success-bg)] rounded-[var(--radius-sm)]">
                    <ShieldCheck size={18} className="text-[var(--success)]" />
                  </div>
                ) : (
                  <div className="p-2 bg-[var(--warning-bg)] rounded-[var(--radius-sm)]">
                    <ShieldAlert size={18} className="text-[var(--warning)]" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    KYC & Bank Account
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {isKycVerified
                      ? 'Identity verified · Payouts enabled'
                      : 'Verification pending · Payouts disabled until complete'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={kyc?.status ?? 'pending'} type="kyc" />
                <Link
                  href="/dashboard/settings/billing"
                  className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline whitespace-nowrap flex items-center gap-1 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  Manage <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Payout History */}
        <Card padded={false}>
          <div className="px-6 py-5 border-b border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History size={16} className="text-[var(--text-secondary)]" />
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Withdrawal History</h2>
              {payouts.length > 0 && (
                <span className="text-xs bg-[var(--surface-muted)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full">
                  {payouts.length}
                </span>
              )}
            </div>
            {/* Status filters */}
            {payouts.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {(['all', 'pending', 'completed', 'rejected'] as const).map(s => (
                  statusCounts[s] !== undefined || s === 'all' ? (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1 text-xs font-medium rounded-[var(--radius-sm)] capitalize transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                        statusFilter === s
                          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                          : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      {s} {s !== 'all' && statusCounts[s] ? `(${statusCounts[s]})` : s === 'all' && payouts.length ? `(${payouts.length})` : ''}
                    </button>
                  ) : null
                ))}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="divide-y divide-[var(--border-subtle)]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <Skeleton rounded="sm" className="w-9 h-9 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                  <Skeleton rounded="full" className="h-5 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : filteredPayouts.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title={statusFilter === 'all' ? 'No withdrawals yet' : `No ${statusFilter} payouts`}
              description={statusFilter === 'all' && available > 0 ? 'Request your first payout when ready.' : ''}
              action={statusFilter === 'all' && available > 0 ? (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs text-[var(--text-secondary)] font-semibold hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  Request your first payout
                </button>
              ) : undefined}
            />
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filteredPayouts.map((payout) => (
                <div key={payout.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[var(--surface-hover)] transition-colors">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 ${
                    payout.status === 'completed' || payout.status === 'paid'
                      ? 'bg-[var(--success-bg)]'
                      : payout.status === 'pending'
                      ? 'bg-[var(--warning-bg)]'
                      : 'bg-[var(--danger-bg)]'
                  }`}>
                    {payout.status === 'completed' || payout.status === 'paid' ? (
                      <CheckCircle2 size={16} className="text-[var(--success)]" />
                    ) : payout.status === 'pending' ? (
                      <Clock size={16} className="text-[var(--warning)]" />
                    ) : (
                      <AlertCircle size={16} className="text-[var(--danger)]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Withdrawal Request
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {new Date(payout.created_at!).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                      {payout.processed_at && (
                        <> · Processed {new Date(payout.processed_at).toLocaleDateString('en-IN', {
                          month: 'short', day: 'numeric'
                        })}</>
                      )}
                    </p>
                  </div>

                  {/* Status */}
                  <StatusPill status={payout.status} type="payout" />

                  {/* Amount */}
                  <p className="text-sm font-bold text-[var(--text-primary)] shrink-0 min-w-20 text-right">
                    {formatINR(payout.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Footer summary */}
          {!isLoading && filteredPayouts.length > 0 && (
            <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">
                {filteredPayouts.length} transaction{filteredPayouts.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Total withdrawn: {formatINR(totalWithdrawn)}
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Payout Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[var(--surface-muted)] rounded-[var(--radius-sm)]">
                  <Wallet size={16} className="text-[var(--text-secondary)]" />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Withdraw Funds</h2>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setPayoutAmount(''); setErrorMsg(''); }}
                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="p-6">
              {!isKycVerified ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-[var(--warning-bg)] rounded-[var(--radius-lg)] flex items-center justify-center mx-auto mb-4">
                    <Building2 size={28} className="text-[var(--warning)]" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">KYC Required</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-6">
                    Complete your KYC verification and add a bank account before making withdrawals.
                  </p>
                  <Link
                    href="/dashboard/settings/billing"
                    className="block w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] font-semibold py-3 rounded-[var(--radius-sm)] transition text-center focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    Complete KYC
                  </Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Available Balance pill */}
                  <div className="flex items-center justify-between bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-sm)] px-4 py-3">
                    <span className="text-sm text-[var(--text-secondary)] font-medium">Available Balance</span>
                    <span className="text-base font-bold text-[var(--text-secondary)]">{formatINR(available)}</span>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-[var(--danger-bg)] text-[var(--danger)] text-sm border border-[var(--danger)]/20 rounded-[var(--radius-sm)]">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-[var(--text-secondary)]">Amount (INR)</label>
                      <button
                        type="button"
                        onClick={() => setPayoutAmount(String(available))}
                        className="text-xs font-semibold text-[var(--text-secondary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        Withdraw all
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] font-medium text-sm">₹</span>
                      <input
                        type="number"
                        required
                        min="100"
                        step="1"
                        max={available}
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] text-[var(--text-primary)] font-mono text-lg"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-2">
                      Minimum ₹100 · Funds arrive in 1–2 business days
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !payoutAmount || Number(payoutAmount) <= 0}
                    className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-on-brand)] font-semibold py-3.5 rounded-[var(--radius-sm)] transition shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      `Confirm Withdrawal${payoutAmount ? ` of ${formatINR(Number(payoutAmount))}` : ''}`
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
