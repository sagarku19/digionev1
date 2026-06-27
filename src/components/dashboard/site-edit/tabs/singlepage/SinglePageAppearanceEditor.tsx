'use client';
// SinglePageAppearanceEditor — full theme control for single-page sites.
// font, buttons, radius, card style, palette, background, animation, spacing,
// heading style, section spacing, shadow intensity.

import React, { useState } from 'react';
import { Palette, Sparkles, Type, Zap, Space, ImagePlus } from 'lucide-react';
import ImagePickerModal from '@/components/dashboard/image-picker/ImagePickerModal';
import { INPUT, SectionCard } from './_shared';

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
  headingStyle?: 'minimal' | 'bold' | 'gradient';
  sectionSpacing?: 'compact' | 'comfortable' | 'spacious';
  shadowIntensity?: 'none' | 'light' | 'medium' | 'strong';
};

// ─── Selection helpers ───────────────────────────────────
const CHIP_ON = 'border-[var(--brand)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]';
const CHIP_OFF = 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]';
const chipBtn = (sel: boolean) =>
  `rounded-[var(--radius-md)] border-2 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${sel ? CHIP_ON : CHIP_OFF}`;
const HEX = 'w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[11px] text-[var(--text-secondary)] outline-none focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--brand)]/20';

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
        className={`relative h-5 w-10 rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${on ? 'bg-[var(--brand)]' : 'border border-[var(--border)] bg-[var(--surface-muted)]'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-5' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

// ─── Config data ─────────────────────────────────────────
const FONTS = [
  { id: 'system', label: 'System', preview: 'font-sans' },
  { id: 'inter', label: 'Inter', preview: 'font-sans' },
  { id: 'poppins', label: 'Poppins', preview: 'font-sans' },
  { id: 'space-grotesk', label: 'Space Grotesk', preview: 'font-mono' },
  { id: 'playfair', label: 'Playfair', preview: 'font-serif' },
  { id: 'dm-sans', label: 'DM Sans', preview: 'font-sans' },
];

const CARD_STYLES = [
  { id: 'solid', label: 'Solid', desc: 'Opaque background' },
  { id: 'glass', label: 'Glass', desc: 'Frosted blur' },
  { id: 'transparent', label: 'Transparent', desc: 'No background' },
  { id: 'bordered', label: 'Bordered', desc: 'Border only' },
];

const ANIMATIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade-in', label: 'Fade In' },
  { id: 'slide-up', label: 'Slide Up' },
  { id: 'scale', label: 'Scale' },
];

const BUTTON_STYLES = [
  { id: 'pill', label: 'Pill', preview: 'rounded-full' },
  { id: 'rounded', label: 'Rounded', preview: 'rounded-2xl' },
  { id: 'sharp', label: 'Sharp', preview: 'rounded-none' },
];

const BORDER_RADII = [
  { id: 'none', label: 'Sharp', preview: 'rounded-none' },
  { id: 'sm', label: 'Subtle', preview: 'rounded-md' },
  { id: 'md', label: 'Smooth', preview: 'rounded-xl' },
  { id: 'lg', label: 'Rounded', preview: 'rounded-2xl' },
];

const SPACINGS = [
  { id: 'compact', label: 'Compact', desc: 'Tight spacing' },
  { id: 'default', label: 'Default', desc: 'Balanced' },
  { id: 'relaxed', label: 'Relaxed', desc: 'Airy' },
];

const HEADING_STYLES = [
  { id: 'minimal', label: 'Minimal', desc: 'Clean and simple' },
  { id: 'bold', label: 'Bold', desc: 'Strong and prominent' },
  { id: 'gradient', label: 'Gradient', desc: 'Colorful gradient' },
];

const SECTION_SPACINGS = [
  { id: 'compact', label: 'Compact', desc: '12-16px gap' },
  { id: 'comfortable', label: 'Comfortable', desc: '20-24px gap' },
  { id: 'spacious', label: 'Spacious', desc: '32-40px gap' },
];

const SHADOW_INTENSITIES = [
  { id: 'none', label: 'None', desc: 'No shadows' },
  { id: 'light', label: 'Light', desc: 'Subtle shadows' },
  { id: 'medium', label: 'Medium', desc: 'Standard shadows' },
  { id: 'strong', label: 'Strong', desc: 'Bold shadows' },
];

const BG_TYPES = [
  { id: 'solid', label: 'Solid Color' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'image', label: 'Image' },
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
  { key: 'text', label: 'Text', desc: 'Headings & body' },
  { key: 'muted', label: 'Muted', desc: 'Secondary text' },
  { key: 'border', label: 'Border', desc: 'Avatar & card borders' },
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
  const set = (key: keyof BioAppearanceData, value: string | boolean) => onChange({ ...data, [key]: value });
  const [bgImagePicker, setBgImagePicker] = useState(false);

  return (
    <div className="space-y-5">

      {/* ─── Font Family ─── */}
      <SectionCard icon={Type} title="Font" desc="Typography for your page">
        <div className="grid grid-cols-3 gap-2">
          {FONTS.map(f => {
            const sel = (data.fontFamily || 'system') === f.id;
            return (
              <button key={f.id} onClick={() => set('fontFamily', f.id)} className={`p-2.5 text-center ${chipBtn(sel)}`}>
                <p className={`text-sm font-semibold ${f.preview} ${sel ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>Aa</p>
                <p className={`mt-0.5 text-[10px] ${sel ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)]'}`}>{f.label}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ─── Button Style ─── */}
      <SectionCard icon={Sparkles} title="Button Style" desc="Shape of action buttons">
        <div className="flex gap-2">
          {BUTTON_STYLES.map(bs => {
            const sel = (data.buttonStyle || 'rounded') === bs.id;
            return (
              <button key={bs.id} onClick={() => set('buttonStyle', bs.id)} className={`flex flex-1 flex-col items-center gap-1.5 p-2.5 ${chipBtn(sel)}`}>
                <div className={`h-9 w-16 bg-[var(--text-tertiary)] ${bs.preview}`} />
                <span className={`text-[10px] font-semibold ${sel ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)]'}`}>{bs.label}</span>
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
              <button key={br.id} onClick={() => set('borderRadius', br.id)} className={`flex flex-1 flex-col items-center gap-1.5 p-2.5 ${chipBtn(sel)}`}>
                <div className={`h-6 w-8 bg-[var(--text-tertiary)] ${br.preview}`} />
                <span className={`text-[10px] font-semibold ${sel ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)]'}`}>{br.label}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ─── Card Style ─── */}
      <SectionCard icon={Sparkles} title="Card Style" desc="How cards look">
        <div className="grid grid-cols-2 gap-2">
          {CARD_STYLES.map(cs => {
            const sel = (data.cardStyle || 'solid') === cs.id;
            return (
              <button key={cs.id} onClick={() => set('cardStyle', cs.id)} className={`p-3 text-left ${chipBtn(sel)}`}>
                <p className={`text-xs font-semibold ${sel ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{cs.label}</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{cs.desc}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ─── Colors ─── */}
      {onPaletteChange && palette && (
        <SectionCard icon={Palette} title="Colors" desc="Customize the global theme palette.">
          <div className="grid grid-cols-2 gap-4">
            {PALETTE_COLORS.map(pc => (
              <div key={pc.key} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3 transition-shadow focus-within:ring-2 focus-within:ring-[var(--brand)]/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-[var(--text-primary)]">{pc.label}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{pc.desc}</p>
                  </div>
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full shadow-inner ring-1 ring-[var(--border)]">
                    <input type="color" value={palette[pc.key] || '#E83A2E'}
                      onChange={e => onPaletteChange(pc.key, e.target.value)}
                      className="absolute -inset-4 h-16 w-16 cursor-pointer border-0 p-0" />
                  </div>
                </div>
                <input type="text" value={palette[pc.key] || ''}
                  onChange={e => onPaletteChange(pc.key, e.target.value)}
                  className={HEX} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ─── Background ─── */}
      <SectionCard icon={Palette} title="Background">
        <div className="flex gap-1.5 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1">
          {BG_TYPES.map(bt => {
            const sel = data.backgroundType === bt.id;
            return (
              <button key={bt.id} onClick={() => onChange({ ...data, backgroundType: bt.id, backgroundValue: '' })}
                className={`flex-1 rounded-[var(--radius-sm)] py-2 text-center text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${sel ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                {bt.label}
              </button>
            );
          })}
        </div>

        {data.backgroundType === 'solid' && onPaletteChange && palette && (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full shadow-inner ring-1 ring-[var(--border)]">
              <input type="color" value={palette.background || '#FFFFFF'}
                onChange={e => onPaletteChange('background', e.target.value)}
                className="absolute -inset-4 h-16 w-16 cursor-pointer border-0 p-0" />
            </div>
            <input type="text" value={palette.background || '#FFFFFF'}
              onChange={e => onPaletteChange('background', e.target.value)}
              className={`${HEX} flex-1`} />
          </div>
        )}

        {data.backgroundType === 'gradient' && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Presets</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_GRADIENTS.map((g, i) => (
                <button key={i} onClick={() => onChange({ ...data, backgroundValue: g })}
                  className={`h-10 rounded-[var(--radius-sm)] border-2 transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${data.backgroundValue === g ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/20' : 'border-transparent'}`}
                  style={{ background: g }} />
              ))}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Custom CSS gradient</label>
              <input type="text" value={data.backgroundValue}
                onChange={e => onChange({ ...data, backgroundValue: e.target.value })}
                className={INPUT} placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" />
            </div>
          </div>
        )}

        {data.backgroundType === 'image' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Background Image</label>
            <div className="flex gap-2">
              <input type="url" value={data.backgroundValue}
                onChange={e => onChange({ ...data, backgroundValue: e.target.value })}
                className={`${INPUT} flex-1`} placeholder="https://..." />
              <button type="button" onClick={() => setBgImagePicker(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 py-2 text-xs font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)]/20 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <ImagePlus className="h-3.5 w-3.5" /> Add Image
              </button>
            </div>
            {data.backgroundValue && (
              <div className="mt-2 h-20 overflow-hidden rounded-[var(--radius-md)]">
                <img src={data.backgroundValue} alt="Background preview" className="h-full w-full object-cover" />
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
              <button key={a.id} onClick={() => set('animation', a.id)} className={`py-2 text-center text-xs font-semibold ${chipBtn(sel)}`}>
                <span className={sel ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)]'}>{a.label}</span>
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
              <button key={sp.id} onClick={() => set('spacing', sp.id)} className={`p-2.5 text-center ${chipBtn(sel)}`}>
                <p className={`text-xs font-semibold ${sel ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{sp.label}</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{sp.desc}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ─── Heading Style ─── */}
      <SectionCard icon={Sparkles} title="Heading Style" desc="Section titles appearance">
        <div className="grid grid-cols-3 gap-2">
          {HEADING_STYLES.map(hs => {
            const sel = (data.headingStyle || 'minimal') === hs.id;
            return (
              <button key={hs.id} onClick={() => set('headingStyle', hs.id)} className={`p-2.5 text-center ${chipBtn(sel)}`}>
                <p className={`text-xs font-semibold ${sel ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{hs.label}</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{hs.desc}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ─── Section Spacing ─── */}
      <SectionCard icon={Space} title="Section Spacing" desc="Gap between major sections">
        <div className="grid grid-cols-3 gap-2">
          {SECTION_SPACINGS.map(ss => {
            const sel = (data.sectionSpacing || 'comfortable') === ss.id;
            return (
              <button key={ss.id} onClick={() => set('sectionSpacing', ss.id)} className={`p-2.5 text-center ${chipBtn(sel)}`}>
                <p className={`text-xs font-semibold ${sel ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{ss.label}</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{ss.desc}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ─── Shadow Intensity ─── */}
      <SectionCard icon={Sparkles} title="Shadow Intensity" desc="Card and element shadows">
        <div className="grid grid-cols-2 gap-2">
          {SHADOW_INTENSITIES.map(si => {
            const sel = (data.shadowIntensity || 'medium') === si.id;
            return (
              <button key={si.id} onClick={() => set('shadowIntensity', si.id)} className={`p-2.5 text-center ${chipBtn(sel)}`}>
                <p className={`text-xs font-semibold ${sel ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{si.label}</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{si.desc}</p>
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
        bucket="creator-public"
        kind="banner"
        onClose={() => setBgImagePicker(false)}
        onSelect={(url) => onChange({ ...data, backgroundValue: url })}
        title="Select Background Image"
      />
    </div>
  );
}
