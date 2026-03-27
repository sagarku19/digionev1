'use client';
// BioProfileEditor — controlled profile editor for Link in Bio.
// Manages: display name, bio text, avatar, cover image, social links.

import React, { useState } from 'react';
import {
  User, Image, Instagram, Twitter, Youtube, Linkedin, Github, Globe, Music,
  Plus, Trash2, Eye, EyeOff, ImagePlus,
} from 'lucide-react';
import ImagePickerModal from '@/components/dashboard/ImagePickerModal';

const INPUT = 'w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm';

export type SocialLink = { platform: string; url: string; is_visible: boolean };

export type BioProfileData = {
  displayName: string;
  bioText: string;
  avatarUrl: string;
  coverImageUrl: string;
  socialLinks: SocialLink[];
};

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/you' },
  { id: 'twitter',   label: 'Twitter/X', icon: Twitter,   placeholder: 'https://x.com/you' },
  { id: 'youtube',   label: 'YouTube',   icon: Youtube,   placeholder: 'https://youtube.com/@you' },
  { id: 'linkedin',  label: 'LinkedIn',  icon: Linkedin,  placeholder: 'https://linkedin.com/in/you' },
  { id: 'github',    label: 'GitHub',    icon: Github,    placeholder: 'https://github.com/you' },
  { id: 'tiktok',    label: 'TikTok',    icon: Music,     placeholder: 'https://tiktok.com/@you' },
  { id: 'website',   label: 'Website',   icon: Globe,     placeholder: 'https://your-site.com' },
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
    <div className="space-y-5">
      {/* Profile Info */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-pink-500" /> Profile
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Your public profile information</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Display Name</label>
          <input
            type="text"
            value={data.displayName || ''}
            onChange={e => onChange({ ...data, displayName: e.target.value })}
            className={INPUT}
            placeholder="Your name"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Bio</label>
            <span className={`text-xs tabular-nums ${(data.bioText || '').length > 200 ? 'text-red-500' : 'text-gray-400'}`}>
              {(data.bioText || '').length}/200
            </span>
          </div>
          <textarea
            rows={3}
            value={data.bioText || ''}
            onChange={e => onChange({ ...data, bioText: e.target.value })}
            className={`${INPUT} resize-none`}
            placeholder="Tell people about yourself..."
          />
        </div>
      </div>

      {/* Images */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Image className="w-4 h-4 text-pink-500" /> Images
          </h3>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Avatar</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={data.avatarUrl || ''}
              onChange={e => onChange({ ...data, avatarUrl: e.target.value })}
              className={`${INPUT} flex-1`}
              placeholder="https://example.com/avatar.jpg"
            />
            <button
              type="button"
              onClick={() => setImagePicker({ open: true, field: 'avatar' })}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30 rounded-lg text-xs font-semibold transition"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Add Image
            </button>
          </div>
          {data.avatarUrl && (
            <div className="mt-2 flex justify-center">
              <img src={data.avatarUrl} alt="Avatar preview" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Cover Image</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={data.coverImageUrl || ''}
              onChange={e => onChange({ ...data, coverImageUrl: e.target.value })}
              className={`${INPUT} flex-1`}
              placeholder="https://example.com/cover.jpg"
            />
            <button
              type="button"
              onClick={() => setImagePicker({ open: true, field: 'cover' })}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30 rounded-lg text-xs font-semibold transition"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Add Image
            </button>
          </div>
          {data.coverImageUrl && (
            <div className="mt-2">
              <img src={data.coverImageUrl} alt="Cover preview" className="w-full h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
            </div>
          )}
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-pink-500" /> Social Links
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Icons shown below your name</p>
        </div>

        {data.socialLinks.map((social, i) => {
          const platform = PLATFORMS.find(p => p.id === social.platform);
          const Icon = platform?.icon || Globe;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <input
                type="url"
                value={social.url || ''}
                onChange={e => updateSocial(i, 'url', e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white placeholder-gray-400"
                placeholder={platform?.placeholder || 'URL'}
              />
              <button
                onClick={() => updateSocial(i, 'is_visible', !social.is_visible)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                title={social.is_visible ? 'Visible' : 'Hidden'}
              >
                {social.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => removeSocial(i)}
                className="p-2 text-gray-400 hover:text-red-500 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        {available.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {available.map(p => (
              <button
                key={p.id}
                onClick={() => addSocial(p.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 transition"
              >
                <Plus className="w-3 h-3" />
                {p.label}
              </button>
            ))}
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
        title={imagePicker.field === 'avatar' ? 'Select Avatar' : 'Select Cover Image'}
      />
    </div>
  );
}
