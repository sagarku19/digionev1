'use client';
// BioAppearanceEditor — layout, button, and background style editor for Link in Bio.
// Controlled component.

import React from 'react';
import { Palette, LayoutGrid, RectangleHorizontal, SquareStack, Sparkles } from 'lucide-react';

const INPUT = 'w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm';

export type BioAppearanceData = {
  layoutStyle: string;
  buttonStyle: string;
  backgroundType: string;
  backgroundValue: string;
  showWatermark: boolean;
  showShareButton: boolean;
};

const LAYOUTS = [
  { id: 'classic', label: 'Classic',  desc: 'Stacked list',    icon: RectangleHorizontal },
  { id: 'grid',    label: 'Grid',     desc: '2-column cards',  icon: LayoutGrid },
  { id: 'bento',   label: 'Bento',    desc: 'Mixed sizes',     icon: SquareStack },
];

const BUTTON_STYLES = [
  { id: 'rounded', label: 'Rounded',  preview: 'rounded-xl' },
  { id: 'pill',    label: 'Pill',     preview: 'rounded-full' },
  { id: 'sharp',   label: 'Sharp',    preview: 'rounded-none' },
  { id: 'outline', label: 'Outline',  preview: 'rounded-xl border-2' },
  { id: 'shadow',  label: 'Shadow',   preview: 'rounded-xl shadow-lg' },
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
];

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
  return (
    <div className="space-y-5">
      {/* Layout Style */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-pink-500" /> Layout
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">How your links are arranged</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {LAYOUTS.map(l => {
            const selected = data.layoutStyle === l.id;
            return (
              <button
                key={l.id}
                onClick={() => onChange({ ...data, layoutStyle: l.id })}
                className={`p-3 rounded-xl border-2 text-center transition ${
                  selected
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <l.icon className={`w-5 h-5 mx-auto mb-1.5 ${selected ? 'text-pink-500' : 'text-gray-400'}`} />
                <p className={`text-xs font-semibold ${selected ? 'text-pink-700 dark:text-pink-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  {l.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{l.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Button Style */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-500" /> Button Style
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Shape of your link buttons</p>
        </div>

        <div className="space-y-2">
          {BUTTON_STYLES.map(bs => {
            const selected = data.buttonStyle === bs.id;
            return (
              <button
                key={bs.id}
                onClick={() => onChange({ ...data, buttonStyle: bs.id })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${
                  selected
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* Preview chip */}
                <div className={`w-16 h-8 border-2 border-gray-300 dark:border-gray-600 ${bs.preview} shrink-0`} />
                <span className={`text-xs font-semibold ${selected ? 'text-pink-700 dark:text-pink-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  {bs.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Button Color */}
      {onPaletteChange && palette && (
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-pink-500" /> Button Color
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Color used for button accents, hover effects, and icons</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={palette.primary || '#EC4899'}
              onChange={e => onPaletteChange('primary', e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5"
            />
            <div className="flex-1">
              <input
                type="text"
                value={palette.primary || '#EC4899'}
                onChange={e => onPaletteChange('primary', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
          {/* Quick color swatches */}
          <div className="flex gap-2">
            {['#EC4899', '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'].map(color => (
              <button
                key={color}
                onClick={() => onPaletteChange('primary', color)}
                className={`w-7 h-7 rounded-full border-2 transition ${
                  palette.primary === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Background */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-pink-500" /> Background
          </h3>
        </div>

        <div className="flex gap-2">
          {BG_TYPES.map(bt => {
            const selected = data.backgroundType === bt.id;
            return (
              <button
                key={bt.id}
                onClick={() => onChange({ ...data, backgroundType: bt.id, backgroundValue: '' })}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold text-center transition ${
                  selected
                    ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-500/40'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border border-transparent'
                }`}
              >
                {bt.label}
              </button>
            );
          })}
        </div>

        {data.backgroundType === 'gradient' && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500">Presets</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_GRADIENTS.map((g, i) => (
                <button
                  key={i}
                  onClick={() => onChange({ ...data, backgroundValue: g })}
                  className={`h-10 rounded-lg border-2 transition ${
                    data.backgroundValue === g ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-transparent'
                  }`}
                  style={{ background: g }}
                />
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Custom CSS gradient</label>
              <input
                type="text"
                value={data.backgroundValue}
                onChange={e => onChange({ ...data, backgroundValue: e.target.value })}
                className={INPUT}
                placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              />
            </div>
          </div>
        )}

        {data.backgroundType === 'image' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Background Image URL</label>
            <input
              type="url"
              value={data.backgroundValue}
              onChange={e => onChange({ ...data, backgroundValue: e.target.value })}
              className={INPUT}
              placeholder="https://..."
            />
            {data.backgroundValue && (
              <div className="mt-2 h-20 rounded-lg overflow-hidden">
                <img src={data.backgroundValue} alt="Background preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Options</h3>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-700 dark:text-gray-300">Show share button</span>
          <button
            onClick={() => onChange({ ...data, showShareButton: !data.showShareButton })}
            className={`relative w-10 h-5 rounded-full transition ${data.showShareButton ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${data.showShareButton ? 'left-5' : 'left-0.5'}`} />
          </button>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-700 dark:text-gray-300">Show &ldquo;Made with DigiOne&rdquo;</span>
          <button
            onClick={() => onChange({ ...data, showWatermark: !data.showWatermark })}
            className={`relative w-10 h-5 rounded-full transition ${data.showWatermark ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${data.showWatermark ? 'left-5' : 'left-0.5'}`} />
          </button>
        </label>
      </div>
    </div>
  );
}
