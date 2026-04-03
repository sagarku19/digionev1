'use client';

import React from 'react';
import { Image, AlignLeft, AlignCenter, AlignRight, X, ImagePlus } from 'lucide-react';
import type { SinglePageContentData } from './singlepage-types';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{children}</label>;
}

function SectionCard({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-indigo-500" /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SinglePageLogoEditor({
  data,
  onChange,
}: {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
}) {
  return (
    <div className="space-y-6">

      {/* ── Logo Upload ── */}
      <SectionCard icon={Image} title="Logo" desc="Upload your brand logo for the header.">
        <div>
          <FieldLabel>Logo URL</FieldLabel>
          <div className="flex gap-2">
            <input type="url" value={data.logoUrl} onChange={e => onChange({ ...data, logoUrl: e.target.value })}
              className={`${INPUT} flex-1`} placeholder="https://... your logo image" />
          </div>
        </div>
        {data.logoUrl && (
          <div className="relative group rounded-xl border border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/30 flex items-center justify-center">
            <img src={data.logoUrl} alt="Logo preview" className="max-h-16 object-contain" />
            <button onClick={() => onChange({ ...data, logoUrl: '' })}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={data.showLogo}
            onChange={e => onChange({ ...data, showLogo: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Show logo in header</span>
        </label>
      </SectionCard>

      {/* ── Header Settings ── */}
      <SectionCard icon={ImagePlus} title="Header Settings" desc="Control how your page header appears.">
        <div>
          <FieldLabel>Header Style</FieldLabel>
          <div className="flex gap-2">
            {(['minimal', 'standard', 'bold'] as const).map(s => {
              const active = (data.headerStyle || 'standard') === s;
              return (
                <button key={s} onClick={() => onChange({ ...data, headerStyle: s })}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    active ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  }`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Alignment</FieldLabel>
          <div className="flex gap-1.5">
            {([
              { id: 'left' as const, icon: AlignLeft },
              { id: 'center' as const, icon: AlignCenter },
              { id: 'right' as const, icon: AlignRight },
            ]).map(a => {
              const active = (data.headerAlignment || 'center') === a.id;
              return (
                <button key={a.id} onClick={() => onChange({ ...data, headerAlignment: a.id })}
                  className={`p-2.5 rounded-xl border-2 transition-all ${
                    active ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  }`}>
                  <a.icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
