'use client';

import React, { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import type { BioAppearanceData } from './SinglePageAppearanceEditor';

export type TemplatePreset = {
  id: string;
  name: string;
  description: string;
  palette: Record<string, string>;
  appearance: Partial<BioAppearanceData>;
};

export const TEMPLATES: TemplatePreset[] = [
  {
    id: 'clean-white',
    name: 'Clean White',
    description: 'Minimal and professional. Pure white with indigo accents.',
    palette: {
      primary: '#6366F1',
      text: '#0F172A',
      muted: '#64748B',
      surface: '#FFFFFF',
      background: '#F8FAFC',
      border: '#E2E8F0',
    },
    appearance: {
      fontFamily: 'inter',
      backgroundType: 'solid',
      backgroundValue: '',
      buttonStyle: 'rounded',
      borderRadius: 'md',
      cardStyle: 'solid',
      animation: 'fade-in',
      spacing: 'default',
    },
  },
  {
    id: 'dark-pro',
    name: 'Dark Pro',
    description: 'Premium dark mode with vibrant violet accents.',
    palette: {
      primary: '#A78BFA',
      text: '#F1F5F9',
      muted: '#94A3B8',
      surface: '#1E1B4B',
      background: '#0F0E1A',
      border: '#312E81',
    },
    appearance: {
      fontFamily: 'space-grotesk',
      backgroundType: 'solid',
      backgroundValue: '',
      buttonStyle: 'rounded',
      borderRadius: 'md',
      cardStyle: 'glass',
      animation: 'slide-up',
      spacing: 'default',
    },
  },
  {
    id: 'gradient-pop',
    name: 'Gradient Pop',
    description: 'Bold gradient background with high-energy pink accents.',
    palette: {
      primary: '#EC4899',
      text: '#FFFFFF',
      muted: '#FBD5E8',
      surface: 'rgba(255,255,255,0.08)',
      background: '#0F172A',
      border: 'rgba(255,255,255,0.12)',
    },
    appearance: {
      fontFamily: 'poppins',
      backgroundType: 'gradient',
      backgroundValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      buttonStyle: 'pill',
      borderRadius: 'lg',
      cardStyle: 'glass',
      animation: 'scale',
      spacing: 'relaxed',
    },
  },
  {
    id: 'warm-minimal',
    name: 'Warm Minimal',
    description: 'Warm cream tones with a soft editorial feel.',
    palette: {
      primary: '#D97706',
      text: '#292524',
      muted: '#78716C',
      surface: '#FFFBF5',
      background: '#FEF9F0',
      border: '#E7E0D6',
    },
    appearance: {
      fontFamily: 'playfair',
      backgroundType: 'solid',
      backgroundValue: '',
      buttonStyle: 'rounded',
      borderRadius: 'sm',
      cardStyle: 'bordered',
      animation: 'fade-in',
      spacing: 'relaxed',
    },
  },
  {
    id: 'bold-sales',
    name: 'Bold Sales',
    description: 'High contrast, conversion-focused. Maximum attention.',
    palette: {
      primary: '#EF4444',
      text: '#FFFFFF',
      muted: '#CBD5E1',
      surface: '#1E293B',
      background: '#0F172A',
      border: '#334155',
    },
    appearance: {
      fontFamily: 'poppins',
      backgroundType: 'solid',
      backgroundValue: '',
      buttonStyle: 'sharp',
      borderRadius: 'none',
      cardStyle: 'solid',
      animation: 'none',
      spacing: 'compact',
    },
  },
];

// Mini preview card showing the template's color swatch
function TemplateCard({
  template,
  active,
  onSelect,
}: {
  template: TemplatePreset;
  active: boolean;
  onSelect: () => void;
}) {
  const p = template.palette;
  const a = template.appearance;

  const bgStyle: React.CSSProperties =
    a.backgroundType === 'gradient'
      ? { backgroundImage: a.backgroundValue }
      : { backgroundColor: p.background };

  const btnRadius =
    a.borderRadius === 'none' ? '0px'
    : a.borderRadius === 'sm' ? '6px'
    : a.borderRadius === 'lg' ? '16px'
    : '10px';

  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
        active
          ? 'border-gray-900 dark:border-white shadow-lg shadow-gray-500/20 scale-[1.01]'
          : 'border-[var(--border)] hover:border-gray-300 dark:hover:border-gray-700'
      }`}
    >
      {/* Mini page mockup */}
      <div className="h-36 p-4 flex flex-col gap-2 relative" style={bgStyle}>
        {/* Fake heading */}
        <div className="h-3 w-3/4 rounded-sm" style={{ backgroundColor: p.text, opacity: 0.9 }} />
        <div className="h-2 w-1/2 rounded-sm" style={{ backgroundColor: p.muted, opacity: 0.6 }} />
        {/* Fake card */}
        <div
          className="mt-1 rounded p-2 flex flex-col gap-1.5"
          style={{ backgroundColor: p.surface, border: `1px solid ${p.border}` }}
        >
          <div className="h-2 w-full rounded-sm" style={{ backgroundColor: p.muted, opacity: 0.4 }} />
          <div className="h-2 w-2/3 rounded-sm" style={{ backgroundColor: p.muted, opacity: 0.4 }} />
        </div>
        {/* Fake CTA button */}
        <div
          className="mt-auto px-3 py-1.5 text-center"
          style={{ backgroundColor: p.primary, borderRadius: btnRadius, opacity: 0.95 }}
        >
          <div className="h-2 w-12 mx-auto rounded-sm bg-white/80" />
        </div>

        {/* Active check */}
        {active && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center shadow">
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Label */}
      <div className="px-3 py-2.5 bg-[var(--bg-primary)]">
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{template.name}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{template.description}</p>
      </div>
    </button>
  );
}

export default function SinglePageTemplateEditor({
  currentAppearance,
  currentPalette,
  onApply,
}: {
  currentAppearance: BioAppearanceData;
  currentPalette: Record<string, string>;
  onApply: (palette: Record<string, string>, appearance: BioAppearanceData) => void;
}) {
  // Detect which template is currently active by matching palette primary
  const activeId = TEMPLATES.find(t => t.palette.primary === currentPalette.primary)?.id ?? null;
  const [confirming, setConfirming] = useState<string | null>(null);

  const handleSelect = (template: TemplatePreset) => {
    if (confirming === template.id) {
      // Apply
      const newAppearance: BioAppearanceData = { ...currentAppearance, ...template.appearance };
      onApply(template.palette, newAppearance);
      setConfirming(null);
    } else {
      setConfirming(template.id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-[var(--bg-primary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 space-y-5 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gray-500" /> Page Templates
          </h3>
          <p className="text-[13px] text-gray-500 mt-1">
            Pick a template to instantly apply a curated color palette and style. You can fine-tune everything in Appearance.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map(t => (
            <div key={t.id} className="flex flex-col gap-1.5">
              <TemplateCard
                template={t}
                active={activeId === t.id}
                onSelect={() => handleSelect(t)}
              />
              {confirming === t.id && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleSelect(t)}
                    className="flex-1 py-1.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-bold hover:bg-gray-700 dark:hover:bg-gray-100 transition"
                  >
                    Apply template
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[var(--border)] text-[11px] text-gray-500 hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)] transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          Applying a template overwrites your current colors and style settings.
        </p>
      </div>
    </div>
  );
}
