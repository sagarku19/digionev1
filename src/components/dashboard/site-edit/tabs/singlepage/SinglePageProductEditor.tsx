'use client';

import React, { useState } from 'react';
import { Package, Search, Plus, X, ArrowUpDown, Star, Zap, Rocket, Shield, Heart, Gift, BookOpen, Code, Globe, Layers, Lightbulb, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import type { SinglePageContentData } from './singlepage-types';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-[var(--text-primary)] placeholder-gray-400 transition-all duration-300';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">{children}</label>;
}

function SectionCard({ icon: Icon, title, desc, color = 'blue', children }: { icon: React.ElementType; title: string; desc?: string; color?: string; children: React.ReactNode }) {
  const colors: Record<string, string> = { blue: 'text-blue-500', amber: 'text-amber-500', emerald: 'text-emerald-500', violet: 'text-gray-500' };
  return (
    <div className="bg-[var(--bg-primary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colors[color] ?? 'text-blue-500'}`} /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

const FEATURE_ICONS = [
  { id: 'zap', label: 'Zap', icon: Zap },
  { id: 'rocket', label: 'Rocket', icon: Rocket },
  { id: 'shield', label: 'Shield', icon: Shield },
  { id: 'heart', label: 'Heart', icon: Heart },
  { id: 'gift', label: 'Gift', icon: Gift },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'book', label: 'Book', icon: BookOpen },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'globe', label: 'Globe', icon: Globe },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'lightbulb', label: 'Idea', icon: Lightbulb },
  { id: 'trending', label: 'Growth', icon: TrendingUp },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'check', label: 'Check', icon: CheckCircle2 },
];

