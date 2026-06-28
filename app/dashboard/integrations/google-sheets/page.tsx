'use client';

import React, { useState } from 'react';
import { Table2, ArrowLeft, ExternalLink, Check, Loader2, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

const ACCENT = {
  text: 'text-[var(--success)]',
  bg: 'bg-[var(--success)]',
  softBg: 'bg-[var(--success-bg)]',
  border: 'border-[var(--success)]',
};

const SYNC_OPTIONS = [
  { id: 'orders', label: 'Orders', desc: 'Every new order — customer, amount, product, status' },
  { id: 'customers', label: 'Customers', desc: 'New customer sign-ups with name and email' },
  { id: 'leads', label: 'Leads', desc: 'Captured leads from your landing pages' },
  { id: 'products', label: 'Products', desc: 'Product catalog updates in real time' },
];

export default function GoogleSheetsPage() {
  const [sheetUrl, setSheetUrl] = useState('');
  const [selected, setSelected] = useState<string[]>(['orders']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const save = async () => {
    if (!sheetUrl.trim() || !selected.length) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
  };

  const canSave = Boolean(sheetUrl.trim() && selected.length);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link
        href="/dashboard/integrations"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] pt-6 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Integrations
      </Link>

      <header className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${ACCENT.softBg} ${ACCENT.text}`}>
          <Table2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Google Sheets</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Auto-sync your DigiOne data to a spreadsheet.</p>
        </div>
        <ConnectionBadge connected={saved} />
      </header>

      <Card padded="sm">
        <SectionTitle title="Step 1 — Open a Google Sheet" hint="Set sharing to “Anyone with the link can edit”." />
        <a
          href="https://sheets.new"
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-3 inline-flex items-center gap-1.5 text-sm font-medium ${ACCENT.text} hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded`}
        >
          Create a new sheet <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </Card>

      <Card padded="sm">
        <SectionTitle title="Step 2 — Paste your sheet URL" />
        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--focus-ring)] transition-shadow">
          <LinkIcon className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
          <input
            value={sheetUrl}
            onChange={e => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            className="flex-1 text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
          />
        </div>
      </Card>

      <Card padded="sm">
        <SectionTitle title="Step 3 — Choose what to sync" />
        <div className="mt-4 space-y-2">
          {SYNC_OPTIONS.map(opt => {
            const on = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-[var(--radius-md)] border text-left transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                  on ? `${ACCENT.border}/30 ${ACCENT.softBg}` : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${on ? `${ACCENT.bg} border-transparent` : 'border-[var(--border-strong)]'}`}>
                  {on && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{opt.label}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <SaveButton onClick={save} disabled={!canSave || saving} saving={saving} saved={saved} accent={ACCENT.bg}
        idle="Connect Google Sheets" busy="Connecting…" done="Connected" />
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
