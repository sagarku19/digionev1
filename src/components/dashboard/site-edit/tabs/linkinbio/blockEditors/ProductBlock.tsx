import React from 'react';
import { Plus, Package } from 'lucide-react';
import { FieldLabel, INPUT, Chip, SEG, ACCENT_BTN } from './_shared';
import type { BlockEditorProps } from './types';

export default function ProductBlock({ link, update, updateMeta, openImagePicker, products }: BlockEditorProps) {
  const sel = products?.find(p => p.id === link.product_id);
  return (
    <div className="space-y-3">

      {/* ── Product selector ── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Product</FieldLabel>
          <a href="/dashboard/products/new" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-semibold text-[var(--brand)] hover:underline transition">
            <Plus className="w-3 h-3" /> New Product
          </a>
        </div>
        {products && products.length > 0 ? (
          <>
            <select
              value={link.product_id}
              onChange={e => {
                const picked = products.find(p => p.id === e.target.value);
                update({
                  product_id: e.target.value,
                  title: link.title || picked?.name || '',
                  thumbnail_url: link.thumbnail_url || picked?.thumbnail_url || '',
                });
              }}
              className={INPUT}
            >
              <option value="">Select a product…</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {'₹'}{p.price.toLocaleString('en-IN')}{p.is_published === false ? ' (draft)' : ''}
                </option>
              ))}
            </select>

            {/* Selected product preview card */}
            {sel && (
              <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-2.5">
                {sel.thumbnail_url ? (
                  <img src={sel.thumbnail_url} alt={sel.name} className="h-12 w-12 shrink-0 rounded-[var(--radius-md)] border border-[var(--border)] object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface)]">
                    <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{sel.name}</p>
                  <p className="text-xs text-[var(--brand)] font-medium">{'₹'}{sel.price.toLocaleString('en-IN')}</p>
                  {sel.is_published === false && <span className="text-[10px] text-[var(--warning)]">Draft</span>}
                </div>
                <button
                  type="button"
                  onClick={() => update({
                    title: sel.name,
                    thumbnail_url: sel.thumbnail_url || link.thumbnail_url,
                  })}
                  className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--brand)]/10 px-2.5 py-1 text-[10px] font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)]/20 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  Auto-fill
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--warning)]/20 bg-[var(--warning-bg)] p-3">
            <p className="text-xs text-[var(--warning)]">No products yet.</p>
            <a href="/dashboard/products/new" target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-semibold text-[var(--warning)] underline">
              Create one →
            </a>
          </div>
        )}
      </div>

      {/* ── Product image ── */}
      <div>
        <FieldLabel>Product Image</FieldLabel>
        <div className="flex gap-2">
          <input type="url" value={link.thumbnail_url}
            onChange={e => update({ thumbnail_url: e.target.value })}
            className={`${INPUT} flex-1`} placeholder="Image URL or pick below…" />
          <button type="button" onClick={() => openImagePicker('thumbnail_url')} className={ACCENT_BTN}>
            <Package className="h-3.5 w-3.5" /> Pick
          </button>
        </div>
        {link.thumbnail_url && (
          <div className="mt-2 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]">
            <img src={link.thumbnail_url} alt="" className="w-full h-28 object-cover" />
          </div>
        )}
      </div>

      {/* ── Title ── */}
      <div>
        <FieldLabel>Display Title</FieldLabel>
        <input type="text" value={link.title}
          onChange={e => update({ title: e.target.value })}
          className={INPUT} placeholder="Product name shown on card" />
      </div>

      {/* ── Description ── */}
      <div>
        <FieldLabel>Short Description</FieldLabel>
        <textarea value={link.description}
          onChange={e => update({ description: e.target.value })}
          className={`${INPUT} resize-none`} rows={2}
          placeholder="One-line product pitch…" />
      </div>

      {/* ── Badge + CTA ── */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Badge Label</FieldLabel>
          <input type="text" value={link.metadata?.badge || ''}
            onChange={e => updateMeta('badge', e.target.value)}
            className={INPUT} placeholder="New, Sale, Hot…" />
        </div>
        <div>
          <FieldLabel>CTA Button Text</FieldLabel>
          <input type="text" value={link.metadata?.cta_text || ''}
            onChange={e => updateMeta('cta_text', e.target.value)}
            className={INPUT} placeholder="Buy Now" />
        </div>
      </div>

      {/* ── Layout + Button position ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Card Layout</FieldLabel>
          <div className={SEG}>
            {[{ id: 'horizontal', label: 'Row' }, { id: 'split', label: 'Split' }, { id: 'vertical', label: 'Card' }].map(l => (
              <Chip key={l.id}
                active={(link.metadata?.layout || 'horizontal') === l.id}
                onClick={() => updateMeta('layout', l.id)}>
                {l.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Button Position</FieldLabel>
          <div className={SEG}>
            {[{ id: 'right', label: 'Right' }, { id: 'center', label: 'Center' }, { id: 'full', label: 'Full' }].map(b => (
              <Chip key={b.id}
                active={(link.metadata?.button_position || 'right') === b.id}
                onClick={() => updateMeta('button_position', b.id)}>
                {b.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* ── Price controls ── */}
      <div className="space-y-2">
        {/* Show price toggle */}
        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Show Price</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">Display product price on card</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={link.metadata?.show_price ?? true}
            aria-label="Show price"
            onClick={() => updateMeta('show_price', !(link.metadata?.show_price ?? true))}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${(link.metadata?.show_price ?? true) ? 'bg-[var(--brand)]' : 'border border-[var(--border)] bg-[var(--surface-muted)]'}`}
          >
            <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${(link.metadata?.show_price ?? true) ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Price position + original price — only when price is visible */}
        {(link.metadata?.show_price ?? true) && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Price Position</FieldLabel>
              <div className={SEG}>
                {[{ id: 'below', label: 'Below title' }, { id: 'inline', label: 'Right of title' }].map(p => (
                  <Chip key={p.id}
                    active={(link.metadata?.price_position || 'below') === p.id}
                    onClick={() => updateMeta('price_position', p.id)}>
                    {p.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Original / MRP Price</FieldLabel>
              <input
                type="number"
                min={0}
                value={link.metadata?.original_price ?? ''}
                onChange={e => updateMeta('original_price', e.target.value === '' ? null : Number(e.target.value))}
                className={INPUT}
                placeholder="e.g. 999"
              />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Shows crossed-out next to price</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