export default function SinglePageProductEditor({
  data,
  onChange,
  products,
}: {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
  products: { id: string; name: string; price: number; thumbnail_url: string | null; is_published?: boolean | null }[];
}) {
  const [search, setSearch] = useState('');
  const [upsellSearch, setUpsellSearch] = useState('');
  const [showIconPicker, setShowIconPicker] = useState<number | null>(null);

  const upsellIds = data.upsellProductIds || [];
  const included = data.whatsIncluded || [];
  const features = data.features || [];

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));
  const selectedProduct = products.find(p => p.id === data.productId);

  const upsellFiltered = products.filter(p =>
    p.id !== data.productId &&
    !upsellIds.includes(p.id) &&
    p.name?.toLowerCase().includes(upsellSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">



      {/* ── Main Product ── */}
      <SectionCard icon={Package} title="Main Product" desc="The primary product on this landing page.">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl text-[13px] outline-none text-[var(--text-primary)] placeholder-gray-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
        </div>

        {selectedProduct && (
          <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl">
            {selectedProduct.thumbnail_url ? (
              <img src={selectedProduct.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{selectedProduct.name}</p>
              <p className="text-xs text-gray-500">{'\u20B9'}{selectedProduct.price}</p>
            </div>
            <button onClick={() => onChange({ ...data, productId: null })}
              className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="border border-[var(--border)]/60 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-[var(--bg-primary)]">
          {filtered.map(p => {
            const isSel = data.productId === p.id;
            return (
              <button key={p.id} onClick={() => onChange({ ...data, productId: isSel ? null : p.id })}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors text-[13px] font-medium border-b border-gray-50 dark:border-[var(--border)]/40 last:border-0 ${
                  isSel ? 'bg-blue-50/50 dark:bg-blue-500/5 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)]/30 text-gray-700 dark:text-[var(--text-secondary)]'
                }`}>
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                )}
                <span className="truncate flex-1">{p.name}</span>
                {p.price > 0 && <span className="text-[11px] opacity-60 tabular-nums">{'\u20B9'}{p.price}</span>}
              </button>
            );
          })}
          {products.length === 0 && <p className="text-[13px] text-gray-400 p-6 text-center italic">No products available</p>}
        </div>
      </SectionCard>
      {/* ── Pricing ── */}
      <SectionCard icon={Package} title="Pricing" desc="Set real and original prices for your product." color="blue">
        <div className="space-y-4">
          <div>
            <FieldLabel>Original Price (Show with strikethrough)</FieldLabel>
            <input
              type="number"
              value={data.fakePrice || 0}
              onChange={e => onChange({ ...data, fakePrice: Number(e.target.value) })}
              className={INPUT}
              placeholder="e.g. 500"
              min=" "
            />
            <p className="text-[11px] text-gray-400 mt-1">Leave blank to hide original price</p>
          </div>
        </div>
      </SectionCard>
      
      {/* ── Features / Benefits ── */}
      <SectionCard icon={Zap} title="Features & Benefits" desc="Highlight what makes your product unique. Shown as a feature grid." color="violet">
        <div className="space-y-3">
          {features.map((feat, i) => {
            const iconInfo = FEATURE_ICONS.find(fi => fi.id === feat.icon);
            const FeatIcon = iconInfo?.icon || Zap;
            return (
              <div key={i} className="p-4 bg-gray-50/80 dark:bg-[var(--bg-secondary)]/20 rounded-2xl border border-[var(--border)] group relative">
                <button
                  onClick={() => onChange({ ...data, features: features.filter((_, idx) => idx !== i) })}
                  className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Icon picker */}
                <div className="mb-3">
                  <button
                    onClick={() => setShowIconPicker(showIconPicker === i ? null : i)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-secondary)] hover:border-gray-400 transition-all"
                  >
                    <FeatIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-[11px] font-medium text-gray-600 dark:text-[var(--text-secondary)]">{iconInfo?.label || feat.icon}</span>
                    <span className="text-[10px] text-gray-400 ml-1">Change</span>
                  </button>
                  {showIconPicker === i && (
                    <div className="mt-2 grid grid-cols-7 gap-1.5 p-2 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-lg">
                      {FEATURE_ICONS.map(fi => (
                        <button key={fi.id}
                          onClick={() => { onChange({ ...data, features: features.map((f, idx) => idx === i ? { ...f, icon: fi.id } : f) }); setShowIconPicker(null); }}
                          className={`p-2 rounded-lg flex flex-col items-center gap-0.5 transition ${feat.icon === fi.id ? 'bg-gray-100 dark:bg-[var(--bg-secondary)] text-gray-700 dark:text-[var(--text-secondary)]' : 'hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] text-gray-500'}`}
                          title={fi.label}
                        >
                          <fi.icon className="w-4 h-4" />
                          <span className="text-[8px] font-medium">{fi.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <FieldLabel>Feature Title</FieldLabel>
                    <input
                      type="text"
                      value={feat.title}
                      onChange={e => onChange({ ...data, features: features.map((f, idx) => idx === i ? { ...f, title: e.target.value } : f) })}
                      className={INPUT}
                      placeholder="e.g. Lifetime Access"
                    />
                  </div>
                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <textarea
                      rows={2}
                      value={feat.description}
                      onChange={e => onChange({ ...data, features: features.map((f, idx) => idx === i ? { ...f, description: e.target.value } : f) })}
                      className={`${INPUT} resize-none`}
                      placeholder="Briefly describe this feature..."
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onChange({ ...data, features: [...features, { title: '', description: '', icon: 'zap' }] })}
          className="flex items-center justify-center w-full gap-2 py-3 border border-dashed border-gray-300 dark:border-[var(--border)] rounded-2xl text-[13px] font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)]/50 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Feature
        </button>
      </SectionCard>

      {/* ── Upsell Products ── */}
      <SectionCard icon={ArrowUpDown} title="Upsell Products" desc="Recommend additional products to increase order value." color="amber">
        {upsellIds.length > 0 && (
          <div className="space-y-2">
            {upsellIds.map(id => {
              const p = products.find(pr => pr.id === id);
              if (!p) return null;
              return (
                <div key={id} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-[var(--bg-secondary)]/30 rounded-xl border border-[var(--border)] group">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-500">{'\u20B9'}{p.price}</p>
                  </div>
                  <button onClick={() => onChange({ ...data, upsellProductIds: upsellIds.filter(uid => uid !== id) })}
                    className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={upsellSearch} onChange={e => setUpsellSearch(e.target.value)}
            placeholder="Search products to upsell..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl text-[13px] outline-none text-[var(--text-primary)] placeholder-gray-400 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all" />
        </div>

        {upsellSearch && upsellFiltered.length > 0 && (
          <div className="border border-[var(--border)]/60 rounded-xl overflow-hidden max-h-36 overflow-y-auto bg-[var(--bg-primary)]">
            {upsellFiltered.slice(0, 5).map(p => (
              <button key={p.id}
                onClick={() => { onChange({ ...data, upsellProductIds: [...upsellIds, p.id] }); setUpsellSearch(''); }}
                className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)]/30 transition-colors text-[13px] font-medium border-b border-gray-50 dark:border-[var(--border)]/40 last:border-0 text-gray-700 dark:text-[var(--text-secondary)]">
                <Plus className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate flex-1">{p.name}</span>
                <span className="text-[11px] opacity-60 tabular-nums">{'\u20B9'}{p.price}</span>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── What's Included ── */}
      <SectionCard icon={Star} title="What's Included" desc="Highlight what the buyer gets." color="emerald">
        <div className="space-y-2">
          {included.map((item, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <span className="text-emerald-500 text-sm shrink-0">✓</span>
              <input type="text" value={item}
                onChange={e => onChange({ ...data, whatsIncluded: included.map((v, idx) => idx === i ? e.target.value : v) })}
                className={`${INPUT} flex-1`} placeholder="e.g. 10 video modules" />
              <button onClick={() => onChange({ ...data, whatsIncluded: included.filter((_, idx) => idx !== i) })}
                className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => onChange({ ...data, whatsIncluded: [...included, ''] })}
          className="flex items-center justify-center w-full gap-2 py-2.5 border border-dashed border-gray-300 dark:border-[var(--border)] rounded-xl text-[13px] font-semibold text-gray-500 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </SectionCard>

    </div>
  );
}
