'use client';
// Taxes & statements — the tax-compliance surface split out of /dashboard/earnings.
// Shows what DigiOne has withheld (TDS/TCS/GST) per financial year and lets the
// creator download the commission tax invoices + annual earnings statements they
// (or their CA) need at filing time. Read-only + PDF downloads; no money moves here.

import React from 'react';
import Link from 'next/link';
import {
  FileText, Download, Receipt, Landmark, Percent, Info, ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { BackButton } from '@/components/dashboard/BackButton';
import { formatINR } from '@/lib/format';
import { useTaxSummary } from '@/hooks/commerce/useTax';
import { useCommissionMonths, useDownloadCommissionInvoice } from '@/hooks/commerce/useInvoices';
import { useStatementYears, useDownloadAnnualStatement } from '@/hooks/commerce/useStatements';

// Small labelled explainer row used inside the "Tax withheld" card.
function TaxTerm({
  icon: Icon, title, children,
}: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5">{children}</p>
      </div>
    </div>
  );
}

export default function TaxesStatementPage() {
  const { data: taxSummary, isLoading: loadingSummary } = useTaxSummary();
  const { data: commissionMonths, isLoading: loadingInvoices } = useCommissionMonths();
  const { data: statementYears, isLoading: loadingStatements } = useStatementYears();
  const downloadCommission = useDownloadCommissionInvoice();
  const downloadStatement = useDownloadAnnualStatement();

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        back={<BackButton href="/dashboard/earnings" label="Back to earnings" />}
        title="Taxes & statements"
        description="What DigiOne has withheld on your behalf, and the tax documents you need at filing time."
      />

      {/* How it works */}
      <Card className="!bg-[var(--info-bg)] !border-[var(--info)]/20">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-[var(--info)] shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">DigiOne handles your tax compliance</p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              As the platform, we collect GST on our commission and withhold TDS/TCS where the law requires it, then
              deposit those amounts with the government against your PAN/GSTIN. Your <strong>earnings are never reduced
              at sale time</strong> — TDS and TCS are withheld only when you withdraw, and they&apos;re a prepayment of
              tax you claim back when you file, not an extra charge.
            </p>
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
              Our commission is GST-inclusive. On a ₹1,000 sale at a 10% commission, ₹100 is our commission (₹84.75 fee +
              ₹15.25 GST) and you keep ₹900.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Tax withheld ─────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <Landmark size={16} className="text-[var(--text-secondary)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Tax withheld</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-5">
          Amounts we&apos;ve withheld and deposited with the government, totalled per financial year.
        </p>

        <div className="space-y-4 mb-6">
          <TaxTerm icon={Landmark} title="TDS — Income Tax §194-O">
            Once your financial-year gross sales cross ₹5 lakh, we withhold <strong>0.1%</strong> (0.1% with a linked
            PAN, 5% without) on your withdrawals and deposit it against your PAN. It appears in your Form 26AS / AIS —
            claim it as credit when you file your income-tax return. It&apos;s a prepayment of your income tax, not a fee.
          </TaxTerm>
          <TaxTerm icon={Percent} title="TCS — GST §52">
            For GST-registered creators we collect <strong>0.5%</strong> on your net taxable sales and deposit it. It
            auto-populates in your GST return — claim it in your electronic cash ledger.
          </TaxTerm>
          <TaxTerm icon={Receipt} title="GST on commission — §9">
            The <strong>18% GST</strong> included in our commission. If you&apos;re GST-registered, download the monthly
            commission tax invoice below to claim it as Input Tax Credit (ITC).
          </TaxTerm>
        </div>

        {loadingSummary ? (
          <div className="space-y-3">
            {[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full" rounded="md" />)}
          </div>
        ) : (taxSummary?.length ?? 0) > 0 ? (
          <div className="space-y-3">
            {taxSummary!.map((t) => (
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
        ) : (
          <p className="text-sm text-[var(--text-tertiary)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] px-4 py-3">
            Nothing withheld yet. Figures appear here after your first sale (and once you cross the TDS/TCS thresholds).
          </p>
        )}
      </Card>

      {/* ── Tax invoices (commission) ────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <FileText size={16} className="text-[var(--text-secondary)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Tax invoices</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-4 leading-relaxed">
          Every month you had sales, we issue a GST tax invoice for the commission we charged (fee + 18% GST). Keep them
          for your books — if you&apos;re GST-registered, these are what you use to claim Input Tax Credit on our GST.
        </p>

        {loadingInvoices ? (
          <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-10 w-full" rounded="sm" />)}</div>
        ) : (commissionMonths?.length ?? 0) > 0 ? (
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
        ) : (
          <p className="text-sm text-[var(--text-tertiary)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] px-4 py-3">
            No commission invoices yet — one becomes available for each month you make sales.
          </p>
        )}
      </Card>

      {/* ── Annual statements ────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <FileText size={16} className="text-[var(--text-secondary)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Annual statements</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-4 leading-relaxed">
          A per-financial-year summary of your gross sales, our commission, GST on commission, and TDS/TCS withheld.
          It&apos;s informational — hand it to your accountant to help prepare your income-tax return and GST filings.
          It is <strong>not</strong> the statutory Form 16A (your TDS certificate); that comes from the government&apos;s
          TRACES portal after we file our quarterly 26Q TDS return.
        </p>

        {loadingStatements ? (
          <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-10 w-full" rounded="sm" />)}</div>
        ) : (statementYears?.length ?? 0) > 0 ? (
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
        ) : (
          <p className="text-sm text-[var(--text-tertiary)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] px-4 py-3">
            No statements yet — one becomes available for each financial year you have activity.
          </p>
        )}
      </Card>

      <p className="flex items-start gap-1.5 text-xs text-[var(--text-tertiary)] px-1">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        These documents are for your records and your CA. DigiOne isn&apos;t a substitute for professional tax advice.
      </p>

      <Link
        href="/dashboard/earnings"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline px-1 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        Back to Earnings & Payouts <ChevronRight size={12} />
      </Link>
    </div>
  );
}
