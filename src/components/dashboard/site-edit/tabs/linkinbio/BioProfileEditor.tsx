'use client';
// BioProfileEditor — controlled profile editor for Link in Bio.

import React, { useState } from 'react';
import {
  User, Instagram, Twitter, Youtube, Linkedin, Github, Globe, Music,
  Plus, Trash2, Eye, EyeOff, ImagePlus, Check,
} from 'lucide-react';
import ImagePickerModal from '@/components/dashboard/image-picker/ImagePickerModal';
import { useConfirm } from '@/hooks/useConfirm';
import { editorInput, EDITOR_ACCENTS } from '../../_shared/editorStyles';

const INPUT = editorInput(EDITOR_ACCENTS.brand);
const CARD = 'rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6 shadow-[var(--shadow-card)]';

export type SocialLink = { platform: string; url: string; is_visible: boolean };

export type BioProfileData = {
  displayName: string;
  bioText: string;
  avatarUrl: string;
  coverImageUrl: string;
  socialLinks: SocialLink[];
  avatarShape?: 'circular' | 'rounded' | 'square';
  avatarBorder?: boolean;
};

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/you' },
  { id: 'twitter', label: 'Twitter/X', icon: Twitter, placeholder: 'https://x.com/you' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@you' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/you' },
  { id: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/you' },
  { id: 'tiktok', label: 'TikTok', icon: Music, placeholder: 'https://tiktok.com/@you' },
  { id: 'website', label: 'Website', icon: Globe, placeholder: 'https://your-site.com' },
];

