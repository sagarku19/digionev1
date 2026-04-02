'use client';
// BioAppearanceEditor V2 — full theme control for Link in Bio.
// New: font family, card style, animation, border radius, spacing.
// Enhanced: full 5-color palette editor, more gradient presets.

import React, { useState } from 'react';
import {
  Palette, Sparkles,
  Type, Zap, Space, ImagePlus,
} from 'lucide-react';
import ImagePickerModal from '@/components/dashboard/ImagePickerModal';

const INPUT = 'w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm';

export type BioAppearanceData = {
  layoutStyle: string;
  buttonStyle: string;
  backgroundType: string;
  backgroundValue: string;
  showWatermark: boolean;
  showShareButton: boolean;
  fontFamily: string;
  cardStyle: string;
  animation: string;
  borderRadius: string;
  spacing: string;
};

// ─── Selection helpers ───────────────────────────────────
const CHIP_ON = 'border-pink-500 bg-pink-50 dark:bg-pink-500/10';
const CHIP_OFF = 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600';

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button onClick={onToggle}
        className={`relative w-10 h-5 rounded-full transition ${on ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-5' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

function SectionCard({ icon: Icon, title, desc, children }: {
  icon: React.ElementType; title: string; desc?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-pink-500" /> {title}
        </h3>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Config data ─────────────────────────────────────────
const FONTS = [
  { id: 'system',        label: 'System',         preview: 'font-sans' },
  { id: 'inter',         label: 'Inter',          preview: 'font-sans' },
  { id: 'poppins',       label: 'Poppins',        preview: 'font-sans' },
  { id: 'space-grotesk', label: 'Space Grotesk',  preview: 'font-mono' },
  { id: 'playfair',      label: 'Playfair',       preview: 'font-serif' },
  { id: 'dm-sans',       label: 'DM Sans',        preview: 'font-sans' },
];

const CARD_STYLES = [
  { id: 'solid',       label: 'Solid',       desc: 'Opaque background' },
  { id: 'glass',       label: 'Glass',       desc: 'Frosted blur' },
  { id: 'transparent', label: 'Transparent', desc: 'No background' },
  { id: 'bordered',    label: 'Bordered',    desc: 'Border only' },
];

const ANIMATIONS = [
  { id: 'none',     label: 'None' },
  { id: 'fade-in',  label: 'Fade In' },
  { id: 'slide-up', label: 'Slide Up' },
  { id: 'scale',    label: 'Scale' },
];

const BORDER_RADII = [
  { id: 'none', label: 'Sharp',    preview: 'rounded-none' },
  { id: 'sm',   label: 'Subtle',   preview: 'rounded-md' },
  { id: 'md',   label: 'Smooth',   preview: 'rounded-xl' },
  { id: 'lg',   label: 'Rounded',  preview: 'rounded-2xl' },
];

const SPACINGS = [
  { id: 'compact',  label: 'Compact',  desc: 'Tight spacing' },
  { id: 'default',  label: 'Default',  desc: 'Balanced' },
  { id: 'relaxed',  label: 'Relaxed',  desc: 'Airy' },
];

const BG_TYPES = [
  { id: 'solid',    label: 'Solid Color' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'image',    label: 'Image' },
];

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
];

const PALETTE_COLORS = [
  { key: 'primary', label: 'Primary', desc: 'Buttons & accents' },
  { key: 'text',    label: 'Text',    desc: 'Headings & body' },
  { key: 'muted',   label: 'Muted',   desc: 'Secondary text' },
  { key: 'border',  label: 'Border',  desc: 'Avatar & card borders' },
];

// ─── Main ────────────────────────────────────────────────
export default function BioAppearanceEditor({
  data,
  onChange,
  palette,
  onPaletteChange,
}: {
  data: BioAppearanceData;
  onChange: (data: BioAppearanceData) => void;
  palette?: Record<string, string>;
  onPaletteChange?: (key: string, value: string) => void;
}) {
  const set = (key: keyof BioAppearanceData, value: any) => onChange({ ...data, [key]: value });
  const [bgImagePicker, setBgImagePicker] = useState(false);

  return (
    <div className="space-y-5">

      {/* ─── Font Family ─── */}
      <SectionCard icon={Type} title="Font" desc="Typography for your page">
        <div className="grid grid-cols-3 gap-2">
          {FONTS.map(f => {
            const sel = (data.fontFamily || 'system') === f.id;
            return (
              <button key={f.id} onClick={() => set('fontFamily', f.id)}
                className={`p-2.5 rounded-xl border-2 text-center transition ${sel ? CHIP_ON : CHIP_OFF}`}>
                <p className={`text-sm font-semibold ${f.preview} ${sel ? 'text-pink-700 dark:text-pink-300' : 'text-gray-700 dark:text-gray-300'}`}>Aa</p>
                <p className={`text-[10px] mt-0.5 ${sel ? 'text-pink-600 dark:text-pink-400' : 'text-gray-400'}`}>{f.label}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>
      
      {/* ─── Border Radius ─── */}
      <SectionCard icon={Sparkles} title="Border Radius" desc="Corner rounding for cards">
        <div className="flex gap-2">
          {BORDER_RADII.map(br => {
            const sel = (data.borderRadius || 'md') === br.id;
            return (
              <button key={br.id} onClick={() => set('borderRadius', br.id)}
                className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition ${sel ? CHIP_ON : CHIP_OFF}`}>
                <div className={`w-8 h-6 bg-gray-300 dark:bg-gray-600 ${br.preview}`} />
                <span className={`text-[10px] font-semibold ${sel ? 'text-pink-700 dark:text-pink-300' : 'text-gray-500'}`}>{br.label}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>
      {/* ─── Card Style ─── */}
      <SectionCard icon={Sparkles} title="Card Style" desc="How link cards look">
        <div className="grid grid-cols-2 gap-2">
          {CARD_STYLES.map(cs => {
            const sel = (data.cardStyle || 'solid') === cs.id;
            return (
              <button key={cs.id} onClick={() => set('cardStyle', cs.id)}
                className={`p-3 rounded-xl border-2 text-left transition ${sel ? CHIP_ON : CHIP_OFF}`}>
                <p className={`text-xs font-semibold ${sel ? 'text-pink-700 dark:text-pink-300' : 'text-gray-600 dark:text-gray-400'}`}>{cs.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{cs.desc}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ─── Colors ─── */}
      {onPaletteChange && palette && (
        <SectionCard icon={Palette} title="Colors" desc="Full palette for your page">
          <div className="space-y-3">
            {PALETTE_COLORS.map(pc => (
              <div key={pc.key} className="flex items-center gap-3">
                <input type="color" value={palette[pc.key] || '#EC4899'}
                  onChange={e => onPaletteChange(pc.key, e.target.value)}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{pc.label}</p>
                  <p className="text-[10px] text-gray-400">{pc.desc}</p>
                </div>
                <input type="text" value={palette[pc.key] || ''}
                  onChange={e => onPaletteChange(pc.key, e.target.value)}
                  className="w-24 px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] font-mono text-gray-600 dark:text-gray-400 outline-none focus:ring-2 focus:ring-pink-500" />
              </div>
            ))}
          </div>

        </SectionCard>
      )}

      {/* ─── Background ─── */}
      <SectionCard icon={Palette} title="Background">
        <div className="flex gap-2">
          {BG_TYPES.map(bt => {
            const sel = data.backgroundType === bt.id;
            return (
              <button key={bt.id} onClick={() => onChange({ ...data, backgroundType: bt.id, backgroundValue: '' })}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold text-center transition ${
                  sel ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-500/40'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border border-transparent'
                }`}>{bt.label}</button>
            );
          })}
        </div>

        {data.backgroundType === 'solid' && onPaletteChange && palette && (
          <div className="flex items-center gap-3">
            <input type="color" value={palette.background || '#FFFFFF'}
              onChange={e => onPaletteChange('background', e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5" />
            <input type="text" value={palette.background || '#FFFFFF'}
              onChange={e => onPaletteChange('background', e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-pink-500" />
          </div>
        )}

        {data.backgroundType === 'gradient' && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500">Presets</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_GRADIENTS.map((g, i) => (
                <button key={i} onClick={() => onChange({ ...data, backgroundValue: g })}
                  className={`h-10 rounded-lg border-2 transition ${
                    data.backgroundValue === g ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-transparent'
                  }`} style={{ background: g }} />
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Custom CSS gradient</label>
              <input type="text" value={data.backgroundValue}
                onChange={e => onChange({ ...data, backgroundValue: e.target.value })}
                className={INPUT} placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" />
            </div>
          </div>
        )}

        {data.backgroundType === 'image' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Background Image</label>
            <div className="flex gap-2">
              <input type="url" value={data.backgroundValue}
                onChange={e => onChange({ ...data, backgroundValue: e.target.value })}
                className={`${INPUT} flex-1`} placeholder="https://..." />
              <button type="button" onClick={() => setBgImagePicker(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30 rounded-lg text-xs font-semibold transition">
                <ImagePlus className="w-3.5 h-3.5" /> Add Image
              </button>
            </div>
            {data.backgroundValue && (
              <div className="mt-2 h-20 rounded-lg overflow-hidden">
                <img src={data.backgroundValue} alt="Background preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* ─── Animation ─── */}
      <SectionCard icon={Zap} title="Animation" desc="Entry animation for blocks">
        <div className="grid grid-cols-4 gap-2">
          {ANIMATIONS.map(a => {
            const sel = (data.animation || 'none') === a.id;
            return (
              <button key={a.id} onClick={() => set('animation', a.id)}
                className={`py-2 rounded-lg border-2 text-xs font-semibold text-center transition ${sel ? CHIP_ON : CHIP_OFF}`}>
                <span className={sel ? 'text-pink-700 dark:text-pink-300' : 'text-gray-600 dark:text-gray-400'}>{a.label}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ─── Spacing ─── */}
      <SectionCard icon={Space} title="Spacing" desc="Gap between blocks">
        <div className="grid grid-cols-3 gap-2">
          {SPACINGS.map(sp => {
            const sel = (data.spacing || 'default') === sp.id;
            return (
              <button key={sp.id} onClick={() => set('spacing', sp.id)}
                className={`p-2.5 rounded-xl border-2 text-center transition ${sel ? CHIP_ON : CHIP_OFF}`}>
                <p className={`text-xs font-semibold ${sel ? 'text-pink-700 dark:text-pink-300' : 'text-gray-600 dark:text-gray-400'}`}>{sp.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{sp.desc}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ─── Options ─── */}
      <SectionCard icon={Sparkles} title="Options">
        <Toggle on={data.showShareButton} onToggle={() => set('showShareButton', !data.showShareButton)} label="Show share button" />
        <Toggle on={data.showWatermark} onToggle={() => set('showWatermark', !data.showWatermark)} label='Show "Made with DigiOne"' />
      </SectionCard>

      {/* Image Picker Modal for Background */}
      <ImagePickerModal
        open={bgImagePicker}
        onClose={() => setBgImagePicker(false)}
        onSelect={(url) => onChange({ ...data, backgroundValue: url })}
        title="Select Background Image"
      />
    </div>
  );
}
