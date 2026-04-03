'use client';

import React from 'react';
import { Palette, Type } from 'lucide-react';

const CHIP_ON = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm ring-2 ring-pink-500 scale-100 border-transparent';
const CHIP_OFF = 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-50 hover:bg-white dark:bg-gray-900/50 dark:hover:bg-gray-800 scale-[0.98] hover:scale-100 border border-gray-200 dark:border-gray-800';

function SectionCard({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-pink-500" /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

const FONTS = [
  { id: 'system', label: 'System', preview: 'font-sans' },
  { id: 'inter', label: 'Inter', preview: 'font-sans' },
  { id: 'poppins', label: 'Poppins', preview: 'font-sans' },
  { id: 'space-grotesk', label: 'Space Grotesk', preview: 'font-mono' },
  { id: 'playfair', label: 'Playfair', preview: 'font-serif' },
  { id: 'dm-sans', label: 'DM Sans', preview: 'font-sans' },
];

const PALETTE_COLORS = [
  { key: 'primary', label: 'Primary', desc: 'Buttons & accents' },
  { key: 'text', label: 'Text', desc: 'Headings & body' },
  { key: 'muted', label: 'Muted', desc: 'Secondary text' },
  { key: 'surface', label: 'Surface', desc: 'Card backgrounds' },
  { key: 'background', label: 'Background', desc: 'Page background' },
  { key: 'border', label: 'Border', desc: 'Borders & dividers' },
];

export default function SinglePageThemeEditor({
  fontFamily,
  onFontChange,
  palette,
  onPaletteChange,
}: {
  fontFamily: string;
  onFontChange: (font: string) => void;
  palette: Record<string, string>;
  onPaletteChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-5">

      {/* ─── Font Family ─── */}
      <SectionCard icon={Type} title="Font" desc="Choose the typography for your page.">
        <div className="grid grid-cols-3 gap-2">
          {FONTS.map(f => {
            const sel = (fontFamily || 'system') === f.id;
            return (
              <button key={f.id} onClick={() => onFontChange(f.id)}
                className={`p-2.5 rounded-xl border-2 text-center transition ${sel ? CHIP_ON : CHIP_OFF}`}>
                <p className={`text-sm font-semibold ${f.preview} ${sel ? 'text-pink-700 dark:text-pink-300' : 'text-gray-700 dark:text-gray-300'}`}>Aa</p>
                <p className={`text-[10px] mt-0.5 ${sel ? 'text-pink-600 dark:text-pink-400' : 'text-gray-400'}`}>{f.label}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ─── Colors ─── */}
      <SectionCard icon={Palette} title="Colors" desc="Full palette for your page.">
        <div className="grid grid-cols-2 gap-4">
          {PALETTE_COLORS.map(pc => (
            <div key={pc.key} className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-[1.25rem] border border-gray-100 dark:border-gray-800 focus-within:ring-2 focus-within:ring-pink-500/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-gray-900 dark:text-white">{pc.label}</p>
                  <p className="text-[10px] text-gray-400">{pc.desc}</p>
                </div>
                <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-inner ring-1 ring-black/5 dark:ring-white/10 shrink-0">
                  <input type="color" value={palette[pc.key] || '#EC4899'}
                    onChange={e => onPaletteChange(pc.key, e.target.value)}
                    className="absolute -inset-4 w-16 h-16 cursor-pointer border-0 p-0" />
                </div>
              </div>
              <input type="text" value={palette[pc.key] || ''}
                onChange={e => onPaletteChange(pc.key, e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] font-mono text-gray-600 dark:text-gray-400 outline-none focus:border-pink-500" />
            </div>
          ))}
        </div>
      </SectionCard>

    </div>
  );
}
