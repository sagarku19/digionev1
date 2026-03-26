'use client';
// BioLinksEditor — drag-to-reorder link list for Link in Bio.
// Controlled component: links + onChange.

import React, { useState } from 'react';
import {
  GripVertical, Eye, EyeOff, Trash2, ChevronDown, ChevronRight,
  Plus, Link as LinkIcon, Package, Type, Minus, Play, Mail, Image,
  ExternalLink, Star,
} from 'lucide-react';

const INPUT = 'w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

export type BioLink = {
  id: string;
  link_type: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string;
  product_id: string;
  icon_type: string;
  style_variant: string;
  is_visible: boolean;
  sort_order: number;
  metadata: any;
};

const LINK_TYPES = [
  { id: 'url',           label: 'Link',          icon: LinkIcon,     desc: 'External URL' },
  { id: 'product',       label: 'Product',       icon: Package,      desc: 'Sell a product' },
  { id: 'heading',       label: 'Heading',       icon: Type,         desc: 'Section title' },
  { id: 'divider',       label: 'Divider',       icon: Minus,        desc: 'Visual separator' },
  { id: 'video_embed',   label: 'Video',         icon: Play,         desc: 'YouTube/Vimeo embed' },
  { id: 'email_capture', label: 'Email Signup',  icon: Mail,         desc: 'Collect emails' },
  { id: 'image',         label: 'Image',         icon: Image,        desc: 'Full-width image' },
];

const STYLE_VARIANTS = [
  { id: 'default',   label: 'Default' },
  { id: 'featured',  label: 'Featured' },
  { id: 'outline',   label: 'Outline' },
  { id: 'highlight', label: 'Highlight' },
];

const ICON_TYPES = [
  { id: 'external',  label: 'Link',      icon: ExternalLink },
  { id: 'youtube',   label: 'YouTube',   icon: Play },
  { id: 'instagram', label: 'Instagram', icon: LinkIcon },
  { id: 'twitter',   label: 'Twitter',   icon: LinkIcon },
  { id: 'spotify',   label: 'Spotify',   icon: LinkIcon },
  { id: 'tiktok',    label: 'TikTok',    icon: LinkIcon },
];

