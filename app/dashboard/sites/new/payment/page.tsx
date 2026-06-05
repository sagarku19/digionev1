'use client';
// Dedicated creation flow: Payment Link
// 2-step: Details → Review & Launch

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, ChevronRight, ChevronLeft, Loader2, Zap, Globe,
  IndianRupee, XCircle
} from 'lucide-react';

const INPUT = 'w-full px-5 py-3.5 bg-[var(--surface-muted)] border-2 border-[var(--border)] rounded-[var(--radius-md)] text-base font-medium focus:ring-0 focus:border-[var(--border-strong)] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex flex-col gap-2 mb-8">
      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest px-1">
        <span>Step {step} of {total}</span>
        <span className="text-[var(--text-primary)]">{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="flex items-center gap-1.5 h-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-all duration-500 ease-out ${
              i < step ? 'bg-[var(--success)] scale-y-100' : 'bg-[var(--border)] scale-y-75'
            }`}
          />
        ))}
      </div>
    </div>
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

  return (
    <div className="relative pt-6 pb-24 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[calc(100vh-120px)] flex flex-col justify-center">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* Back / Type Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="group inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--success)] transition-colors bg-[var(--surface)] px-4 py-2.5 rounded-xl border border-[var(--border)] shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            {step > 1 ? 'Go Back' : 'All Types'}
          </button>

          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--success-subtle)] border border-[var(--success-border)] rounded-xl shadow-[var(--shadow-xs)]">
            <CreditCard className="w-4 h-4 text-[var(--success)]" />
            <span className="text-sm font-bold text-[var(--success)] uppercase tracking-widest">Payment Link</span>
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] p-8 md:p-10 shadow-[var(--shadow-sm)]">
          <StepBar step={step} total={2} />

          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-[var(--success-subtle)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--success-border)] shadow-inner">
                  <IndianRupee className="w-6 h-6 text-[var(--success)]" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Set up your payment link</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">Create a secure checkout URL to accept payments for services, consulting, or custom work.</p>
              </div>

              <div className="space-y-6 bg-[var(--surface-muted)] p-6 rounded-[24px] border border-[var(--border)]">

                <div className="p-4 bg-[var(--success-subtle)] rounded-2xl border border-[var(--success-border)] shadow-[var(--shadow-xs)] flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Globe className="w-4 h-4 text-[var(--success)]" />
                    <span className="text-xs font-bold text-[var(--success)] uppercase tracking-widest">Auto-Assigned URL Scope</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--success)] font-mono">
                    digione.ai/pay/{'<auto-generated>'}
                  </p>
                  <p className="text-[10px] font-medium text-[var(--success)] opacity-70 mt-2 text-center max-w-[200px] leading-tight">Shared links will automatically map securely to your ID.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">
                    Service / Offer Name <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input type="text" autoFocus value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. 1-on-1 Mentorship Session" className={INPUT} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1 flex justify-between">
                    Description &amp; Terms <span className="text-[var(--text-tertiary)] font-medium">Optional</span>
                  </label>
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="What does the buyer get? Details, duration, deliverables..."
                    className={`${INPUT} resize-none leading-relaxed`} />
                </div>

                <div className="p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-xs)]">
                  <div className="flex items-center gap-3 text-xs font-semibold text-[var(--text-secondary)]">
                    <div className="w-6 h-6 rounded-md bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
                      <IndianRupee className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    </div>
                    <span>Pricing and fulfillment options can be set immediately in the editor.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-14 h-14 bg-[var(--success)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[var(--shadow-xs)]">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Ready to collect payments?</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">Your payment link container is initialized.</p>
              </div>

              <div className="rounded-[24px] border-2 border-[var(--success-border)] p-6 bg-[var(--success-subtle)] relative overflow-hidden">
                <div className="flex items-start gap-4 mb-3 relative z-10">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-xs)] shrink-0">
                    <CreditCard className="w-6 h-6 text-[var(--success)]" />
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-2xl font-extrabold text-[var(--text-primary)] line-clamp-2">{title}</h3>
                    <p className="text-xs font-bold text-[var(--success)] uppercase tracking-widest mt-1">Direct Checkout</p>
                  </div>
                </div>

                {description && <p className="mt-5 text-sm font-medium text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-4 relative z-10">{description}</p>}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-3 bg-[var(--danger-subtle)] border-2 border-[var(--danger-border)] px-5 py-4 rounded-xl">
              <XCircle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-[var(--danger)]">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-[var(--border-subtle)]">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center justify-center w-12 h-12 bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : <span />}

            {step < 2 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
                className="group flex items-center gap-2 bg-[var(--success)] hover:bg-[var(--success-hover,var(--success))] disabled:opacity-30 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-[var(--shadow-xs)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                Proceed to Review <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-60 text-[var(--text-on-brand)] px-10 py-3.5 rounded-2xl font-extrabold text-base shadow-[var(--shadow-xs)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Preparing...</> : <><Zap className="w-5 h-5" /> Secure Link</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
