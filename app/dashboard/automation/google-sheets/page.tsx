'use client';

import React, { useState } from 'react';
import { Table2, ArrowLeft, ExternalLink, Check, Loader2, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

const SYNC_OPTIONS = [
  { id: 'orders', label: 'Orders', desc: 'Sync every new order row — customer, amount, product, status' },
  { id: 'customers', label: 'Customers', desc: 'Sync new customer sign-ups with name and email' },
  { id: 'leads', label: 'Leads', desc: 'Sync captured leads from your landing pages' },
  { id: 'products', label: 'Products', desc: 'Sync product catalog updates in real time' },
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
        <div className="w-12 h-12 bg-green-50 dark:bg-green-500/10 rounded-2xl flex items-center justify-center shrink-0">
          <Table2 className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Google Sheets</h1>
          <p className="text-sm text-[var(--text-secondary)]">Auto-sync your DigiOne data to a spreadsheet</p>
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
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">Step 1 — Create or open a Google Sheet</p>
          <a
            href="https://sheets.new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-green-600 dark:text-green-400 hover:underline"
          >
            Open Google Sheets <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <p className="text-xs text-[var(--text-secondary)] mt-2">Make sure sharing is set to &quot;Anyone with the link can edit&quot;.</p>
        </div>

        {/* Step 2 */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">Step 2 — Paste your Sheet URL</p>
          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-3 py-2.5">
            <LinkIcon className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            <input
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none"
            />
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">Step 3 — Choose what to sync</p>
          <div className="space-y-2">
            {SYNC_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                  selected.includes(opt.id)
                    ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                    : 'border-[var(--border)] hover:border-green-300 dark:hover:border-green-700'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  selected.includes(opt.id) ? 'bg-green-500 border-green-500' : 'border-[var(--border)]'
                }`}>
                  {selected.includes(opt.id) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{opt.label}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving || !sheetUrl.trim() || !selected.length}
          className="w-full py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</> : saved ? <><Check className="w-4 h-4" /> Connected</> : 'Connect Google Sheets'}
        </button>
      </div>
    </div>
  );
}