export default function BioProfileEditor({
  data,
  onChange,
}: {
  data: BioProfileData;
  onChange: (data: BioProfileData) => void;
}) {
  const [imagePicker, setImagePicker] = useState<{ open: boolean; field: 'avatar' | 'cover' }>({ open: false, field: 'avatar' });
  const { confirm, confirmDialog } = useConfirm();

  const updateSocial = (index: number, field: keyof SocialLink, value: string | boolean) => {
    const next = [...data.socialLinks];
    next[index] = { ...next[index], [field]: value };
    onChange({ ...data, socialLinks: next });
  };

  const addSocial = (platformId: string) => {
    onChange({
      ...data,
      socialLinks: [...data.socialLinks, { platform: platformId, url: '', is_visible: true }],
    });
  };

  const removeSocial = (index: number) => {
    onChange({ ...data, socialLinks: data.socialLinks.filter((_, i) => i !== index) });
  };

  const usedPlatforms = new Set(data.socialLinks.map(s => s.platform));
  const available = PLATFORMS.filter(p => !usedPlatforms.has(p.id));

  return (
    <div className="space-y-6">

      {/* ─── VISUAL HEADER (Avatar) ─── */}
      <div className={CARD}>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <ImagePlus className="h-4 w-4 text-[var(--brand)]" /> Identity Media
          </h3>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Tap the avatar below to upload your profile picture.</p>
        </div>

        {/* Visual mock header */}
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="relative flex items-end justify-between px-6 py-6">
            <div className="relative z-10">
              <button
                type="button"
                onClick={() => setImagePicker({ open: true, field: 'avatar' })}
                className="group relative cursor-pointer rounded-full focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <div
                  className={`flex h-24 w-24 items-center justify-center overflow-hidden bg-[var(--surface)] shadow-[var(--shadow-card)] transition-all duration-300
                    ${data.avatarShape === 'square' ? 'rounded-[var(--radius-lg)]' : data.avatarShape === 'rounded' ? 'rounded-[2rem]' : 'rounded-full'}
                    ${data.avatarBorder !== false ? 'border-4 border-[var(--surface)]' : 'border border-[var(--border)]'}
                  `}
                >
                  {data.avatarUrl ? (
                    <img src={data.avatarUrl} alt="Avatar" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <User className="h-10 w-10 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--text-secondary)]" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <ImagePlus className="h-6 w-6 text-white drop-shadow-md" />
                  </div>
                </div>
              </button>
              {data.avatarUrl && (
                <button
                  type="button"
                  aria-label="Remove profile picture"
                  title="Remove"
                  onClick={async () => {
                    if (await confirm({ title: 'Remove profile picture?', description: 'Your avatar will be cleared from the page. The image stays in your Media Library.' })) {
                      onChange({ ...data, avatarUrl: '' });
                    }
                  }}
                  className="absolute -right-1.5 -top-1.5 z-20 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-[var(--text-tertiary)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--danger)]/40 hover:text-[var(--danger)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Shape toggles */}
            <div className="flex gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1.5">
              {[
                { id: 'circular', label: 'Circle' },
                { id: 'rounded', label: 'Rounded' },
                { id: 'square', label: 'Square' },
              ].map(s => {
                const active = (data.avatarShape || 'circular') === s.id;
                return (
                  <button key={s.id} onClick={() => onChange({ ...data, avatarShape: s.id as BioProfileData['avatarShape'] })}
                    className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${active
                      ? 'bg-[var(--surface-muted)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                    }`}>
                    {active && <Check className="h-3 w-3 text-[var(--brand)]" />}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── PROFILE INFO ─── */}
      <div className={CARD}>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <User className="h-4 w-4 text-[var(--brand)]" /> About You
          </h3>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">The primary details displayed on your page.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]">Profile Title</label>
            <input
              type="text"
              value={data.displayName || ''}
              onChange={e => onChange({ ...data, displayName: e.target.value })}
              className={INPUT}
              placeholder="Your Name or Brand"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-[var(--text-secondary)]">Bio Description</label>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${(data.bioText || '').length > 200 ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : 'bg-[var(--surface-muted)] text-[var(--text-tertiary)]'}`}>
                {(data.bioText || '').length}/200
              </span>
            </div>
            <textarea
              rows={3}
              value={data.bioText || ''}
              onChange={e => onChange({ ...data, bioText: e.target.value })}
              className={`${INPUT} resize-none`}
              placeholder="A short, catchy bio..."
            />
          </div>
        </div>
      </div>

      {/* ─── SOCIAL LINKS ─── */}
      <div className={CARD}>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Globe className="h-4 w-4 text-[var(--brand)]" /> Social Icons
          </h3>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Add your social profiles to show as a refined row of icons.</p>
        </div>

        <div className="space-y-3">
          {data.socialLinks.map((social, i) => {
            const platform = PLATFORMS.find(p => p.id === social.platform);
            const Icon = platform?.icon || Globe;
            const isVisible = social.is_visible !== false;

            return (
              <div key={i} className={`flex items-center gap-3 rounded-[var(--radius-md)] border p-2 transition-colors ${isVisible ? 'border-[var(--border)] bg-[var(--surface-muted)]' : 'border-[var(--border)] bg-[var(--surface-muted)] opacity-60'}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
                  <Icon className={`h-4 w-4 ${isVisible ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'}`} />
                </div>

                <input
                  type="url"
                  value={social.url || ''}
                  onChange={e => updateSocial(i, 'url', e.target.value)}
                  className="w-full min-w-0 flex-1 border-none bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:ring-0"
                  placeholder={platform?.placeholder || 'https://...'}
                />

                <div className="flex items-center gap-1 pr-1">
                  <button
                    onClick={() => updateSocial(i, 'is_visible', !isVisible)}
                    className="rounded-[var(--radius-sm)] p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    title={isVisible ? 'Hide' : 'Show'}
                  >
                    {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => removeSocial(i)}
                    aria-label="Remove"
                    className="rounded-[var(--radius-sm)] p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {available.length > 0 && (
          <div className="pt-2">
            <p className="mb-3 text-xs font-medium text-[var(--text-secondary)]">Add more links</p>
            <div className="flex flex-wrap gap-2">
              {available.map(p => (
                <button
                  key={p.id}
                  onClick={() => addSocial(p.id)}
                  className="group inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Plus className="h-3.5 w-3.5 transition-colors group-hover:text-[var(--brand)]" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Picker Modal */}
      <ImagePickerModal
        open={imagePicker.open}
        bucket="creator-public"
        kind={imagePicker.field === 'avatar' ? 'avatar' : 'linkinbio'}
        onClose={() => setImagePicker(prev => ({ ...prev, open: false }))}
        onSelect={(url) => {
          if (imagePicker.field === 'avatar') {
            onChange({ ...data, avatarUrl: url });
          } else {
            onChange({ ...data, coverImageUrl: url });
          }
        }}
        title={imagePicker.field === 'avatar' ? 'Select Profile Avatar' : 'Select Cover Image'}
      />
      {confirmDialog}
    </div>
  );
}
