'use client';

import React from 'react';
import { ImageIcon } from 'lucide-react';
import type { SinglePageContentData } from './singlepage-types';
import { INPUT, FieldLabel } from './_shared';

export type { SinglePageContentData };

interface Props {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
}

export default function SinglePageHeroEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-5 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[var(--brand)]" /> Hero Image
        </h3>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">The main visual shown at the top of your page.</p>
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
              className="px-4 py-2 bg-[var(--danger)] text-[var(--text-on-brand)] rounded-full text-xs font-semibold hover:scale-105 transition-transform shadow-md"
            >
              Remove Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
