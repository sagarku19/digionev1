'use client';

import React, { useState } from 'react';
import { Send, ArrowLeft, Check, Loader2, Bell, Hash } from 'lucide-react';
import Link from 'next/link';

const NOTIFY_EVENTS = [
  { id: 'order.paid', label: 'New Order', desc: 'When a customer pays', emoji: '🛍️' },
  { id: 'customer.created', label: 'New Customer', desc: 'When someone signs up', emoji: '👤' },
  { id: 'lead.captured', label: 'New Lead', desc: 'When a lead form is submitted', emoji: '📋' },
  { id: 'payment.failed', label: 'Payment Failed', desc: 'When a payment attempt fails', emoji: '⚠️' },
  { id: 'product.published', label: 'Product Published', desc: 'When you go live with a product', emoji: '🚀' },
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
        <div className="w-12 h-12 bg-sky-50 dark:bg-sky-500/10 rounded-2xl flex items-center justify-center shrink-0">
          <Send className="w-6 h-6 text-sky-500" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Telegram Broadcasts</h1>
          <p className="text-sm text-[var(--text-secondary)]">Push updates to your Telegram channel or group</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">
            <Check className="w-3.5 h-3.5" /> Connected
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">Step 1 — Create a Telegram Bot</p>
          <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex gap-2">
              <span className="font-bold text-sky-500 shrink-0">1.</span>
              Open Telegram and search for <span className="font-bold text-[var(--text-primary)]">@BotFather</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-sky-500 shrink-0">2.</span>
              Send <span className="font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-xs">/newbot</span> and follow the prompts
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-sky-500 shrink-0">3.</span>
              Copy the <span className="font-bold text-[var(--text-primary)]">HTTP API token</span> BotFather gives you
            </li>
          </ol>
        </div>

        {/* Credentials */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Step 2 — Bot Credentials</p>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Bot Token</label>
            <input
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              type="password"
              placeholder="123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Channel / Chat ID</label>
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-3 py-2.5">
              <Hash className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
              <input
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                placeholder="-100123456789 or @yourchannel"
                className="flex-1 text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none"
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">Add your bot as admin to the channel first, then paste the channel username or numeric ID.</p>
          </div>
        </div>

        {/* Events */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Notify me when
          </p>
          <div className="space-y-2">
            {NOTIFY_EVENTS.map(ev => (
              <button
                key={ev.id}
                type="button"
                onClick={() => toggle(ev.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  events.includes(ev.id)
                    ? 'border-sky-400 bg-sky-50 dark:bg-sky-500/10'
                    : 'border-[var(--border)] hover:border-sky-300 dark:hover:border-sky-700'
                }`}
              >
                <span className="text-lg shrink-0">{ev.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{ev.label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{ev.desc}</p>
                </div>
                {events.includes(ev.id) && <Check className="w-4 h-4 text-sky-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving || !botToken.trim() || !chatId.trim()}
          className="w-full py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</> : saved ? <><Check className="w-4 h-4" /> Connected</> : 'Connect Telegram'}
        </button>
      </div>
    </div>
  );
}
