import React from 'react';
import { X, ArrowRight, FileText, BookOpen, Tag, Package } from 'lucide-react';
import { INPUT } from './_shared';

const CATEGORIES = [
  { value: 'digital', label: 'Digital File', icon: FileText, desc: 'PDF, ZIP, video, audio' },
  { value: 'course', label: 'Course', icon: BookOpen, desc: 'Structured learning' },
  { value: 'template', label: 'Template', icon: Tag, desc: 'Design or code templates' },
  { value: 'other', label: 'Other', icon: Package, desc: 'Custom digital product' },
];

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
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[480px] border border-[var(--border)] overflow-hidden transform transition-all scale-in-95 flex flex-col max-h-[90vh]">
        <div className="relative px-6 sm:px-8 pt-8 pb-6 border-b border-[var(--border-subtle)] shrink-0">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] relative z-10">Create Product</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1 relative z-10">Add a new offering to your catalog.</p>
          <button onClick={onClose} className="absolute top-8 right-8 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors z-20 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 sm:p-8 space-y-6 bg-[var(--surface-muted)]/30 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Product Name <span className="text-[var(--danger)]">*</span></label>
            <input type="text" required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Masterclass: Advanced UI Design" className={INPUT} />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-3">Category Type</label>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                  className={`relative flex flex-col items-start p-4 rounded-[var(--radius-lg)] text-left transition-all duration-200 border-2 overflow-hidden group focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${category === c.value ? 'border-[var(--brand)] bg-[var(--brand)]/5' : 'border-[var(--border)] hover:border-[var(--brand)]/40 bg-[var(--surface)]'}`}>
                  <c.icon className={`w-6 h-6 mb-3 ${category === c.value ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'}`} />
                  <div className="text-sm font-bold mb-0.5 text-[var(--text-primary)]">{c.label}</div>
                  <div className="text-xs text-[var(--text-secondary)] leading-tight">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Base Price (INR)</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium group-focus-within:text-[var(--brand)] transition-colors">{'₹'}</span>
              <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className={`${INPUT} pl-10 font-mono text-lg tracking-wider placeholder:text-base`} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-2 font-medium">You can configure free products or change pricing later.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--danger-bg)] text-[var(--danger)] text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] shrink-0" /> {error}
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={isCreating || !name.trim()} className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] py-4 rounded-[var(--radius-sm)] font-bold text-base shadow-[var(--shadow-sm)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              {isCreating ? 'Creating Product...' : 'Create & Continue'}
              {!isCreating && <ArrowRight className="w-4 h-4 ml-1" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
