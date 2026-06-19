'use client';

import React from 'react';
import { Share2, Plus, X, Globe, Instagram, Twitter, Youtube, Linkedin, Github, Music, MessageCircle, Send, Phone, AtSign } from 'lucide-react';
import type { SinglePageContentData } from './singlepage-types';
import { INPUT, SectionCard } from './_shared';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/you' },
  { id: 'twitter', label: 'Twitter/X', icon: Twitter, placeholder: 'https://x.com/you' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@you' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/you' },
  { id: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/you' },
  { id: 'tiktok', label: 'TikTok', icon: Music, placeholder: 'https://tiktok.com/@you' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, placeholder: 'https://wa.me/919876543210' },
  { id: 'telegram', label: 'Telegram', icon: Send, placeholder: 'https://t.me/yourchannel' },
  { id: 'threads', label: 'Threads', icon: AtSign, placeholder: 'https://threads.net/@you' },
  { id: 'website', label: 'Website', icon: Globe, placeholder: 'https://your-site.com' },
];


export default function SinglePageSocialEditor({
  data,
  onChange,
}: {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
}) {
  const links = data.socialLinks || [];

  const updateLinks = (updated: { platform: string; url: string }[]) => {
    onChange({ ...data, socialLinks: updated });
  };

  const addLink = (platform: string) => {
    updateLinks([...links, { platform, url: '' }]);
  };

  const updateLink = (idx: number, url: string) => {
    updateLinks(links.map((l, i) => i === idx ? { ...l, url } : l));
  };

  const removeLink = (idx: number) => {
    updateLinks(links.filter((_, i) => i !== idx));
  };

  const usedPlatforms = new Set(links.map(l => l.platform));

  return (
    <div className="space-y-6">

      {/* ── Social Links ── */}
      <SectionCard icon={Share2} title="Social Links" desc="Add your social media & messaging links.">
        {links.length > 0 && (
          <div className="space-y-3">
            {links.map((link, i) => {
              const pInfo = PLATFORMS.find(p => p.id === link.platform);
              const PIcon = pInfo?.icon || Globe;
              return (
                <div key={i} className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
                    <PIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                  </div>
                  <input type="url" value={link.url}
                    onChange={e => updateLink(i, e.target.value)}
                    className={`${INPUT} flex-1`}
                    placeholder={pInfo?.placeholder || 'https://...'} />
                  <button onClick={() => removeLink(i)}
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {PLATFORMS.filter(p => !usedPlatforms.has(p.id)).map(p => (
            <button key={p.id} onClick={() => addLink(p.id)}
              className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] transition-all">
              <Plus className="w-3 h-3" />
              {p.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ── Display Options ── */}
      <SectionCard icon={Share2} title="Display Style" desc="How social links appear on your page.">
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">Icon Style</label>
          <div className="flex gap-2">
            {([
              { id: 'icons-only', label: 'Icons Only', desc: 'Clean minimal icons' },
              { id: 'icons-labels', label: 'With Labels', desc: 'Icon + platform name' },
              { id: 'pills', label: 'Pill Buttons', desc: 'Rounded pill badges' },
            ] as const).map(s => {
              const active = (data.socialDisplayStyle || 'icons-only') === s.id;
              return (
                <button key={s.id}
                  onClick={() => onChange({ ...data, socialDisplayStyle: s.id })}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                    active ? 'border-[var(--brand)] bg-[var(--surface)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}>
                  <span className="text-[11px] font-semibold">{s.label}</span>
                  <span className="text-[9px] opacity-60">{s.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">Position</label>
          <div className="flex gap-2">
            {([
              { id: 'header', label: 'Header' },
              { id: 'footer', label: 'Footer' },
              { id: 'both', label: 'Both' },
            ] as const).map(p => {
              const active = (data.socialPosition || 'footer') === p.id;
              return (
                <button key={p.id}
                  onClick={() => onChange({ ...data, socialPosition: p.id })}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    active ? 'border-[var(--brand)] bg-[var(--surface)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
