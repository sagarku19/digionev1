'use client';

import React, { useState } from 'react';
import { Send, Check, Loader2, Bell, Hash } from 'lucide-react';
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

const NOTIFY_EVENTS = [
  { id: 'order.paid', label: 'New Order', desc: 'When a customer pays', emoji: '🛍️' },
  { id: 'customer.created', label: 'New Customer', desc: 'When someone signs up', emoji: '👤' },
  { id: 'lead.captured', label: 'New Lead', desc: 'When a lead form is submitted', emoji: '📋' },
  { id: 'payment.failed', label: 'Payment Failed', desc: 'When a payment attempt fails', emoji: '⚠️' },
  { id: 'product.published', label: 'Product Published', desc: 'When you go live with a product', emoji: '🚀' },
];

const SETUP_STEPS = [
  <>Open Telegram and search for <span className="font-semibold text-[var(--text-primary)]">@BotFather</span></>,
  <>Send <code className="font-mono bg-[var(--surface-muted)] px-1.5 py-0.5 rounded text-xs">/newbot</code> and follow the prompts</>,
  <>Copy the <span className="font-semibold text-[var(--text-primary)]">HTTP API token</span> it gives you</>,
];

export default function TelegramPage() {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [events, setEvents] = useState<string[]>(['order.paid', 'customer.created']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) =>
    setEvents(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const save = async () => {
    if (!botToken.trim() || !chatId.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
  };

  const canSave = Boolean(botToken.trim() && chatId.trim());

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <header className="flex items-center gap-3 pt-6">
        <BackButton href="/dashboard/integrations" label="Back to Integrations" />
        <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${ACCENT.softBg} ${ACCENT.text}`}>
          <Send className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Telegram Broadcasts</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Push updates to your Telegram channel or group.</p>
        </div>
        <ConnectionBadge connected={saved} />
      </header>

      <Card padded="sm">
        <SectionTitle title="Step 1 — Create a Telegram bot" />
        <ol className="mt-4 space-y-2.5">
          {SETUP_STEPS.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-[var(--text-secondary)]">
              <span className={`flex items-center justify-center w-5 h-5 shrink-0 rounded-full text-[11px] font-semibold ${ACCENT.softBg} ${ACCENT.text}`}>{i + 1}</span>
              <span className="leading-5">{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card padded="sm" className="space-y-4">
        <SectionTitle title="Step 2 — Bot credentials" />

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Bot token</label>
          <input value={botToken} onChange={e => setBotToken(e.target.value)} type="password" placeholder="123456789:AAF…" className={INPUT} />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Channel / chat ID</label>
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--focus-ring)] transition-shadow">
            <Hash className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
            <input
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              placeholder="-100123456789 or @yourchannel"
              className="flex-1 text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">Add your bot as an admin to the channel first, then paste its username or numeric ID.</p>
        </div>
      </Card>

      <Card padded="sm">
        <SectionTitle title="Notify me when" icon={Bell} />
        <div className="mt-4 space-y-2">
          {NOTIFY_EVENTS.map(ev => {
            const on = events.includes(ev.id);
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => toggle(ev.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius-md)] border text-left transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                  on ? `${ACCENT.border}/30 ${ACCENT.softBg}` : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span className="text-lg shrink-0">{ev.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{ev.label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{ev.desc}</p>
                </div>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${on ? `${ACCENT.bg} border-transparent` : 'border-[var(--border-strong)]'}`}>
                  {on && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <SaveButton onClick={save} disabled={!canSave || saving} saving={saving} saved={saved} accent={ACCENT.bg}
        idle="Connect Telegram" busy="Connecting…" done="Connected" />
    </div>
  );
}

function SectionTitle({ title, hint, icon: Icon }: { title: string; hint?: string; icon?: React.ElementType }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />} {title}
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
