'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, ChevronRight, ChevronLeft, Loader2, Zap, Globe,
  IndianRupee, XCircle, Check,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

const ACCENT = {
  bg: 'bg-[var(--success)]',
  bgHover: 'hover:opacity-90',
  text: 'text-[var(--success)]',
  fill: 'var(--success)',
};

const INPUT = 'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';

const STEP_LABELS = ['Details', 'Review'];

function Breadcrumb({ step, steps }: { step: number; steps: string[] }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-medium mb-4">
      {steps.map((label, i) => {
        const idx = i + 1;
        const isActive = idx === step;
        const isDone = idx < step;
        return (
          <React.Fragment key={label}>
            <li className={`inline-flex items-center gap-1.5 ${
              isActive ? ACCENT.text :
              isDone ? 'text-[var(--success)]' :
              'text-[var(--text-tertiary)]'
            }`}>
              {isDone
                ? <Check className="w-3.5 h-3.5" />
                : <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold ${
                    isActive ? `${ACCENT.bg} text-[var(--text-on-brand)]` : 'bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-tertiary)]'
                  }`}>{idx}</span>}
              <span className={isActive ? 'font-semibold' : ''}>{label}</span>
            </li>
            {idx < steps.length && (
              <li aria-hidden className="text-[var(--text-tertiary)]">→</li>
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

export default function CreatePaymentLinkPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext = step === 1 ? title.trim().length > 0 : true;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_type: 'payment', title, description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create');
      router.push(`/dashboard/sites/edit/payment/${json.siteId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ['Set up your payment link', 'Ready to collect payments?'];
  const stepDescs = [
    'Create a secure checkout URL to accept payments for services, consulting, or custom work.',
    'Your payment link container is initialized.',
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="w-full max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-2 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            {step > 1 ? 'Go Back' : 'All Types'}
          </button>

          <div className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-[var(--radius-sm)]">
            <CreditCard className="w-3.5 h-3.5 text-[var(--success)]" />
            <span className="text-[11px] font-medium text-[var(--success)] uppercase tracking-wide">Payment Link</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Left column: form */}
          <div>
            <Breadcrumb step={step} steps={STEP_LABELS} />

            <Card>
              {step === 1 && (
                <div className="space-y-6">
                  <header className="mb-5">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">{stepTitles[0]}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">{stepDescs[0]}</p>
                  </header>

                  <div className="space-y-4">
                    <div className="p-3 bg-[var(--success-bg)] rounded-[var(--radius-md)] border border-[var(--success)]/20 flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-3.5 h-3.5 text-[var(--success)]" />
                        <span className="text-[11px] font-semibold text-[var(--success)] uppercase tracking-wide">Auto-Assigned URL</span>
                      </div>
                      <p className="text-sm font-medium text-[var(--success)] font-mono">
                        digione.ai/pay/{'<auto>'}
                      </p>
                      <p className="text-[10px] text-[var(--success)] opacity-70 mt-1 text-center max-w-[220px] leading-tight">Shared links will map securely to your ID.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                        Service / Offer Name <span className="text-[var(--danger)]">*</span>
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. 1-on-1 Mentorship Session"
                        className={INPUT}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Description &amp; Terms</label>
                        <span className="text-xs text-[var(--text-tertiary)]">Optional</span>
                      </div>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="What does the buyer get? Details, duration, deliverables…"
                        className={`${INPUT} resize-none leading-relaxed`}
                      />
                    </div>

                    <div className="p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <IndianRupee className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                        <span>Pricing and fulfillment can be set in the editor.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <header className="mb-5">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">{stepTitles[1]}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">{stepDescs[1]}</p>
                  </header>

                  <div className="rounded-[var(--radius-lg)] border border-[var(--success)]/20 p-4 bg-[var(--success-bg)]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface)] border border-[var(--border-subtle)] shrink-0">
                        <CreditCard className="w-5 h-5 text-[var(--success)]" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)] line-clamp-2">{title}</h3>
                        <p className="text-[11px] font-medium text-[var(--success)] uppercase tracking-wide mt-0.5">Direct Checkout</p>
                      </div>
                    </div>

                    {description && <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-3">{description}</p>}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 bg-[var(--danger-bg)] border border-[var(--danger)]/20 px-3 py-2.5 rounded-[var(--radius-md)]">
                  <XCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border-subtle)]">
                {step > 1 ? (
                  <button
                    onClick={() => setStep(s => s - 1)}
                    className="flex items-center justify-center w-9 h-9 bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded-full focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                ) : <span />}

                {step < 2 ? (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    disabled={!canNext}
                    className={`group flex items-center gap-2 ${ACCENT.bg} ${ACCENT.bgHover} disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-on-brand)] px-3 py-2 rounded-[var(--radius-sm)] font-semibold text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-all`}
                  >
                    Continue <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="group flex items-center justify-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-60 text-[var(--text-on-brand)] px-4 py-2 rounded-[var(--radius-sm)] font-semibold text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Zap className="w-4 h-4" /> Secure Link</>}
                  </button>
                )}
              </div>
            </Card>
          </div>

          {/* Right column: live preview */}
          <div>
            <Card padded="sm">
              <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-3">Preview</div>

              <div className="flex flex-col items-center gap-2">
                {/* Header */}
                <p className="text-sm font-semibold text-[var(--text-primary)] text-center">
                  Pay {title || 'Service'}
                </p>

                {/* Description */}
                {description && (
                  <p className="text-[11px] text-[var(--text-secondary)] text-center line-clamp-2 max-w-[240px]">
                    {description}
                  </p>
                )}

                {/* Amount input row */}
                <div className="w-full bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] py-3 text-center text-[11px] text-[var(--text-tertiary)]">
                  ₹ — Enter amount
                </div>

                {/* Pay CTA */}
                <div className="w-full bg-[var(--success)] text-[var(--text-on-brand)] text-[11px] font-semibold py-2 rounded-[var(--radius-sm)] text-center">
                  Continue to Pay
                </div>

                {/* Footer */}
                <p className="text-[10px] text-[var(--text-tertiary)] text-center">
                  Secured by Cashfree
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
