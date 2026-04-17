'use client';
// Dedicated creation flow: Payment Link
// 2-step: Details → Review & Launch

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, ChevronRight, ChevronLeft, Loader2, Zap, Globe,
  IndianRupee, XCircle
} from 'lucide-react';

const INPUT = 'w-full px-5 py-3.5 bg-gray-50/50 dark:bg-zinc-900/50 border-2 border-gray-200 dark:border-zinc-800 rounded-2xl text-base font-medium focus:ring-0 focus:border-emerald-500 outline-none text-[var(--text-primary)] placeholder-gray-400 transition-colors';

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex flex-col gap-2 mb-8">
      <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
        <span>Step {step} of {total}</span>
        <span className="text-[var(--text-primary)]">{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="flex items-center gap-1.5 h-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-all duration-500 ease-out ${
              i < step ? 'bg-emerald-500 dark:bg-emerald-500 scale-y-100' : 'bg-gray-200 dark:bg-zinc-800 scale-y-75'
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
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden rounded-[40px]">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[30%] bg-teal-500/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* Back / Type Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="group inline-flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-[var(--text-secondary)] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-200/50 dark:border-zinc-800/80 shadow-sm">
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> 
            {step > 1 ? 'Go Back' : 'All Types'}
          </button>
          
          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl shadow-sm">
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100 uppercase tracking-widest">Payment Link</span>
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border border-white/20 dark:border-zinc-800/50 rounded-[32px] p-8 md:p-10 shadow-2xl shadow-emerald-500/5">
          <StepBar step={step} total={2} />

          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-500/20 shadow-inner">
                  <IndianRupee className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Set up your payment link</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">Create a secure checkout URL to accept payments for services, consulting, or custom work.</p>
              </div>

              <div className="space-y-6 bg-gray-50/50 dark:bg-zinc-900/30 p-6 rounded-[24px] border border-gray-100 dark:border-zinc-800/80">
                
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 shadow-sm flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Auto-Assigned URL Scope</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300 font-mono">
                    digione.ai/pay/{'<auto-generated>'}
                  </p>
                  <p className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/70 mt-2 text-center max-w-[200px] leading-tight">Shared links will automatically map securely to your ID.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">
                    Service / Offer Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" autoFocus value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. 1-on-1 Mentorship Session" className={INPUT} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1 flex justify-between">
                    Description & Terms <span className="text-gray-400 font-medium">Optional</span>
                  </label>
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="What does the buyer get? Details, duration, deliverables..."
                    className={`${INPUT} resize-none leading-relaxed`} />
                </div>

                <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                    <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                      <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
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
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Ready to collect payments?</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">Your payment link container is initialized.</p>
              </div>

              <div className="rounded-[24px] border-2 border-emerald-100 dark:border-emerald-500/20 p-6 bg-emerald-50/50 dark:bg-emerald-500/5 relative overflow-hidden">
                <div className="absolute top-[-30%] right-[-5%] w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full" />
                
                <div className="flex items-start gap-4 mb-3 relative z-10">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-zinc-800 shadow-sm shrink-0">
                    <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-2xl font-extrabold text-[var(--text-primary)] line-clamp-2">{title}</h3>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">Direct Checkout</p>
                  </div>
                </div>
                
                {description && <p className="mt-5 text-sm font-medium text-gray-600 dark:text-[var(--text-secondary)] leading-relaxed border-t border-emerald-100 dark:border-zinc-800/80 pt-4 relative z-10">{description}</p>}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 px-5 py-4 rounded-xl">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100 dark:border-zinc-800/80">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center justify-center w-12 h-12 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 hover:text-emerald-600 text-gray-500 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : <span />}

            {step < 2 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
                className="group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]">
                Proceed to Review <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white px-10 py-3.5 rounded-2xl font-extrabold text-base shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98]">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Preparing...</> : <><Zap className="w-5 h-5" /> Secure Link</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
