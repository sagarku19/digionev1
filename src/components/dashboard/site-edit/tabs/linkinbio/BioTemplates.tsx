'use client';
// BioTemplates — two kinds of templates for Link in Bio:
//   • Design  → applies colors + style only (content untouched)
//   • Content → applies prebuilt blocks together with their own design
import { useState, type ElementType } from 'react';
import { Palette, LayoutTemplate, Check } from 'lucide-react';

export type TemplatePreview = { bg: string; accent: string; text: string; card: string };
export type TemplateCard = { name: string; tag?: string; description?: string; preview: TemplatePreview };

type Props = {
  designTemplates: TemplateCard[];
  contentTemplates: TemplateCard[];
  onApplyDesign: (index: number) => void;
  onApplyContent: (index: number) => void;
};

export default function BioTemplates({ designTemplates, contentTemplates, onApplyDesign, onApplyContent }: Props) {
  const [tab, setTab] = useState<'content' | 'design'>('content');
  const [selected, setSelected] = useState<{ content: number | null; design: number | null }>({ content: null, design: null });

  const cards = tab === 'design' ? designTemplates : contentTemplates;
  const selectedIndex = tab === 'design' ? selected.design : selected.content;

  const handleApply = (i: number) => {
    if (tab === 'design') { onApplyDesign(i); setSelected((s) => ({ ...s, design: i })); }
    else { onApplyContent(i); setSelected((s) => ({ ...s, content: i })); }
  };

  return (
    <div className="space-y-4">
      {/* segmented toggle — Content first */}
      <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-1">
        <TabBtn active={tab === 'content'} onClick={() => setTab('content')} icon={LayoutTemplate} title="Content" subtitle="Prebuilt blocks" />
        <TabBtn active={tab === 'design'} onClick={() => setTab('design')} icon={Palette} title="Design" subtitle="Colors & style" />
      </div>

      <p className="text-xs text-[var(--text-secondary)]">
        {tab === 'design'
          ? 'Apply a colour theme and style — your existing blocks stay exactly as they are.'
          : 'Start from a ready-made layout. This replaces your current blocks with the template’s content.'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((t, i) => {
          const isSelected = selectedIndex === i;
          return (
            <button
              key={`${tab}-${t.name}`}
              onClick={() => handleApply(i)}
              aria-pressed={isSelected}
              className={`group flex flex-col overflow-hidden rounded-[var(--radius-xl)] border text-left shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-card-lg)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                isSelected ? 'border-[var(--brand)] ring-2 ring-[var(--brand)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface)]'
              }`}
            >
              <div className="relative">
                {tab === 'design' ? <DesignMock preview={t.preview} /> : <ContentMock preview={t.preview} />}
                {isSelected && (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-on-brand)] shadow-[var(--shadow-sm)]">
                    <Check className="h-3 w-3" /> Selected
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{t.name}</span>
                  {t.description && <span className="block truncate text-[11px] text-[var(--text-tertiary)]">{t.description}</span>}
                </div>
                {t.tag && (
                  <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{t.tag}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, title, subtitle }: { active: boolean; onClick: () => void; icon: ElementType; title: string; subtitle: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
        active ? 'bg-[var(--surface)] shadow-[var(--shadow-xs)]' : 'hover:bg-[var(--surface-hover)]'
      }`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${active ? 'bg-[var(--brand)] text-[var(--text-on-brand)]' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-semibold ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{title}</span>
        <span className="block truncate text-[11px] text-[var(--text-tertiary)]">{subtitle}</span>
      </span>
    </button>
  );
}

// Design preview emphasises the palette: swatch row + accent button on the theme bg.
function DesignMock({ preview }: { preview: TemplatePreview }) {
  return (
    <div className="flex h-28 flex-col justify-center gap-2 border-b border-[var(--border-subtle)] px-4" style={{ background: preview.bg }}>
      <div className="flex gap-1.5">
        {[preview.accent, preview.text, preview.card].map((c, i) => (
          <span key={i} className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="mt-0.5 h-5 w-full rounded-md" style={{ backgroundColor: preview.accent }} />
      <div className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: preview.text, opacity: 0.3 }} />
    </div>
  );
}

// Content preview emphasises the layout: avatar + title + stacked link buttons.
function ContentMock({ preview }: { preview: TemplatePreview }) {
  return (
    <div className="flex h-28 flex-col items-center justify-center gap-1.5 border-b border-[var(--border-subtle)] px-5" style={{ background: preview.bg }}>
      <span className="h-7 w-7 rounded-full" style={{ backgroundColor: preview.accent }} />
      <span className="h-1.5 w-12 rounded-full" style={{ backgroundColor: preview.text, opacity: 0.3 }} />
      <span className="mt-0.5 h-3.5 w-full rounded-md" style={{ backgroundColor: preview.accent, opacity: 0.9 }} />
      <span className="h-3.5 w-full rounded-md" style={{ backgroundColor: preview.text, opacity: 0.12 }} />
      <span className="h-3.5 w-full rounded-md" style={{ backgroundColor: preview.text, opacity: 0.12 }} />
    </div>
  );
}
