'use client';
// ThemeEditor — controlled color palette editor.
// Parent manages state; changes propagate immediately for live preview.

import React from 'react';
import { Palette } from 'lucide-react';
import { THEME_FIELDS } from '../section-defs';

export default function ThemeEditor({
  palette,
  onChange,
}: {
  palette: Record<string, string>;
  onChange: (palette: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl flex items-start gap-3">
        <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          Colors update in the preview instantly. Click <strong>Save</strong> to persist changes.
        </p>
      </div>

      {THEME_FIELDS.map(f => {
        const val = palette[f.key] ?? f.default;
        return (
          <div key={f.key} className="flex items-center gap-4 p-4 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl">
            <input
              type="color"
              value={val}
              onChange={e => onChange({ ...palette, [f.key]: e.target.value })}
              className="w-12 h-12 rounded-xl cursor-pointer border border-gray-200 dark:border-gray-700 p-0.5 bg-white dark:bg-gray-900 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{f.label}</p>
              <input
                type="text"
                value={val}
                onChange={e => onChange({ ...palette, [f.key]: e.target.value })}
                className="text-xs text-gray-400 bg-transparent border-none outline-none w-full mt-0.5 font-mono"
              />
            </div>
            <div className="w-8 h-8 rounded-lg shrink-0 border border-gray-200 dark:border-gray-700 shadow-inner" style={{ backgroundColor: val }} />
          </div>
        );
      })}
    </div>
  );
}
