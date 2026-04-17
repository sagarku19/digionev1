'use client';

import React, { useState } from 'react';
import { PhoneForwarded, ArrowLeft, Check, Loader2, MessageSquare } from 'lucide-react';
import Link from 'next/link';

const TRIGGER_OPTIONS = [
  { id: 'order.paid', label: 'Order Confirmed', template: 'Hi {name}! Your order #{order_id} has been confirmed. 🎉' },
  { id: 'order.cancelled', label: 'Order Cancelled', template: 'Hi {name}, your order #{order_id} was cancelled. Contact us for help.' },
  { id: 'lead.captured', label: 'New Lead Welcome', template: 'Hi {name}! Thanks for signing up. Here is what happens next...' },
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
        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0">
          <PhoneForwarded className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">WhatsApp Bots</h1>
          <p className="text-sm text-[var(--text-secondary)]">Send automated messages via WhatsApp Business API</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">
            <Check className="w-3.5 h-3.5" /> Connected
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Credentials */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">WhatsApp Business Credentials</p>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Business Phone Number</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">API Access Token</label>
            <input
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              type="password"
              placeholder="EAAxxxxxxx..."
              className="w-full px-3 py-2.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">Get this from the Meta Developer Portal → WhatsApp app.</p>
          </div>
        </div>

        {/* Message triggers */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Message Templates
          </p>
          <div className="space-y-3">
            {TRIGGER_OPTIONS.map(t => (
              <div
                key={t.id}
                className={`border-2 rounded-xl p-4 transition-all ${
                  enabled[t.id]
                    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5'
                    : 'border-[var(--border)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{t.label}</p>
                  <button
                    onClick={() => setEnabled(p => ({ ...p, [t.id]: !p[t.id] }))}
                    role="switch"
                    aria-checked={enabled[t.id]}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      enabled[t.id] ? 'bg-emerald-500' : 'bg-[var(--border)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                        enabled[t.id] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {enabled[t.id] && (
                  editingId === t.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={templates[t.id]}
                        onChange={e => setTemplates(p => ({ ...p, [t.id]: e.target.value }))}
                        className="w-full px-3 py-2 text-xs font-mono bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] outline-none resize-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button onClick={() => setEditingId(null)} className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Save template
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed flex-1">{templates[t.id]}</p>
                      <button onClick={() => setEditingId(t.id)} className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 transition-colors">
                        Edit
                      </button>
                    </div>
                  )
                )}
                <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">Variables: {'{name}'}, {'{order_id}'}, {'{amount}'}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving || !phone.trim() || !apiKey.trim()}
          className="w-full py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</> : saved ? <><Check className="w-4 h-4" /> Connected</> : 'Connect WhatsApp'}
        </button>
      </div>
    </div>
  );
}
