'use client';
// BioProfileEditor — controlled profile editor for Link in Bio.
// Upgraded UI: Visual Header Mockup, Premium Inputs, Refined Spacing

import React, { useState } from 'react';
import {
  User, Instagram, Twitter, Youtube, Linkedin, Github, Globe, Music,
  Plus, Trash2, Eye, EyeOff, ImagePlus, Check, ChevronDown
} from 'lucide-react';
import ImagePickerModal from '@/components/dashboard/ImagePickerModal';

const INPUT = 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400/80 transition-all duration-300';
const CARD = 'bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 space-y-6 shadow-sm';

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

  const updateSocial = (index: number, field: keyof SocialLink, value: any) => {
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

      {/* ─── VISUAL HEADER (Cover & Avatar) ─── */}
      <div className={CARD}>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-pink-500" /> Identity Media
          </h3>
          <p className="text-[13px] text-gray-500 mt-1">Tap the layout below to upload your cover and avatar.</p>
        </div>

        {/* Visual Mock Header */}
        <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50 dark:bg-gray-900">

          {/* Cover Area */}
          <div
            onClick={() => setImagePicker({ open: true, field: 'cover' })}
            className="group relative w-full h-36 bg-gray-200 dark:bg-gray-800 cursor-pointer overflow-hidden flex items-center justify-center transition-all"
          >
            {data.coverImageUrl ? (
              <img src={data.coverImageUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="text-gray-400 flex flex-col items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                <ImagePlus className="w-6 h-6" />
                <span className="text-[11px] font-semibold uppercase tracking-widest">Add Cover</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
              <span className="bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2">
                <ImagePlus className="w-3.5 h-3.5" /> {data.coverImageUrl ? 'Change Cover' : 'Upload Cover'}
              </span>
            </div>
          </div>

          {/* Avatar Area */}
          <div className="px-6 pb-6 relative flex items-end justify-between">
            <div
              onClick={() => setImagePicker({ open: true, field: 'avatar' })}
              className="group relative -mt-12 cursor-pointer z-10"
            >
              <div
                className={`w-24 h-24 bg-white dark:bg-gray-900 shadow-lg flex items-center justify-center overflow-hidden transition-all duration-300
                  ${data.avatarShape === 'square' ? 'rounded-xl' : data.avatarShape === 'rounded' ? 'rounded-[2rem]' : 'rounded-full'}
                  ${data.avatarBorder !== false ? 'border-4 border-white dark:border-gray-900' : 'border border-gray-200 dark:border-gray-800'}
                `}
              >
                {data.avatarUrl ? (
                  <img src={data.avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <User className="w-10 h-10 text-gray-400 group-hover:text-gray-500 transition-colors" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ImagePlus className="w-6 h-6 text-white drop-shadow-md" />
                </div>
              </div>
            </div>

            {/* Shape toggles */}
            <div className="flex gap-1.5 bg-gray-100/80 dark:bg-gray-800/50 p-1.5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
              {[
                { id: 'circular', label: 'Circle' },
                { id: 'rounded', label: 'Rounded' },
                { id: 'square', label: 'Square' }
              ].map(s => {
                const active = (data.avatarShape || 'circular') === s.id;
                return (
                  <button key={s.id} onClick={() => onChange({ ...data, avatarShape: s.id as any })}
                    className={`px-3 py-1.5 text-[11px] font-semibold transition-all duration-300 rounded-lg flex items-center gap-1.5
                        ${active
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white scale-100'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 scale-95 hover:scale-100'
                      }`}>
                    {active && <Check className="w-3 h-3 text-pink-500" />}
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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-pink-500" /> About You
          </h3>
          <p className="text-[13px] text-gray-500 mt-1">The primary details displayed on your page.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Profile Title</label>
            <input
              type="text"
              value={data.displayName || ''}
              onChange={e => onChange({ ...data, displayName: e.target.value })}
              className={INPUT}
              placeholder="Your Name or Brand"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text[13px] font-medium text-gray-700 dark:text-gray-300">Bio Description</label>
              <span className={`text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-full ${(data.bioText || '').length > 200 ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-pink-500" /> Social Icons
          </h3>
          <p className="text-[13px] text-gray-500 mt-1">Add your social profiles to show as a refined row of icons.</p>
        </div>

        <div className="space-y-3">
          {data.socialLinks.map((social, i) => {
            const platform = PLATFORMS.find(p => p.id === social.platform);
            const Icon = platform?.icon || Globe;
            const isVisible = social.is_visible !== false;

            return (
              <div key={i} className={`flex items-center gap-3 p-2 border rounded-2xl transition-all duration-300 ${isVisible ? 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-800' : 'bg-gray-50/20 dark:bg-gray-900/20 border-gray-100 dark:border-gray-800/30 opacity-60'}`}>
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${isVisible ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`} />
                </div>

                <input
                  type="url"
                  value={social.url || ''}
                  onChange={e => updateSocial(i, 'url', e.target.value)}
                  className="flex-1 bg-transparent border-none text-[13px] outline-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 w-full"
                  placeholder={platform?.placeholder || 'https://...'}
                />

                <div className="flex items-center gap-1 pr-1">
                  <button
                    onClick={() => updateSocial(i, 'is_visible', !isVisible)}
                    className={`p-2 rounded-lg transition-colors ${isVisible ? 'text-gray-400 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-700' : 'text-gray-300'}`}
                    title={isVisible ? 'Hide' : 'Show'}
                  >
                    {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => removeSocial(i)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {available.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 mb-3">Add more links</p>
            <div className="flex flex-wrap gap-2">
              {available.map(p => (
                <button
                  key={p.id}
                  onClick={() => addSocial(p.id)}
                  className="group flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-white hover:shadow-sm dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 rounded-xl text-[12px] font-semibold transition-all duration-300"
                >
                  <Plus className="w-3.5 h-3.5 group-hover:text-pink-500 transition-colors" />
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
    </div>
  );
}
