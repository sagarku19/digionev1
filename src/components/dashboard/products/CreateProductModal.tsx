import React from 'react';
import { X, ArrowRight, FileText, BookOpen, Tag, Package, Loader2, Gift, Music, Code2, Briefcase, Camera, type LucideIcon } from 'lucide-react';
import { INPUT } from './_shared';
import { PRODUCT_CATEGORIES } from '@/lib/shared/product-categories';

const CATEGORY_META: Record<string, { icon: LucideIcon; desc: string }> = {
  digital: { icon: FileText, desc: 'PDF, ZIP, video, audio' },
  course: { icon: BookOpen, desc: 'Structured learning' },
  template: { icon: Tag, desc: 'Design or code templates' },
  music: { icon: Music, desc: 'Tracks, beats, sample packs' },
  software: { icon: Code2, desc: 'Scripts, plugins, tools' },
  business: { icon: Briefcase, desc: 'Guides, kits, spreadsheets' },
  photography: { icon: Camera, desc: 'Presets, LUTs, photo packs' },
  other: { icon: Package, desc: 'Custom digital product' },
};

const CATEGORIES = PRODUCT_CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
  icon: CATEGORY_META[c.value]?.icon ?? Package,
  desc: CATEGORY_META[c.value]?.desc ?? 'Digital product',
}));

type Props = {
  name: string;
  setName: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  isCreating: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
};

export default function CreateProductModal({
  name, setName, category, setCategory, price, setPrice, isCreating, error, onSubmit, onClose,
}: Props) {
  const isFree = price.trim() === '' || Number(price) === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card-lg)] w-full max-w-[540px] border border-[var(--border)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative px-6 sm:px-7 pt-6 pb-5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold font-display tracking-tight text-[var(--text-primary)]">Create product</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">Add a new offering to your catalog.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="absolute top-5 right-5 p-1.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 sm:p-7 space-y-5 overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-1.5">Product name <span className="text-[var(--danger)]">*</span></label>
            <input type="text" required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Masterclass: Advanced UI Design" className={INPUT} />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-2">Category type</label>
            <div className="grid grid-cols-2 gap-2.5">
              {CATEGORIES.map(c => {
                const active = category === c.value;
                return (
                  <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                    className={`group flex items-start gap-3 p-3.5 rounded-[var(--radius-md)] text-left transition-all duration-150 border focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${active ? 'border-[var(--brand)] bg-[var(--brand)]/[0.06] shadow-[var(--shadow-xs)]' : 'border-[var(--border)] hover:border-[var(--brand)]/40 bg-[var(--surface)]'}`}>
                    <div className={`w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 transition-colors ${active ? 'bg-[var(--brand)] text-[var(--text-on-brand)]' : 'bg-[var(--surface-muted)] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'}`}>
                      <c.icon className="w-[18px] h-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">{c.label}</div>
                      <div className="text-[11px] text-[var(--text-tertiary)] leading-tight mt-0.5">{c.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-semibold text-[var(--text-primary)]">Base price (INR)</label>
              <button
                type="button"
                onClick={() => setPrice(isFree ? '' : '0')}
                className={`inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${isFree ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'text-[var(--text-tertiary)] hover:text-[var(--brand)]'}`}
              >
                <Gift className="w-3 h-3" /> {isFree ? 'Free' : 'Make it free'}
              </button>
            </div>
            <div className="relative group">
              <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium transition-colors ${isFree ? 'text-[var(--success)]' : 'text-[var(--text-secondary)] group-focus-within:text-[var(--brand)]'}`}>₹</span>
              <input
                type="number" min="0" step="any" inputMode="decimal"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0"
                className={`${INPUT} pl-8 font-mono ${isFree ? 'border-[var(--success)]/40' : ''}`}
              />
              {isFree && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--success)] pointer-events-none">
                  <Gift className="w-3 h-3" /> Free product
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1.5">Set ₹0 for a free product. You can change pricing anytime.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--danger-bg)] text-[var(--danger)] text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] shrink-0" /> {error}
            </div>
          )}

          <button type="submit" disabled={isCreating || !name.trim()} className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-on-brand)] py-2.5 rounded-[var(--radius-sm)] font-semibold text-sm transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <>Create &amp; continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
