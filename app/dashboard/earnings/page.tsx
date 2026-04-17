'use client';

import React, { useState, useMemo } from 'react';
import { useEarnings } from '@/hooks/useEarnings';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  ArrowUpRight, CheckCircle2, AlertCircle, Clock, TrendingUp,
  X, Building2, Wallet, CreditCard, History, ChevronRight,
  IndianRupee, ArrowDownLeft, Banknote, ShieldCheck, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatINRCompact(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return formatINR(amount);
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 animate-pulse">
      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-9 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
      <div className="h-2 w-20 bg-gray-100 dark:bg-[var(--bg-secondary)] rounded" />
    </div>
  );
}

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
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPayouts = useMemo(() => {
    if (statusFilter === 'all') return payouts;
    return payouts.filter((p: any) => p.status === statusFilter);
  }, [payouts, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: payouts.length };
    for (const p of payouts as any[]) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [payouts]);

  const totalWithdrawn = useMemo(() =>
    (payouts as any[])
      .filter(p => p.status === 'completed' || p.status === 'paid')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
    [payouts]
  );

  return (
    <>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] pt-4">Earnings & Payouts</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Track your balance, request withdrawals, and manage payout history.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={available <= 0 || isLoading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all"
          >
            <ArrowUpRight size={16} />
            Request Payout
          </button>
        </div>

        {/* KYC Banner */}
        {!isLoading && !isKycVerified && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">KYC verification required to withdraw</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">Complete your identity and bank account verification to enable payouts.</p>
              </div>
            </div>
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-1.5 whitespace-nowrap bg-white dark:bg-amber-500/20 hover:bg-amber-50 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-sm font-semibold px-4 py-2 border border-amber-200 dark:border-amber-500/30 rounded-xl transition"
            >
              Complete KYC <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              {/* Available */}
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Available</span>
                    <Wallet size={16} className="text-gray-300" />
                  </div>
                  <p className="text-3xl font-bold tracking-tight mb-1">{formatINRCompact(available)}</p>
                  <p className="text-xs text-gray-300">Ready to withdraw</p>
                </div>
              </div>

              {/* Pending */}
              <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Pending</span>
                  <span className="p-1.5 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                    <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                  </span>
                </div>
                <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-1">{formatINRCompact(pending)}</p>
                <p className="text-xs text-gray-400">Under 48hr settlement</p>
              </div>

              {/* Total Earnings */}
              <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Earned</span>
                  <span className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                    <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                  </span>
                </div>
                <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-1">{formatINRCompact(totalEarnings)}</p>
                <p className="text-xs text-gray-400">Lifetime gross revenue</p>
              </div>

              {/* Total Paid Out */}
              <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Withdrawn</span>
                  <span className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                    <ArrowDownLeft size={14} className="text-blue-600 dark:text-blue-400" />
                  </span>
                </div>
                <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-1">{formatINRCompact(totalPaidOut)}</p>
                <p className="text-xs text-gray-400">Total disbursed</p>
              </div>
            </>
          )}
        </div>

        {/* Ledger Breakdown */}
        {!isLoading && totalEarnings > 0 && (
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-[var(--text-secondary)] mb-4">Balance Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Gross Earnings', amount: totalEarnings, color: 'bg-emerald-500', icon: IndianRupee },
                { label: 'Platform Fees', amount: -platformFees, color: 'bg-red-400', icon: CreditCard },
                { label: 'Total Paid Out', amount: -totalPaidOut, color: 'bg-blue-400', icon: Banknote },
                { label: 'Pending Clearance', amount: -pending, color: 'bg-amber-400', icon: Clock },
              ].map(({ label, amount, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon size={13} className="text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-[var(--text-secondary)] truncate">{label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${amount < 0 ? 'text-red-500 dark:text-red-400' : 'text-[var(--text-primary)]'}`}>
                    {amount < 0 ? `- ${formatINR(-amount)}` : formatINR(amount)}
                  </span>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-[var(--text-secondary)]">Net Available</span>
                <span className="text-sm font-bold text-gray-700 dark:text-[var(--text-secondary)]">{formatINR(available)}</span>
              </div>
            </div>
          </div>
        )}

        {/* KYC Status Card */}
        {!isLoading && (
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isKycVerified ? (
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
                  <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : (
                <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                  <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  KYC & Bank Account
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
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
                className="text-xs font-semibold text-gray-700 dark:text-[var(--text-secondary)] hover:underline whitespace-nowrap flex items-center gap-1"
              >
                Manage <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* Payout History */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History size={16} className="text-gray-600 dark:text-[var(--text-secondary)]" />
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Withdrawal History</h2>
              {payouts.length > 0 && (
                <span className="text-xs bg-gray-100 dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full">
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
                      className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-all ${
                        statusFilter === s
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                          : 'bg-gray-100 dark:bg-[var(--bg-secondary)] text-gray-600 dark:text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-gray-700'
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
            <div className="divide-y divide-[var(--border)]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-2.5 w-24 bg-gray-100 dark:bg-[var(--bg-secondary)] rounded" />
                  </div>
                  <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-gray-100 dark:bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Banknote size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                {statusFilter === 'all' ? "No withdrawals yet" : `No ${statusFilter} payouts`}
              </p>
              {statusFilter === 'all' && available > 0 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-3 text-xs text-gray-700 dark:text-[var(--text-secondary)] font-semibold hover:underline"
                >
                  Request your first payout
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {(filteredPayouts as any[]).map((payout) => (
                <div key={payout.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    payout.status === 'completed' || payout.status === 'paid'
                      ? 'bg-emerald-100 dark:bg-emerald-500/20'
                      : payout.status === 'pending'
                      ? 'bg-amber-100 dark:bg-amber-500/20'
                      : 'bg-red-100 dark:bg-red-500/20'
                  }`}>
                    {payout.status === 'completed' || payout.status === 'paid' ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    ) : payout.status === 'pending' ? (
                      <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                    ) : (
                      <AlertCircle size={16} className="text-red-500 dark:text-red-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Withdrawal Request
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(payout.created_at).toLocaleDateString('en-IN', {
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
          {!isLoading && (filteredPayouts as any[]).length > 0 && (
            <div className="px-6 py-3 border-t border-[var(--border)] bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">
                {filteredPayouts.length} transaction{filteredPayouts.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs font-semibold text-gray-700 dark:text-[var(--text-secondary)]">
                Total withdrawn: {formatINR(totalWithdrawn)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Payout Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gray-100 dark:bg-[var(--bg-secondary)] rounded-xl">
                  <Wallet size={16} className="text-gray-700 dark:text-[var(--text-secondary)]" />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Withdraw Funds</h2>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setPayoutAmount(''); setErrorMsg(''); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="p-6">
              {!isKycVerified ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Building2 size={28} className="text-amber-500" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">KYC Required</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-6">
                    Complete your KYC verification and add a bank account before making withdrawals.
                  </p>
                  <Link
                    href="/dashboard/settings/billing"
                    className="block w-full bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold py-3 rounded-xl transition text-center"
                  >
                    Complete KYC
                  </Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Available Balance pill */}
                  <div className="flex items-center justify-between bg-gray-100 dark:bg-[var(--bg-secondary)] border border-indigo-100 dark:border-gray-900 dark:border-white/20 rounded-xl px-4 py-3">
                    <span className="text-sm text-gray-700 dark:text-[var(--text-secondary)] font-medium">Available Balance</span>
                    <span className="text-base font-bold text-gray-700 dark:text-[var(--text-secondary)]">{formatINR(available)}</span>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-500/20 rounded-xl">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-[var(--text-secondary)]">Amount (INR)</label>
                      <button
                        type="button"
                        onClick={() => setPayoutAmount(String(available))}
                        className="text-xs font-semibold text-gray-700 dark:text-[var(--text-secondary)] hover:underline"
                      >
                        Withdraw all
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₹</span>
                      <input
                        type="number"
                        required
                        min="100"
                        step="1"
                        max={available}
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-xl focus:ring-2 focus:ring-gray-400 outline-none text-[var(--text-primary)] font-mono text-lg"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Minimum ₹100 · Funds arrive in 1–2 business days
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !payoutAmount || Number(payoutAmount) <= 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition shadow-sm"
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
