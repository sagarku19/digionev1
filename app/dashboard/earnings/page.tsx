'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight, CheckCircle2, AlertCircle, Clock, TrendingUp,
  Building2, Wallet, CreditCard, History, ChevronRight,
  IndianRupee, ArrowDownLeft, Banknote, ShieldCheck, ShieldAlert, Snowflake, FileText, Download,
} from 'lucide-react';
import { useEarnings } from '@/hooks/commerce/useEarnings';
import { StatusPill } from '@/components/ui/StatusPill';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SideDrawer } from '@/components/ui/SideDrawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatINR, formatINRCompact } from '@/lib/format';
import { usePayoutTaxPreview, useTaxSummary, useAddGstin } from '@/hooks/commerce/useTax';
import { useCommissionMonths, useDownloadCommissionInvoice } from '@/hooks/commerce/useInvoices';
import { useStatementYears, useDownloadAnnualStatement } from '@/hooks/commerce/useStatements';
import { isValidGstin } from '@/lib/shared/gstin';
import { MIN_PAYOUT_INR } from '@/lib/server/payout-policy';

export default function EarningsPage() {
  const { creatorBalances, payouts, kyc, isLoading, requestPayout, isRequestingPayout } = useEarnings();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerAmount, setDrawerAmount] = useState(0);
  const [drawerKey, setDrawerKey] = useState(0);
  const [drawerError, setDrawerError] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isKycVerified = kyc?.status === 'verified';
  const available = creatorBalances?.available_balance ?? 0;
  // Withdrawable can never be negative — a creator whose frozen/refund holds exceed
  // their balance is over-committed, not "owed a negative payout". Clamp the KPI.
  const withdrawable = Math.max(0, available);
  const pending = creatorBalances?.pending_payout ?? 0;
  const totalEarnings = creatorBalances?.total_earnings ?? 0;
  const totalPaidOut = creatorBalances?.total_paid_out ?? 0;
  const platformFees = creatorBalances?.total_platform_fees ?? 0;
  const frozen = Number((creatorBalances as { frozen_balance?: number } | undefined)?.frozen_balance ?? 0);
  const bankLast4 = kyc?.bank_last4;

  const { data: taxPreview } = usePayoutTaxPreview();
  const addGstin = useAddGstin();
  const { data: taxSummary } = useTaxSummary();
  const { data: commissionMonths } = useCommissionMonths();
  const { data: statementYears } = useStatementYears();
  const downloadStatement = useDownloadAnnualStatement();
  const downloadCommission = useDownloadCommissionInvoice();
  const [gstinOpen, setGstinOpen] = useState(false);
  const [gstinValue, setGstinValue] = useState('');
  const [gstinError, setGstinError] = useState('');
  const closeGstin = () => { setGstinOpen(false); setGstinValue(''); setGstinError(''); };
  const registrationRequired = taxPreview?.registration_required ?? false;
  const previewTds = Number(taxPreview?.tds ?? 0);
  const previewTcs = Number(taxPreview?.tcs ?? 0);

  const amountError =
    drawerAmount > 0
      ? drawerAmount < 100
        ? 'Minimum withdrawal is ₹100'
        : drawerAmount > available
          ? 'Amount exceeds your available balance'
          : ''
      : '';
  const isAmountValid = drawerAmount >= 100 && drawerAmount <= available;

  const openDrawer = () => {
    setDrawerAmount(0);
    setDrawerKey(k => k + 1);
    setDrawerError('');
    setIsDrawerOpen(true);
  };

  const handleWithdrawAll = () => {
    setDrawerAmount(available);
    setDrawerKey(k => k + 1);
  };

  const handleConfirmWithdraw = async () => {
    setDrawerError('');
    try {
      await requestPayout(drawerAmount);
      setIsDrawerOpen(false);
      setDrawerAmount(0);
    } catch (err: unknown) {
      setDrawerError(err instanceof Error ? err.message : 'Payout request failed.');
      // ConfirmDialog closes itself; error surfaces in the still-open drawer
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

  const totalWithdrawn = useMemo(
    () =>
      payouts
        .filter((p) => p.status === 'completed' || p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount || 0), 0),
    [payouts],
  );

  const withdrawAction = !isLoading && !isKycVerified ? (
    <Link
      href="/dashboard/settings/billing"
      className="inline-flex items-center gap-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--warning)] text-sm font-semibold px-4 py-2.5 border border-[var(--warning)]/30 rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <ShieldAlert size={16} />
      Verify KYC to withdraw
    </Link>
  ) : (
    <button
      onClick={openDrawer}
      disabled={available < MIN_PAYOUT_INR || isLoading}
      className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-on-brand)] px-5 py-2.5 rounded-[var(--radius-sm)] font-semibold shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <ArrowUpRight size={16} />
      Withdraw
    </button>
  );

  return (
    <>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Earnings & Payouts"
          description="Track your balance, request withdrawals, and manage payout history."
          action={withdrawAction}
        />

        {registrationRequired && (
          <Card className="!bg-[var(--warning-bg)] !border-[var(--warning)]/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">GST registration required to withdraw</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Your FY sales crossed the ₹20L threshold. Add your GSTIN to continue.</p>
              </div>
              <button onClick={() => setGstinOpen(true)} className="shrink-0 px-3 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Add GSTIN</button>
            </div>
          </Card>
        )}

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
              onClick={openDrawer}
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
                  <p className="text-3xl font-bold tracking-tight tabular-nums mb-1">{formatINRCompact(withdrawable)}</p>
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
                <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight tabular-nums mb-1">{formatINRCompact(pending)}</p>
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
                <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight tabular-nums mb-1">{formatINRCompact(totalEarnings)}</p>
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
                <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight tabular-nums mb-1">{formatINRCompact(totalPaidOut)}</p>
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
                ...(frozen > 0 ? [{ label: 'Frozen (refunds/disputes)', amount: -frozen, color: 'bg-[var(--danger)]', icon: Snowflake }] : []),
              ].map(({ label, amount, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon size={13} className="text-[var(--text-tertiary)] shrink-0" />
                    <span className="text-sm text-[var(--text-secondary)] truncate">{label}</span>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${amount < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                    {amount < 0 ? `- ${formatINR(-amount)}` : formatINR(amount)}
                  </span>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-secondary)]">Net Available</span>
                <span className="text-sm font-bold tabular-nums text-[var(--text-secondary)]">{formatINR(available)}</span>
              </div>
            </div>
          </Card>
        )}

        {!isLoading && (taxSummary?.length ?? 0) > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={14} className="text-[var(--text-tertiary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Tax withheld</h3>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mb-3">Platform fee is GST-inclusive. TDS/TCS are withheld at withdrawal.</p>
            <div className="space-y-3">
              {taxSummary?.map((t) => (
                <div key={t.fy} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">FY {t.fy}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-[11px] text-[var(--text-tertiary)]">TDS 194-O</p><p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{formatINR(Math.max(t.tds, 0))}</p></div>
                    <div><p className="text-[11px] text-[var(--text-tertiary)]">TCS §52</p><p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{formatINR(Math.max(t.tcs, 0))}</p></div>
                    <div><p className="text-[11px] text-[var(--text-tertiary)]">GST on fee</p><p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{formatINR(Math.max(t.gstOnCommission, 0))}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!isLoading && (commissionMonths?.length ?? 0) > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={14} className="text-[var(--text-tertiary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Tax invoices</h3>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mb-3">Monthly DigiOne commission tax invoices (18% GST on platform fees).</p>
            <div className="divide-y divide-[var(--border-subtle)]">
              {commissionMonths!.map((m) => (
                <div key={m.month} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-[var(--text-primary)]">{m.label}</span>
                  <button
                    onClick={() => downloadCommission.mutate(m.month)}
                    disabled={downloadCommission.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] transition disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Download size={13} />
                    Invoice
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!isLoading && (statementYears?.length ?? 0) > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={14} className="text-[var(--text-tertiary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Annual statements</h3>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mb-3">Your earnings &amp; tax summary per financial year (informational; the statutory Form 16A comes from TRACES).</p>
            <div className="divide-y divide-[var(--border-subtle)]">
              {statementYears!.map((fy) => (
                <div key={fy} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-[var(--text-primary)]">FY {fy}</span>
                  <button
                    onClick={() => downloadStatement.mutate(fy)}
                    disabled={downloadStatement.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] transition disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Download size={13} />
                    Statement
                  </button>
                </div>
              ))}
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
                  onClick={openDrawer}
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
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                      {payout.processed_at && (
                        <> · Processed {new Date(payout.processed_at).toLocaleDateString('en-IN', {
                          month: 'short', day: 'numeric',
                        })}</>
                      )}
                    </p>
                  </div>

                  {/* Status */}
                  <StatusPill status={payout.status} type="payout" />

                  {/* Amount */}
                  <p className="text-sm font-bold tabular-nums text-[var(--text-primary)] shrink-0 min-w-20 text-right">
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
              <span className="text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
                Total withdrawn: {formatINR(totalWithdrawn)}
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Withdraw Drawer */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Withdraw Funds"
        footer={
          <div className="space-y-3">
            {drawerError && (
              <div className="p-3 bg-[var(--danger-bg)] text-[var(--danger)] text-sm border border-[var(--danger)]/20 rounded-[var(--radius-sm)]">
                {drawerError}
              </div>
            )}
            {registrationRequired ? (
              <div className="rounded-[var(--radius-md)] bg-[var(--warning-bg)] border border-[var(--warning)]/20 p-3 space-y-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">GST registration required</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Your sales crossed the GST threshold. Add your GSTIN to continue withdrawing.
                </p>
                <button
                  onClick={() => { setGstinOpen(true); }}
                  className="w-full py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  Add GSTIN
                </button>
              </div>
            ) : (drawerAmount > 0 && (previewTds > 0 || previewTcs > 0)) ? (
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] p-3 text-xs space-y-1">
                <div className="flex justify-between text-[var(--text-secondary)]"><span>Amount</span><span>{formatINR(drawerAmount)}</span></div>
                {previewTds > 0 && <div className="flex justify-between text-[var(--text-secondary)]"><span>TDS withheld (194-O)</span><span>- {formatINR(previewTds)}</span></div>}
                {previewTcs > 0 && <div className="flex justify-between text-[var(--text-secondary)]"><span>TCS withheld (GST §52)</span><span>- {formatINR(previewTcs)}</span></div>}
                <div className="flex justify-between font-semibold text-[var(--text-primary)] pt-1 border-t border-[var(--border-subtle)]"><span>You receive</span><span>{formatINR(Math.max(drawerAmount - previewTds - previewTcs, 0))}</span></div>
              <p className="text-[11px] text-[var(--text-tertiary)] pt-1">Your total accrued TDS/TCS is withheld in full on this withdrawal.</p>
              </div>
            ) : null}
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={!isAmountValid || isRequestingPayout || registrationRequired || (drawerAmount > 0 && drawerAmount <= previewTds + previewTcs)}
              className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-on-brand)] font-semibold py-3 rounded-[var(--radius-sm)] transition shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              {isRequestingPayout
                ? 'Processing…'
                : isAmountValid
                  ? `Withdraw ${formatINR(drawerAmount)}`
                  : 'Withdraw'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Available balance */}
          <div className="flex items-center justify-between bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-sm)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Wallet size={14} className="text-[var(--text-tertiary)]" />
              <span className="text-sm text-[var(--text-secondary)]">Available</span>
            </div>
            <span className="text-base font-bold tabular-nums text-[var(--text-primary)]">{formatINR(available)}</span>
          </div>

          {/* Destination */}
          <div className="flex items-center justify-between bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-sm)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-[var(--text-tertiary)]" />
              <span className="text-sm text-[var(--text-secondary)]">Payout to</span>
            </div>
            {bankLast4 ? (
              <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">••••{bankLast4}</span>
            ) : (
              <Link
                href="/dashboard/settings/billing"
                className="text-sm font-semibold text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                onClick={() => setIsDrawerOpen(false)}
              >
                Add bank details
              </Link>
            )}
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="block text-sm font-medium text-[var(--text-primary)]">Amount</span>
              <button
                type="button"
                onClick={handleWithdrawAll}
                disabled={available <= 0}
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Withdraw all
              </button>
            </div>
            <CurrencyInput
              key={drawerKey}
              value={drawerAmount}
              onChange={setDrawerAmount}
              error={amountError}
            />
            <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">Minimum ₹100 · Funds arrive in 1–2 business days</p>
          </div>
        </div>
      </SideDrawer>

      {/* Confirm withdrawal dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmWithdraw}
        title={`Withdraw ${formatINR(drawerAmount)}`}
        description={`Funds will be transferred to ${bankLast4 ? `••••${bankLast4}` : 'your bank account'}. This typically takes 1–2 business days.`}
        confirmLabel="Confirm Withdrawal"
      />

      {gstinOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onKeyDown={(e) => { if (e.key === 'Escape') closeGstin(); }}>
          <div className="absolute inset-0 bg-black/40" onClick={closeGstin} />
          <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-sm p-6 space-y-4" role="dialog" aria-modal="true" aria-labelledby="gstin-dialog-title">
            <div>
              <h3 id="gstin-dialog-title" className="text-base font-semibold text-[var(--text-primary)]">Add your GSTIN</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Required to withdraw once your sales cross the GST registration threshold.</p>
            </div>
            <input
              value={gstinValue}
              onChange={(e) => { setGstinValue(e.target.value.toUpperCase()); setGstinError(''); }}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow font-mono tracking-wide"
            />
            {gstinError && <p className="text-xs text-[var(--danger)]">{gstinError}</p>}
            <div className="flex gap-2">
              <button onClick={closeGstin} className="flex-1 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] text-sm font-semibold rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Cancel</button>
              <button
                onClick={async () => {
                  if (!isValidGstin(gstinValue)) { setGstinError('Enter a valid 15-character GSTIN.'); return; }
                  try { await addGstin.mutateAsync(gstinValue); closeGstin(); }
                  catch (e) { setGstinError(e instanceof Error ? e.message : 'Could not save GSTIN.'); }
                }}
                disabled={addGstin.isPending}
                className="flex-1 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold rounded-[var(--radius-sm)] transition disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                {addGstin.isPending ? 'Saving…' : 'Save GSTIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
