'use client';

import React from 'react';
import { ImageIcon, Target, BarChart2, Plus, X, Youtube } from 'lucide-react';
import type { SinglePageContentData } from './singlepage-types';

export type { SinglePageContentData };

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{children}</label>;
}

function SectionCard({ icon: Icon, title, desc, color = 'indigo', children }: { icon: React.ElementType; title: string; desc?: string; color?: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
  };
  return (
    <div className="bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colors[color] ?? 'text-indigo-500'}`} /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

interface Props {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
}

export default function SinglePageHeroEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-6">

      {/* ── Page Headline ── */}
      <SectionCard icon={Target} title="Page Headline" desc="The primary attention-grabbing text at the top of your page." color="indigo">
        <div>
          <FieldLabel>Primary Heading</FieldLabel>
          <input
            type="text"
            value={data.title}
            onChange={e => onChange({ ...data, title: e.target.value })}
            className={INPUT}
            placeholder="e.g. The Ultimate Design Course — Get Results Fast"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel>Subheadline / Description</FieldLabel>
            <span className={`text-[11px] tabular-nums ${data.description.length > 250 ? 'text-red-500' : 'text-gray-400'}`}>
              {data.description.length}/250
            </span>
          </div>
          <textarea
            rows={3}
            value={data.description}
            onChange={e => onChange({ ...data, description: e.target.value })}
            className={`${INPUT} resize-none`}
            placeholder="A short, punchy pitch that tells visitors why they need this."
          />
        </div>
      </SectionCard>

      {/* ── Hero Image ── */}
      <SectionCard icon={ImageIcon} title="Hero Image" desc="The main visual shown at the very top of the page." color="indigo">
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
          <div className="relative rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm group">
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
      </SectionCard>

      {/* ── Sales Video ── */}
      <SectionCard icon={Youtube} title="Sales Video" desc="Embed a YouTube or Vimeo video to pitch your product." color="rose">
        <div>
          <FieldLabel>Video URL</FieldLabel>
          <input
            type="url"
            value={data.videoUrl}
            onChange={e => onChange({ ...data, videoUrl: e.target.value })}
            className={INPUT}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
        {data.videoUrl && (
          <div className="relative pt-[56.25%] rounded-2xl overflow-hidden bg-black border border-gray-200 dark:border-gray-800">
            <iframe
              src={getEmbedUrl(data.videoUrl)}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        <p className="text-[11px] text-gray-400">Supports YouTube and Vimeo links.</p>
      </SectionCard>

      {/* ── Stats Strip ── */}
      <SectionCard icon={BarChart2} title="Statistics Bar" desc="Impressive numbers shown below the hero (e.g. '10k+ Students'). Max 4." color="indigo">
        <div className="space-y-3">
          {data.stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-3 group">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Number / Value</FieldLabel>
                  <input
                    type="text"
                    value={stat.value}
                    onChange={e => onChange({ ...data, stats: data.stats.map((s, idx) => idx === i ? { ...s, value: e.target.value } : s) })}
                    className={INPUT}
                    placeholder="10,000+"
                  />
                </div>
                <div>
                  <FieldLabel>Label</FieldLabel>
                  <input
                    type="text"
                    value={stat.label}
                    onChange={e => onChange({ ...data, stats: data.stats.map((s, idx) => idx === i ? { ...s, label: e.target.value } : s) })}
                    className={INPUT}
                    placeholder="Students Enrolled"
                  />
                </div>
              </div>
              <button
                onClick={() => onChange({ ...data, stats: data.stats.filter((_, idx) => idx !== i) })}
                className="p-2 mt-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {data.stats.length < 4 && (
          <button
            onClick={() => onChange({ ...data, stats: [...data.stats, { label: '', value: '' }] })}
            className="flex items-center justify-center w-full gap-2 py-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-[13px] font-semibold text-gray-500 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Stat
          </button>
        )}
      </SectionCard>
    </div>
  );
}

function getEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const id = u.searchParams.get('v') || u.pathname.split('/').pop() || '';
      return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').pop() || '';
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch { }
  return url;
}
