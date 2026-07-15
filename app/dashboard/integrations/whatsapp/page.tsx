'use client';

import React, { useState } from 'react';
import { PhoneForwarded, Check, Loader2, MessageSquare } from 'lucide-react';
import { BackButton } from '@/components/dashboard/BackButton';
import { Card } from '@/components/ui/Card';

const ACCENT = {
  text: 'text-[var(--success)]',
  bg: 'bg-[var(--success)]',
  softBg: 'bg-[var(--success-bg)]',
  border: 'border-[var(--success)]',
};

const INPUT =
  'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';

const TRIGGER_OPTIONS = [
  { id: 'order.paid', label: 'Order Confirmed', template: 'Hi {name}! Your order #{order_id} has been confirmed. 🎉' },
  { id: 'order.cancelled', label: 'Order Cancelled', template: 'Hi {name}, your order #{order_id} was cancelled. Contact us for help.' },
  { id: 'lead.captured', label: 'New Lead Welcome', template: 'Hi {name}! Thanks for signing up. Here is what happens next…' },
  { id: 'payment.failed', label: 'Payment Failed', template: 'Hi {name}, your payment for #{order_id} failed. Please retry.' },
];

export default function WhatsAppPage() {
  const [phone, setPhone] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ 'order.paid': true });
  const [templates, setTemplates] = useState<Record<string, string>>(
    Object.fromEntries(TRIGGER_OPTIONS.map(t => [t.id, t.template]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = async () => {
    if (!phone.trim() || !apiKey.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
  };

  const canSave = Boolean(phone.trim() && apiKey.trim());

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <header className="flex items-center gap-3 pt-6">
        <BackButton href="/dashboard/integrations" label="Back to Integrations" />
        <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${ACCENT.softBg} ${ACCENT.text}`}>
          <PhoneForwarded className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">WhatsApp Bots</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Send automated messages via the WhatsApp Business API.</p>
        </div>
        <ConnectionBadge connected={saved} />
      </header>

      <Card padded="sm" className="space-y-4">
        <SectionTitle title="Business credentials" hint="Connect your WhatsApp Business account." />

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Business phone number</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className={INPUT} />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">API access token</label>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" placeholder="EAAxxxxxxx…" className={INPUT} />
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">Find this in the Meta Developer Portal → your WhatsApp app.</p>
        </div>
      </Card>

      <Card padded="sm">
        <SectionTitle title="Message templates" hint="Pick which events trigger an automated message." />
        <div className="mt-4 space-y-2">
          {TRIGGER_OPTIONS.map(t => {
            const on = !!enabled[t.id];
            return (
              <div
                key={t.id}
                className={`rounded-[var(--radius-md)] border p-3.5 transition-colors ${on ? `${ACCENT.border}/30 ${ACCENT.softBg}` : 'border-[var(--border)]'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t.label}</p>
                  <Toggle on={on} onToggle={() => setEnabled(p => ({ ...p, [t.id]: !p[t.id] }))} accent={ACCENT.bg} />
                </div>

                {on && (
                  editingId === t.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        rows={3}
                        value={templates[t.id]}
                        onChange={e => setTemplates(p => ({ ...p, [t.id]: e.target.value }))}
                        className={`${INPUT} font-mono text-xs resize-none`}
                      />
                      <button
                        onClick={() => setEditingId(null)}
                        className={`text-xs font-medium ${ACCENT.text} focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded`}
                      >
                        Done editing
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <p className="flex-1 text-xs text-[var(--text-secondary)] font-mono leading-relaxed">{templates[t.id]}</p>
                      <button
                        onClick={() => setEditingId(t.id)}
                        className="shrink-0 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded"
                      >
                        Edit
                      </button>
                    </div>
                  )
                )}
                <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">Variables: {'{name}'}, {'{order_id}'}, {'{amount}'}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <SaveButton onClick={save} disabled={!canSave || saving} saving={saving} saved={saved} accent={ACCENT.bg}
        idle="Connect WhatsApp" busy="Connecting…" done="Connected" />
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /> {title}
      </h2>
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
