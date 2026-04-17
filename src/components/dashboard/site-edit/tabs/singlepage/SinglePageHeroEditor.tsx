'use client';

import React from 'react';
import { ImageIcon } from 'lucide-react';
import type { SinglePageContentData } from './singlepage-types';

export type { SinglePageContentData };

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl text-[13px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-[var(--text-primary)] placeholder-gray-400 transition-all duration-300';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">{children}</label>;
}

interface Props {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
}

export default function SinglePageHeroEditor({ data, onChange }: Props) {
  return (
    <div className="bg-[var(--bg-primary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-500" /> Hero Image
        </h3>
        <p className="text-[13px] text-gray-500 mt-1">The main visual shown at the top of your page.</p>
      </div>

      <div>
        <FieldLabel>Image URL</FieldLabel>
        <input
          type="url"
          value={data.heroImage}
          onChange={e => onChange({ ...data, heroImage: e.target.value })}
          className={INPUT}
          placeholder="https://..."
        />
      </div>

      {data.heroImage && (
        <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] shadow-sm group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.heroImage} alt="Hero preview" className="w-full h-44 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={() => onChange({ ...data, heroImage: '' })}
              className="px-4 py-2 bg-red-500 text-white rounded-full text-xs font-semibold hover:scale-105 transition-transform shadow-md"
            >
              Remove Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
