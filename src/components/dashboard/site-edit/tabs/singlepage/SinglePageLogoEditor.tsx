'use client';

import React from 'react';
import { Image, AlignLeft, AlignCenter, AlignRight, X, LayoutTemplate, Type, Circle, Square, Minus, Maximize2, SeparatorHorizontal } from 'lucide-react';
import type { SinglePageContentData } from './singlepage-types';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl text-[13px] focus:border-gray-500 focus:ring-4 focus:ring-gray-400/20 outline-none text-[var(--text-primary)] placeholder-gray-400 transition-all duration-300';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">{children}</label>;
}

function SectionCard({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-primary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

const PLACEMENT_OPTIONS = [
  { id: 'top-bar' as const, label: 'Top Bar', desc: 'Fixed header at the very top' },
  { id: 'above-hero' as const, label: 'Above Hero', desc: 'Just above the hero image' },
  { id: 'inline-hero' as const, label: 'Inline Hero', desc: 'Overlaid on the hero image' },
  { id: 'floating' as const, label: 'Floating', desc: 'Floating top-left corner' },
];

const LOGO_SHAPES = [
  { id: 'free' as const, label: 'Free', desc: 'Original shape', icon: Maximize2 },
  { id: 'circle' as const, label: 'Circle', desc: 'Round clipping', icon: Circle },
  { id: 'square' as const, label: 'Square', desc: 'Square clipping', icon: Square },
];

const GAP_OPTIONS = [
  { id: 'none' as const, label: 'None', px: '0' },
  { id: 'sm' as const, label: 'Small', px: '8px' },
  { id: 'md' as const, label: 'Medium', px: '16px' },
  { id: 'lg' as const, label: 'Large', px: '24px' },
];

const HEADER_WIDTHS = [
  { id: 'sm' as const, label: 'Narrow', desc: '640px' },
  { id: 'md' as const, label: 'Medium', desc: '768px' },
  { id: 'lg' as const, label: 'Wide', desc: '1024px' },
  { id: 'full' as const, label: 'Full', desc: '100%' },
];

export default function SinglePageLogoEditor({
  data,
  onChange,
}: {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
}) {
  const placement = data.logoPlacement || 'top-bar';
  const alignment = data.headerAlignment || 'center';
  const logoShape = data.logoShape || 'free';
  const gap = data.logoHeaderGap || 'md';
  const headerWidth = data.headerWidth || 'full';

  // Shape class for preview
  const shapeClass = logoShape === 'circle' ? 'rounded-full' : logoShape === 'square' ? 'rounded-lg' : '';
  const shapeObjFit = logoShape === 'free' ? 'object-contain' : 'object-cover';

  return (
    <div className="space-y-6">

      {/* ── Logo Upload ── */}
      <SectionCard icon={Image} title="Logo" desc="Upload your brand logo. It will appear in the header area.">
        <div>
          <FieldLabel>Logo URL</FieldLabel>
          <input
            type="url"
            value={data.logoUrl || ''}
            onChange={e => onChange({ ...data, logoUrl: e.target.value })}
            className={INPUT}
            placeholder="https://... paste your logo image URL"
          />
        </div>

        {data.logoUrl && (
          <div className="relative group rounded-xl border border-[var(--border)] p-4 bg-gray-50 dark:bg-[var(--bg-secondary)]/30 flex items-center justify-center min-h-[80px]">
            <img
              src={data.logoUrl}
              alt="Logo preview"
              className={`max-h-16 ${logoShape === 'free' ? 'max-w-[200px]' : 'w-16 h-16'} ${shapeObjFit} ${shapeClass}`}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <button
              onClick={() => onChange({ ...data, logoUrl: '' })}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.showLogo !== false}
            onChange={e => onChange({ ...data, showLogo: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-gray-700 focus:ring-gray-400"
          />
          <span className="text-xs text-gray-600 dark:text-[var(--text-secondary)]">Show logo on page</span>
        </label>
      </SectionCard>

      {/* ── Logo Shape ── */}
      <SectionCard icon={Circle} title="Logo Shape" desc="Clip the logo to a specific shape.">
        <div className="flex gap-2">
          {LOGO_SHAPES.map(s => {
            const active = logoShape === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onChange({ ...data, logoShape: s.id })}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                    : 'border-gray-200 dark:border-[var(--border)] text-gray-500 hover:border-gray-300'
                }`}
              >
                <s.icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold">{s.label}</span>
                <span className="text-[9px] opacity-60">{s.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Shape mini-preview */}
        {data.logoUrl && (
          <div className="flex items-center justify-center pt-2">
            <div className="flex gap-4">
              {LOGO_SHAPES.map(s => {
                const cls = s.id === 'circle' ? 'rounded-full' : s.id === 'square' ? 'rounded-lg' : '';
                const fit = s.id === 'free' ? 'object-contain' : 'object-cover';
                const size = s.id === 'free' ? 'h-10 w-auto max-w-[80px]' : 'w-10 h-10';
                return (
                  <div key={s.id} className={`flex flex-col items-center gap-1 ${logoShape === s.id ? 'opacity-100' : 'opacity-40'}`}>
                    <img src={data.logoUrl} alt="" className={`${size} ${fit} ${cls} border border-gray-200 dark:border-[var(--border)]`} />
                    <span className="text-[9px] text-gray-400">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Header Text ── */}
      <SectionCard icon={Type} title="Header Text" desc="Optional text shown next to or below your logo.">
        <div>
          <FieldLabel>Brand / Site Name <span className="text-gray-400 font-normal">(optional)</span></FieldLabel>
          <input
            type="text"
            value={data.headerText || ''}
            onChange={e => onChange({ ...data, headerText: e.target.value })}
            className={INPUT}
            placeholder="e.g. My Brand, John Doe Coaching..."
          />
        </div>
      </SectionCard>

      {/* ── Space Between Logo & Header ── */}
      <SectionCard icon={Minus} title="Logo–Header Gap" desc="Space between the logo and header text.">
        <div className="flex gap-2">
          {GAP_OPTIONS.map(g => {
            const active = gap === g.id;
            return (
              <button
                key={g.id}
                onClick={() => onChange({ ...data, logoHeaderGap: g.id })}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                    : 'border-gray-200 dark:border-[var(--border)] text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className="text-[11px] font-semibold">{g.label}</span>
                <span className="text-[9px] opacity-60">{g.px}</span>
              </button>
            );
          })}
        </div>

        {/* Visual preview of gap */}
        <div className="flex items-center justify-center gap-0 pt-1">
          <div className="w-8 h-8 rounded bg-gray-100 dark:bg-[var(--bg-secondary)] flex items-center justify-center">
            <Image className="w-4 h-4 text-gray-500" />
          </div>
          <div
            className="bg-gray-200 dark:bg-gray-700 h-1 rounded-full transition-all"
            style={{ width: gap === 'none' ? '0px' : gap === 'sm' ? '16px' : gap === 'lg' ? '48px' : '32px' }}
          />
          <div className="w-14 h-4 rounded bg-gray-100 dark:bg-[var(--bg-secondary)]" />
        </div>
      </SectionCard>

      {/* ── Alignment ── */}
      <SectionCard icon={AlignCenter} title="Alignment" desc="Align the logo and header text.">
        <div className="flex gap-2">
          {([
            { id: 'left' as const, icon: AlignLeft, label: 'Left' },
            { id: 'center' as const, icon: AlignCenter, label: 'Center' },
            { id: 'right' as const, icon: AlignRight, label: 'Right' },
          ]).map(a => {
            const active = alignment === a.id;
            return (
              <button
                key={a.id}
                onClick={() => onChange({ ...data, headerAlignment: a.id })}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                    : 'border-gray-200 dark:border-[var(--border)] text-gray-500 hover:border-gray-300'
                }`}
              >
                <a.icon className="w-4 h-4" />
                <span className="text-[11px] font-semibold">{a.label}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Logo Placement ── */}
      <SectionCard icon={LayoutTemplate} title="Logo Placement" desc="Choose where the logo appears on your page.">
        <div className="grid grid-cols-2 gap-2.5">
          {PLACEMENT_OPTIONS.map(opt => {
            const active = placement === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onChange({ ...data, logoPlacement: opt.id })}
                className={`text-left p-3.5 rounded-2xl border-2 transition-all duration-200 ${
                  active
                    ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-[var(--bg-secondary)]'
                    : 'border-gray-200 dark:border-[var(--border)] hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <p className={`text-[13px] font-semibold ${active ? 'text-[var(--text-primary)]' : 'text-gray-800 dark:text-[var(--text-primary)]'}`}>
                  {opt.label}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Header Divider ── */}
      <SectionCard icon={SeparatorHorizontal} title="Header Divider" desc="Add a horizontal line below the header area.">
        <label className="flex items-center justify-between cursor-pointer px-4 py-3 bg-gray-50/80 dark:bg-[var(--bg-secondary)]/30 rounded-[1.25rem] border border-[var(--border)]">
          <div>
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">Show divider line</p>
            <p className="text-[11px] text-gray-500 mt-0.5">A thin horizontal line below the header</p>
          </div>
          <button
            role="switch"
            aria-checked={data.headerDivider ?? false}
            onClick={() => onChange({ ...data, headerDivider: !(data.headerDivider ?? false) })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              data.headerDivider ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              data.headerDivider ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </label>

        {/* Divider preview */}
        {data.headerDivider && (
          <div className="pt-1">
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 mb-2">Preview</div>
            <div className="px-4">
              <div className="flex items-center justify-center gap-2 pb-2 text-gray-500">
                <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="w-16 h-2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <hr className="border-gray-300 dark:border-gray-600" />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Header Width ── */}
      <SectionCard icon={Maximize2} title="Header Width" desc="Control the maximum width of the header area.">
        <div className="grid grid-cols-4 gap-2">
          {HEADER_WIDTHS.map(w => {
            const active = headerWidth === w.id;
            return (
              <button
                key={w.id}
                onClick={() => onChange({ ...data, headerWidth: w.id })}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                    : 'border-gray-200 dark:border-[var(--border)] text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className="text-[11px] font-semibold">{w.label}</span>
                <span className="text-[9px] opacity-60">{w.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Width visual indicator */}
        <div className="pt-1 px-2">
          <div className="relative h-3 bg-gray-100 dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gray-500/50 rounded-full transition-all duration-300"
              style={{ width: headerWidth === 'sm' ? '40%' : headerWidth === 'md' ? '60%' : headerWidth === 'lg' ? '80%' : '100%' }}
            />
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
