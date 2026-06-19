'use client';

import React, { useState } from 'react';
import { User, Mail, Phone, LogIn, ArrowUpDown, Package, Search, Plus, X } from 'lucide-react';
import type { SinglePageContentData, CheckoutFieldMode } from './singlepage-types';
import { SectionCard } from './_shared';

type ProductLite = { id: string; name: string; price: number; thumbnail_url: string | null; is_published?: boolean | null };

const DEFAULT_FIELDS = { name: 'required', email: 'required', phone: 'optional' } as const;
const MODES: { id: CheckoutFieldMode; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'optional', label: 'Optional' },
  { id: 'required', label: 'Required' },
];

function FieldRow({
  icon: Icon, label, mode, onMode,
}: { icon: React.ElementType; label: string; mode: CheckoutFieldMode; onMode: (m: CheckoutFieldMode) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
        <Icon className="h-4 w-4 text-[var(--text-secondary)]" /> {label}
      </span>
      <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onMode(m.id)}
            aria-pressed={mode === m.id}
            className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
              mode === m.id ? 'bg-[var(--surface)] text-[var(--brand)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SinglePageCheckoutSettingsEditor({
  data,
  onChange,
  products,
}: {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
  products: ProductLite[];
}) {
  const [upsellSearch, setUpsellSearch] = useState('');

  const fields = data.checkoutFields ?? DEFAULT_FIELDS;
  const setField = (key: 'name' | 'email' | 'phone', mode: CheckoutFieldMode) =>
    onChange({ ...data, checkoutFields: { ...DEFAULT_FIELDS, ...fields, [key]: mode } });

  const showLogin = data.checkoutShowLogin ?? true;

  const upsellIds = data.upsellProductIds || [];
  const upsellFiltered = products.filter(p =>
    p.id !== data.productId &&
    !upsellIds.includes(p.id) &&
    p.name?.toLowerCase().includes(upsellSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* ── Contact Fields ── */}
      <SectionCard icon={User} title="Contact Fields" desc="What the buyer fills in at checkout.">
        <div className="space-y-3">
          <FieldRow icon={User} label="Name" mode={fields.name} onMode={(m) => setField('name', m)} />
          <FieldRow icon={Mail} label="Email" mode={fields.email} onMode={(m) => setField('email', m)} />
          <FieldRow icon={Phone} label="Phone" mode={fields.phone} onMode={(m) => setField('phone', m)} />
        </div>

        <label className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
            <LogIn className="h-4 w-4 text-[var(--text-secondary)]" /> Show login option
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={showLogin}
            onClick={() => onChange({ ...data, checkoutShowLogin: !showLogin })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${showLogin ? 'bg-[var(--brand)]' : 'border border-[var(--border)] bg-[var(--surface-muted)]'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${showLogin ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </label>
      </SectionCard>

      {/* ── Upsell Products ── */}
      <SectionCard icon={ArrowUpDown} title="Upsell Products" desc="Recommend extra products at checkout to lift order value.">
        {upsellIds.length > 0 && (
          <div className="space-y-2">
            {upsellIds.map(id => {
              const p = products.find(pr => pr.id === id);
              if (!p) return null;
              return (
                <div key={id} className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-2.5">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt="" className="h-9 w-9 shrink-0 rounded-[var(--radius-sm)] object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface)]">
                      <Package className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{p.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{'₹'}{p.price}</p>
                  </div>
                  <button
                    onClick={() => onChange({ ...data, upsellProductIds: upsellIds.filter(uid => uid !== id) })}
                    aria-label="Remove upsell"
                    className="rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] transition-all hover:text-[var(--danger)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] group-hover:opacity-100 opacity-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={upsellSearch}
            onChange={e => setUpsellSearch(e.target.value)}
            placeholder="Search products to upsell…"
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] py-2.5 pl-10 pr-4 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] transition-all focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--brand)]/20"
          />
        </div>

        {upsellSearch && upsellFiltered.length > 0 && (
          <div className="max-h-36 overflow-y-auto overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
            {upsellFiltered.slice(0, 6).map(p => (
              <button
                key={p.id}
                onClick={() => { onChange({ ...data, upsellProductIds: [...upsellIds, p.id] }); setUpsellSearch(''); }}
                className="flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 text-left text-[13px] font-medium text-[var(--text-secondary)] transition-colors last:border-0 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Plus className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-[11px] tabular-nums opacity-60">{'₹'}{p.price}</span>
              </button>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
