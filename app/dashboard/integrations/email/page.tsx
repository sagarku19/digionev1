'use client';

import React, { useState } from 'react';
import { Mail, Check, Loader2, ChevronDown } from 'lucide-react';
import { BackButton } from '@/components/dashboard/BackButton';
import { Card } from '@/components/ui/Card';

const ACCENT = {
  text: 'text-[var(--info)]',
  bg: 'bg-[var(--info)]',
  softBg: 'bg-[var(--info-bg)]',
  border: 'border-[var(--info)]',
};

const INPUT =
  'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';

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

  const canSave = Boolean(provider && apiKey.trim() && fromEmail.trim());

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <header className="flex items-center gap-3 pt-6">
        <BackButton href="/dashboard/integrations" label="Back to Integrations" />
        <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${ACCENT.softBg} ${ACCENT.text}`}>
          <Mail className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Email Sequences</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Automated emails for orders, leads, and follow-ups.</p>
        </div>
        <ConnectionBadge connected={saved} />
      </header>

      <Card padded="sm" className="space-y-4">
        <SectionTitle title="Email provider" hint="Choose the service that delivers your emails." />

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Provider</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProvider(p => !p)}
              className={`${INPUT} flex items-center justify-between`}
            >
              <span className={provider ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}>
                {provider || 'Select provider…'}
              </span>
              <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            {showProvider && (
              <div className="absolute top-full mt-1 w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)] z-10 overflow-hidden">
                {PROVIDERS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setProvider(p); setShowProvider(false); }}
                    className="w-full px-3 py-2 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">API key / SMTP password</label>
          <input
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            type="password"
            placeholder="••••••••••••"
            className={INPUT}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">From email</label>
          <input
            value={fromEmail}
            onChange={e => setFromEmail(e.target.value)}
            placeholder="hello@yourstore.com"
            className={INPUT}
          />
        </div>
      </Card>

      <Card padded="sm">
        <SectionTitle title="Email sequences" hint="Turn automated emails on or off." />
        <div className="mt-4 space-y-2">
          {sequences.map(seq => (
            <div
              key={seq.id}
              className={`flex items-center gap-4 p-3.5 rounded-[var(--radius-md)] border transition-colors ${
                seq.active ? `${ACCENT.border}/30 ${ACCENT.softBg}` : 'border-[var(--border)]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{seq.label}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{seq.desc}</p>
                <span className={`inline-block mt-1.5 text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-[var(--radius-sm)] ${ACCENT.softBg} ${ACCENT.text}`}>
                  {seq.trigger}
                </span>
              </div>
              <Toggle on={seq.active} onToggle={() => toggleSeq(seq.id)} accent={ACCENT.bg} />
            </div>
          ))}
        </div>
      </Card>

      <SaveButton onClick={save} disabled={!canSave || saving} saving={saving} saved={saved} accent={ACCENT.bg}
        idle="Save email settings" busy="Saving…" done="Saved" />
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
      {hint && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{hint}</p>}
    </div>
  );
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  if (!connected) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--success-bg)] text-[var(--success)] shrink-0">
      <Check className="w-3 h-3" /> Connected
    </span>
  );
}

function Toggle({ on, onToggle, accent }: { on: boolean; onToggle: () => void; accent: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${on ? accent : 'bg-[var(--border-strong)]'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 mt-0.5 transform rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SaveButton({
  onClick, disabled, saving, saved, accent, idle, busy, done,
}: {
  onClick: () => void; disabled: boolean; saving: boolean; saved: boolean; accent: string;
  idle: string; busy: string; done: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-2.5 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--text-on-brand)] ${accent} hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]`}
    >
      {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {busy}</> : saved ? <><Check className="w-4 h-4" /> {done}</> : idle}
    </button>
  );
}
