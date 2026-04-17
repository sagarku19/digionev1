'use client';

import React, { useState } from 'react';
import { Mail, ArrowLeft, Check, Loader2, ChevronDown } from 'lucide-react';
import Link from 'next/link';

const PROVIDERS = ['Mailchimp', 'SendGrid', 'Brevo (Sendinblue)', 'Resend', 'SMTP'];

const SEQUENCES = [
  { id: 'welcome', label: 'Welcome Email', trigger: 'customer.created', desc: 'Sent immediately after signup', active: true },
  { id: 'order', label: 'Order Confirmation', trigger: 'order.paid', desc: 'Sent when payment is verified', active: true },
  { id: 'cart', label: 'Abandoned Cart', trigger: 'cart.abandoned', desc: 'Sent 1 hour after cart abandonment', active: false },
  { id: 'followup', label: '3-Day Follow-up', trigger: 'order.paid', desc: 'Sent 3 days after purchase', active: false },
];

export default function EmailPage() {
  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [sequences, setSequences] = useState(SEQUENCES);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showProvider, setShowProvider] = useState(false);

  const toggleSeq = (id: string) =>
    setSequences(p => p.map(s => s.id === id ? { ...s, active: !s.active } : s));

  const save = async () => {
    if (!provider || !apiKey.trim() || !fromEmail.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16">
      {/* Back */}
      <Link
        href="/dashboard/automation"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] pt-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Automations
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0">
          <Mail className="w-6 h-6 text-blue-500" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Email Sequences</h1>
          <p className="text-sm text-[var(--text-secondary)]">Automated emails for orders, leads, and follow-ups</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">
            <Check className="w-3.5 h-3.5" /> Connected
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Provider */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Email Provider</p>

          <div className="relative">
            <button
              onClick={() => setShowProvider(p => !p)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)]"
            >
              <span className={provider ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
                {provider || 'Select provider...'}
              </span>
              <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            {showProvider && (
              <div className="absolute top-full mt-1 w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-lg z-10 overflow-hidden">
                {PROVIDERS.map(p => (
                  <button key={p} onClick={() => { setProvider(p); setShowProvider(false); }}
                    className="w-full px-4 py-2.5 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            type="password"
            placeholder="API Key / SMTP password"
            className="w-full px-3 py-2.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          <input
            value={fromEmail}
            onChange={e => setFromEmail(e.target.value)}
            placeholder="From email (e.g. hello@yourstore.com)"
            className="w-full px-3 py-2.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Sequences */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">Email Sequences</p>
          <div className="space-y-2">
            {sequences.map(seq => (
              <div
                key={seq.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  seq.active
                    ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-500/5'
                    : 'border-[var(--border)]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{seq.label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{seq.desc}</p>
                  <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                    {seq.trigger}
                  </span>
                </div>
                <button
                  onClick={() => toggleSeq(seq.id)}
                  role="switch"
                  aria-checked={seq.active}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    seq.active ? 'bg-blue-500' : 'bg-[var(--border)]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                      seq.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving || !provider || !apiKey.trim() || !fromEmail.trim()}
          className="w-full py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Email Settings'}
        </button>
      </div>
    </div>
  );
}