export default function BioLinksEditor({
  links,
  onChange,
  products,
}: {
  links: BioLink[];
  onChange: (links: BioLink[]) => void;
  products?: { id: string; name: string; price: number; thumbnail_url: string | null; is_published?: boolean }[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const updateLink = (id: string, updates: Partial<BioLink>) => {
    onChange(links.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const removeLink = (id: string) => {
    onChange(links.filter(l => l.id !== id).map((l, i) => ({ ...l, sort_order: i + 1 })));
    if (expandedId === id) setExpandedId(null);
  };

  const addLink = (type: string) => {
    const newLink: BioLink = {
      id: crypto.randomUUID(),
      link_type: type,
      title: '',
      description: '',
      url: '',
      thumbnail_url: '',
      product_id: '',
      icon_type: 'external',
      style_variant: 'default',
      is_visible: true,
      sort_order: links.length + 1,
      metadata: {},
    };
    onChange([...links, newLink]);
    setExpandedId(newLink.id);
    setShowAddPicker(false);
  };

  const moveLink = (from: number, to: number) => {
    if (to < 0 || to >= links.length) return;
    const next = [...links];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next.map((l, i) => ({ ...l, sort_order: i + 1 })));
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="p-3.5 bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 rounded-xl flex items-start gap-3">
        <LinkIcon className="w-4 h-4 text-pink-600 dark:text-pink-400 mt-0.5 shrink-0" />
        <p className="text-xs text-pink-700 dark:text-pink-300">
          Drag to reorder. Click to edit. Press <strong>Save</strong> to persist changes.
        </p>
      </div>

      {/* Link list */}
      {links.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center">
          <LinkIcon className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm font-medium text-gray-500">No links yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first link below</p>
        </div>
      )}

      <div className="space-y-2">
        {links.map((link, idx) => {
          const isExpanded = expandedId === link.id;
          const typeInfo = LINK_TYPES.find(t => t.id === link.link_type);
          const TypeIcon = typeInfo?.icon || LinkIcon;

          return (
            <div
              key={link.id}
              className={`bg-white dark:bg-[#0A0A1A] border rounded-xl overflow-hidden transition-all ${
                isExpanded ? 'border-pink-300 dark:border-pink-700' : 'border-gray-200 dark:border-gray-800'
              } ${dragIdx === idx ? 'opacity-50' : ''}`}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={e => { e.preventDefault(); if (dragIdx !== null) moveLink(dragIdx, idx); setDragIdx(null); }}
              onDragEnd={() => setDragIdx(null)}
            >
              {/* Link row header */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab shrink-0" />
                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <TypeIcon className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : link.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {link.title || typeInfo?.label || 'Untitled'}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{typeInfo?.label}</p>
                </button>
                <button
                  onClick={() => updateLink(link.id, { is_visible: !link.is_visible })}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  {link.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => removeLink(link.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : link.id)}
                  className="p-1.5 text-gray-400"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800 space-y-3">
                  {/* Title — shown for all except divider */}
                  {link.link_type !== 'divider' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                      <input
                        type="text"
                        value={link.title}
                        onChange={e => updateLink(link.id, { title: e.target.value })}
                        className={INPUT}
                        placeholder={link.link_type === 'heading' ? 'Section heading' : 'Link title'}
                      />
                    </div>
                  )}

                  {/* URL — for url type */}
                  {(link.link_type === 'url') && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
                        <input
                          type="url"
                          value={link.url}
                          onChange={e => updateLink(link.id, { url: e.target.value })}
                          className={INPUT}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
                        <input
                          type="text"
                          value={link.description}
                          onChange={e => updateLink(link.id, { description: e.target.value })}
                          className={INPUT}
                          placeholder="Short subtitle"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Thumbnail URL (optional)</label>
                        <input
                          type="url"
                          value={link.thumbnail_url}
                          onChange={e => updateLink(link.id, { thumbnail_url: e.target.value })}
                          className={INPUT}
                          placeholder="https://... icon image"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Icon</label>
                        <div className="flex flex-wrap gap-1.5">
                          {ICON_TYPES.map(it => (
                            <button
                              key={it.id}
                              onClick={() => updateLink(link.id, { icon_type: it.id })}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${
                                link.icon_type === it.id
                                  ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-500/40'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent'
                              }`}
                            >
                              {it.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Product selector */}
                  {link.link_type === 'product' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
                      {products && products.length > 0 ? (
                        <select
                          value={link.product_id}
                          onChange={e => updateLink(link.id, { product_id: e.target.value })}
                          className={INPUT}
                        >
                          <option value="">Select a product...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {'\u20B9'}{p.price.toLocaleString('en-IN')}{p.is_published === false ? ' (draft)' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            No published products found. Create and publish a product first.
                          </p>
                        </div>
                      )}
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">CTA Text</label>
                        <input
                          type="text"
                          value={link.metadata?.cta_text || ''}
                          onChange={e => updateLink(link.id, { metadata: { ...link.metadata, cta_text: e.target.value } })}
                          className={INPUT}
                          placeholder="Buy Now"
                        />
                      </div>
                    </div>
                  )}

                  {/* Video embed */}
                  {link.link_type === 'video_embed' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Embed URL</label>
                        <input
                          type="url"
                          value={link.metadata?.embed_url || ''}
                          onChange={e => updateLink(link.id, { metadata: { ...link.metadata, embed_url: e.target.value } })}
                          className={INPUT}
                          placeholder="https://youtube.com/embed/..."
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Use the embed URL, not the regular video URL</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Aspect Ratio</label>
                        <div className="flex gap-2">
                          {['16/9', '4/3', '1/1'].map(r => (
                            <button
                              key={r}
                              onClick={() => updateLink(link.id, { metadata: { ...link.metadata, aspect_ratio: r } })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                (link.metadata?.aspect_ratio || '16/9') === r
                                  ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-500/40'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Email capture */}
                  {link.link_type === 'email_capture' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Button Text</label>
                        <input
                          type="text"
                          value={link.metadata?.button_text || ''}
                          onChange={e => updateLink(link.id, { metadata: { ...link.metadata, button_text: e.target.value } })}
                          className={INPUT}
                          placeholder="Subscribe"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder</label>
                        <input
                          type="text"
                          value={link.metadata?.placeholder || ''}
                          onChange={e => updateLink(link.id, { metadata: { ...link.metadata, placeholder: e.target.value } })}
                          className={INPUT}
                          placeholder="Enter your email"
                        />
                      </div>
                    </>
                  )}

                  {/* Image */}
                  {link.link_type === 'image' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Image URL</label>
                        <input
                          type="url"
                          value={link.thumbnail_url}
                          onChange={e => updateLink(link.id, { thumbnail_url: e.target.value })}
                          className={INPUT}
                          placeholder="https://..."
                        />
                        {link.thumbnail_url && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img src={link.thumbnail_url} alt="" className="w-full h-24 object-cover" />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Link URL (optional, clicks open this)</label>
                        <input
                          type="url"
                          value={link.metadata?.link_url || ''}
                          onChange={e => updateLink(link.id, { metadata: { ...link.metadata, link_url: e.target.value } })}
                          className={INPUT}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Alt Text</label>
                        <input
                          type="text"
                          value={link.metadata?.alt_text || ''}
                          onChange={e => updateLink(link.id, { metadata: { ...link.metadata, alt_text: e.target.value } })}
                          className={INPUT}
                          placeholder="Describe this image"
                        />
                      </div>
                    </>
                  )}

                  {/* Style variant — for url, product types */}
                  {(link.link_type === 'url' || link.link_type === 'product') && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Style</label>
                      <div className="flex gap-2">
                        {STYLE_VARIANTS.map(sv => (
                          <button
                            key={sv.id}
                            onClick={() => updateLink(link.id, { style_variant: sv.id })}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              link.style_variant === sv.id
                                ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-500/40'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent'
                            }`}
                          >
                            {sv.id === 'featured' && <Star className="w-3 h-3" />}
                            {sv.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add link button */}
      {showAddPicker ? (
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add a block</p>
          <div className="grid grid-cols-2 gap-2">
            {LINK_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => addLink(t.id)}
                className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-left transition"
              >
                <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0">
                  <t.icon className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{t.label}</p>
                  <p className="text-[10px] text-gray-400">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddPicker(false)}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2 transition"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddPicker(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-600 rounded-xl text-sm font-medium text-gray-500 hover:text-pink-600 transition"
        >
          <Plus className="w-4 h-4" /> Add Block
        </button>
      )}

      {links.length > 0 && (
        <p className="text-xs text-gray-400 text-center">{links.length} block{links.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
