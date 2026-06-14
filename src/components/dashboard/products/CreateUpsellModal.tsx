import React from 'react';
import { X, Sparkles, Search, Package, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatINR } from '@/lib/format';
import { INPUT } from './_shared';

type ProductOption = { id: string; name: string; price: number; thumbnail_url: string | null };

type Props = {
  step: 'info' | 'select';
  setStep: React.Dispatch<React.SetStateAction<'info' | 'select'>>;
  products: ProductOption[];
  filteredProducts: ProductOption[];
  primaryId: string;
  setPrimaryId: (id: string) => void;
  secondaryIds: string[];
  setSecondaryIds: React.Dispatch<React.SetStateAction<string[]>>;
  title: string;
  setTitle: (v: string) => void;
  productSearch: string;
  setProductSearch: (v: string) => void;
  isCreating: boolean;
  error: string;
  onCreate: () => void;
  onClose: () => void;
};

export default function CreateUpsellModal({
  step, setStep, products, filteredProducts, primaryId, setPrimaryId,
  secondaryIds, setSecondaryIds, title, setTitle, productSearch, setProductSearch,
  isCreating, error, onCreate, onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[540px] border border-[var(--border)] overflow-hidden transform transition-all scale-in-95 flex flex-col max-h-[90vh]">
        <div className="relative px-6 sm:px-8 pt-8 pb-6 border-b border-[var(--border-subtle)] shrink-0">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] relative z-10">
            {step === 'info' ? 'Create Upsell Page' : 'Configure Upsell'}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1 relative z-10">
            {step === 'info' ? 'Maximize revenue with smart bundle checkouts.' : 'Select products to bundle together.'}
          </p>
          <button onClick={onClose} className="absolute top-8 right-8 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors z-20 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 bg-[var(--surface-muted)]/30 overflow-y-auto custom-scrollbar">
          {step === 'info' ? (
            <div className="space-y-5">
              <div className="bg-[var(--brand)] rounded-[var(--radius-lg)] p-5 text-[var(--text-on-brand)]">
                <div className="w-10 h-10 bg-white/20 rounded-[var(--radius-sm)] flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5 text-[var(--text-on-brand)]" />
                </div>
                <h3 className="text-base font-extrabold mb-1">One link. Multiple products.</h3>
                <p className="text-sm text-[var(--text-on-brand)]/80 leading-relaxed">
                  Bundle a main product with optional add-ons buyers can toggle at checkout — no extra clicks, no friction.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { n: '1', label: 'Pick your primary product' },
                  { n: '2', label: 'Add up to 2 optional add-ons' },
                  { n: '3', label: 'Share the link and watch revenue grow' },
                ].map(stepItem => (
                  <div key={stepItem.n} className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)]">
                    <span className="w-6 h-6 rounded-full bg-[var(--brand)]/15 text-[var(--brand)] text-xs font-extrabold flex items-center justify-center shrink-0">{stepItem.n}</span>
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{stepItem.label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('select')}
                disabled={products.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] py-3.5 rounded-[var(--radius-sm)] font-bold text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                {products.length === 0 ? 'Create a product first' : 'Start Building →'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Campaign Internal Name</label>
                <input
                  type="text" value={title}
                  onChange={e => setTitle(e.target.value)}
                  className={INPUT}
                  placeholder={products.find(p => p.id === primaryId)?.name || 'e.g. Black Friday Mastery Bundle'}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Select Primary Product <span className="text-[var(--danger)]">*</span></label>
                <div className="relative mb-3 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] group-focus-within:text-[var(--brand)] transition-colors" />
                  <input
                    type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search your inventory..."
                    className={`${INPUT} pl-11 py-2.5`}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-[var(--border)] rounded-[var(--radius-sm)] divide-y divide-[var(--border-subtle)] bg-[var(--surface)] shadow-inner custom-scrollbar">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id} type="button"
                      onClick={() => { setPrimaryId(p.id); setSecondaryIds(ids => ids.filter(id => id !== p.id)); if (!title) setTitle(p.name); }}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                        primaryId === p.id ? 'bg-[var(--brand)]/8' : 'hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[var(--border-subtle)]" />
                      ) : (
                        <div className="w-10 h-10 bg-[var(--surface-muted)] rounded-lg flex items-center justify-center shrink-0 border border-[var(--border)]">
                          <Package className="w-4 h-4 text-[var(--text-tertiary)]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${primaryId === p.id ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{p.name}</p>
                        <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">{formatINR(p.price || 0)}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${primaryId === p.id ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--border)]'}`}>
                        {primaryId === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--text-on-brand)]" />}
                      </div>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="py-6 text-center text-sm text-[var(--text-secondary)]">No products found.</div>
                  )}
                </div>
              </div>

              {primaryId && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">
                    Add Order Bumps <span className="text-[var(--text-tertiary)] font-medium text-xs ml-1">(Optional, max 2)</span>
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {products.filter(p => p.id !== primaryId).map(p => {
                      const selected = secondaryIds.includes(p.id);
                      const disabled = !selected && secondaryIds.length >= 2;
                      return (
                        <button
                          key={p.id} type="button" disabled={disabled}
                          onClick={() => setSecondaryIds(ids => selected ? ids.filter(id => id !== p.id) : [...ids, p.id])}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] text-left transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                            selected
                              ? 'bg-[var(--surface)] border-2 border-[var(--brand)] shadow-[var(--shadow-xs)]'
                              : disabled
                                ? 'opacity-40 cursor-not-allowed bg-[var(--surface)] border-2 border-transparent'
                                : 'bg-[var(--surface)] border-2 border-[var(--border)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--border)]'}`}>
                            {selected && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--text-on-brand)]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${selected ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{p.name}</p>
                          </div>
                          <p className="text-xs font-bold text-[var(--text-secondary)] shrink-0 bg-[var(--surface-muted)] px-2 py-1 rounded-md">{formatINR(p.price || 0)}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--danger-bg)] text-[var(--danger)] text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] shrink-0" /> {error}
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={onCreate}
                  disabled={!primaryId || isCreating}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-[var(--text-on-brand)] py-4 rounded-[var(--radius-sm)] font-bold text-base shadow-[var(--shadow-sm)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  {isCreating ? 'Building Funnel...' : 'Publish Funnel Page'}
                  {!isCreating && <ArrowRight className="w-4 h-4 ml-1" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
