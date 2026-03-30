'use client';
// BioLinksEditor V2 — block-based editor for Link in Bio.
// New: header, text, html_embed, social_icons, spotify, banner blocks.
// Enhanced: heading (subtitle/align/size/divider), url (animation),
//           image (caption/radius/ratio), video (caption), email (description).

import React, { useState } from 'react';
import {
  GripVertical, Eye, EyeOff, Trash2, ChevronDown, ChevronRight,
  Plus, Link as LinkIcon, Package, Type, Minus, Play, Mail, Image,
  ExternalLink, Star, Code, Share2, Music2, Megaphone, AlignLeft,
  AlignCenter, AlignRight, Heading1, FileText, Globe, Instagram,
  Twitter, Youtube, Linkedin, Github, Music, ImagePlus,
} from 'lucide-react';
import ImagePickerModal from '@/components/dashboard/ImagePickerModal';

const INPUT = 'w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';
const CHIP_ON = 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-500/40';
const CHIP_OFF = 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent';

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

// ─── Block type categories ─────────────────────────────────
const BLOCK_CATEGORIES = [
  {
    label: 'Content',
    types: [
      { id: 'url',           label: 'Link',          icon: LinkIcon,     desc: 'External URL' },
      { id: 'header',        label: 'Header',        icon: Heading1,     desc: 'Title + subtitle' },
      { id: 'text',          label: 'Text',          icon: FileText,     desc: 'Paragraph block' },
      { id: 'heading',       label: 'Section Title', icon: Type,         desc: 'Simple label' },
      { id: 'divider',       label: 'Divider',       icon: Minus,        desc: 'Visual separator' },
    ],
  },
  {
    label: 'Media & Embeds',
    types: [
      { id: 'image',         label: 'Image',         icon: Image,        desc: 'Full-width image' },
      { id: 'video_embed',   label: 'Video',         icon: Play,         desc: 'YouTube / Vimeo' },
      { id: 'spotify',       label: 'Spotify',       icon: Music2,       desc: 'Track or playlist' },
      { id: 'html_embed',    label: 'HTML / Iframe',  icon: Code,         desc: 'Custom embed code' },
    ],
  },
  {
    label: 'Commerce & Social',
    types: [
      { id: 'product',       label: 'Product',       icon: Package,      desc: 'Sell a product' },
      { id: 'email_capture', label: 'Email Signup',  icon: Mail,         desc: 'Collect emails' },
      { id: 'social_icons',  label: 'Social Icons',  icon: Share2,       desc: 'Icon row' },
      { id: 'banner',        label: 'Banner CTA',    icon: Megaphone,    desc: 'Call-to-action card' },
    ],
  },
];

// Flat list for lookups
const ALL_TYPES = BLOCK_CATEGORIES.flatMap(c => c.types);

const STYLE_VARIANTS = [
  { id: 'default',   label: 'Default' },
  { id: 'featured',  label: 'Featured' },
  { id: 'outline',   label: 'Outline' },
  { id: 'highlight', label: 'Highlight' },
];

const ICON_TYPES = [
  { id: 'external',  label: 'Link',      icon: ExternalLink },
  { id: 'youtube',   label: 'YouTube',   icon: Play },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'twitter',   label: 'Twitter',   icon: Twitter },
  { id: 'spotify',   label: 'Spotify',   icon: Music2 },
  { id: 'tiktok',    label: 'TikTok',    icon: Music },
  { id: 'github',    label: 'GitHub',    icon: Github },
  { id: 'linkedin',  label: 'LinkedIn',  icon: Linkedin },
];

const ANIMATIONS = [
  { id: 'none',  label: 'None' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'shine', label: 'Shine' },
  { id: 'glow',  label: 'Glow' },
];

const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/you' },
  { id: 'twitter',   label: 'Twitter/X', icon: Twitter,   placeholder: 'https://x.com/you' },
  { id: 'youtube',   label: 'YouTube',   icon: Youtube,   placeholder: 'https://youtube.com/@you' },
  { id: 'linkedin',  label: 'LinkedIn',  icon: Linkedin,  placeholder: 'https://linkedin.com/in/you' },
  { id: 'github',    label: 'GitHub',    icon: Github,    placeholder: 'https://github.com/you' },
  { id: 'tiktok',    label: 'TikTok',    icon: Music,     placeholder: 'https://tiktok.com/@you' },
  { id: 'website',   label: 'Website',   icon: Globe,     placeholder: 'https://your-site.com' },
  { id: 'spotify',   label: 'Spotify',   icon: Music2,    placeholder: 'https://open.spotify.com/artist/...' },
];

// ─── Chip button helper ──────────────────────────────────
function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${active ? CHIP_ON : CHIP_OFF}`}>
      {children}
    </button>
  );
}

// ─── Alignment picker ────────────────────────────────────
function AlignPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = [
    { id: 'left', icon: AlignLeft },
    { id: 'center', icon: AlignCenter },
    { id: 'right', icon: AlignRight },
  ];
  return (
    <div className="flex gap-1">
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`p-2 rounded-lg transition ${value === o.id ? CHIP_ON : CHIP_OFF}`}>
          <o.icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}

// ─── Section label ───────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{children}</label>;
}

// ─── Main component ──────────────────────────────────────
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
  const [imagePicker, setImagePicker] = useState<{ open: boolean; linkId: string; field: string }>({ open: false, linkId: '', field: '' });
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const updateLink = (id: string, updates: Partial<BioLink>) => {
    onChange(links.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const updateMeta = (id: string, key: string, value: any) => {
    const link = links.find(l => l.id === id);
    if (!link) return;
    updateLink(id, { metadata: { ...link.metadata, [key]: value } });
  };

  const removeLink = (id: string) => {
    onChange(links.filter(l => l.id !== id).map((l, i) => ({ ...l, sort_order: i + 1 })));
    if (expandedId === id) setExpandedId(null);
  };

  const addLink = (type: string) => {
    const defaults: Record<string, any> = {
      social_icons: { links: [], style: 'circle', size: 'md', alignment: 'center' },
      header: { subtitle: '', alignment: 'center', size: 'xl', show_divider: false },
      text: { content: '', alignment: 'left', size: 'base' },
      html_embed: { html: '', height: '300' },
      spotify: { spotify_url: '', embed_type: 'track' },
      banner: { description: '', button_text: 'Learn More', button_url: '', bg_color: '' },
      product: { layout: 'horizontal', button_position: 'right', show_price: true, badge: '', cta_text: 'Buy Now' },
    };
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
      metadata: defaults[type] ?? {},
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

  // ─── Social icons helpers ──────────────────────────────
  const addSocialToBlock = (linkId: string, platform: string) => {
    const link = links.find(l => l.id === linkId);
    if (!link) return;
    const current = link.metadata?.links ?? [];
    updateMeta(linkId, 'links', [...current, { platform, url: '' }]);
  };

  const updateSocialInBlock = (linkId: string, idx: number, field: string, value: string) => {
    const link = links.find(l => l.id === linkId);
    if (!link) return;
    const current = [...(link.metadata?.links ?? [])];
    current[idx] = { ...current[idx], [field]: value };
    updateMeta(linkId, 'links', current);
  };

  const removeSocialFromBlock = (linkId: string, idx: number) => {
    const link = links.find(l => l.id === linkId);
    if (!link) return;
    const current = [...(link.metadata?.links ?? [])];
    current.splice(idx, 1);
    updateMeta(linkId, 'links', current);
  };

  // ─── No-title block types ─────────────────────────────
  const NO_TITLE_TYPES = ['divider', 'html_embed', 'social_icons', 'text', 'product'];

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="p-3.5 bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 rounded-xl flex items-start gap-3">
        <LinkIcon className="w-4 h-4 text-pink-600 dark:text-pink-400 mt-0.5 shrink-0" />
        <p className="text-xs text-pink-700 dark:text-pink-300">
          Drag to reorder. Click to edit. Press <strong>Save</strong> to persist changes.
        </p>
      </div>

      {/* Empty state */}
      {links.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center">
          <LinkIcon className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm font-medium text-gray-500">No blocks yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first block below</p>
        </div>
      )}

      {/* Block list */}
      <div className="space-y-2">
        {links.map((link, idx) => {
          const isExpanded = expandedId === link.id;
          const typeInfo = ALL_TYPES.find(t => t.id === link.link_type);
          const TypeIcon = typeInfo?.icon || LinkIcon;

          return (
            <div
              key={link.id}
              className={`bg-white dark:bg-[#0A0A1A] border rounded-xl overflow-hidden transition-all ${
                isExpanded ? 'border-pink-300 dark:border-pink-700 shadow-sm shadow-pink-500/5' : 'border-gray-200 dark:border-gray-800'
              } ${dragIdx === idx ? 'opacity-50' : ''}`}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (dragIdx !== null) moveLink(dragIdx, idx); setDragIdx(null); }}
              onDragEnd={() => setDragIdx(null)}
            >
              {/* Row header */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab shrink-0" />
                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <TypeIcon className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <button onClick={() => setExpandedId(isExpanded ? null : link.id)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {link.title || link.metadata?.content?.slice(0, 40) || typeInfo?.label || 'Untitled'}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{typeInfo?.label}</p>
                </button>
                <button onClick={() => updateLink(link.id, { is_visible: !link.is_visible })}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                  {link.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => removeLink(link.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setExpandedId(isExpanded ? null : link.id)} className="p-1.5 text-gray-400">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800 space-y-3">

                  {/* ── Title — most types ── */}
                  {!NO_TITLE_TYPES.includes(link.link_type) && link.link_type !== 'header' && (
                    <div>
                      <FieldLabel>Title</FieldLabel>
                      <input type="text" value={link.title} onChange={e => updateLink(link.id, { title: e.target.value })}
                        className={INPUT} placeholder={link.link_type === 'heading' ? 'Section heading' : 'Block title'} />
                    </div>
                  )}

                  {/* ════════════════════════════════════════════════
                      HEADER block — rich title + subtitle
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'header' && (
                    <>
                      <div>
                        <FieldLabel>Title</FieldLabel>
                        <input type="text" value={link.title} onChange={e => updateLink(link.id, { title: e.target.value })}
                          className={INPUT} placeholder="Your headline" />
                      </div>
                      <div>
                        <FieldLabel>Subtitle</FieldLabel>
                        <input type="text" value={link.metadata?.subtitle || ''} onChange={e => updateMeta(link.id, 'subtitle', e.target.value)}
                          className={INPUT} placeholder="Optional subtitle text" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <FieldLabel>Size</FieldLabel>
                          <div className="flex gap-1.5">
                            {['sm', 'md', 'lg', 'xl', '2xl'].map(s => (
                              <Chip key={s} active={(link.metadata?.size || 'xl') === s} onClick={() => updateMeta(link.id, 'size', s)}>
                                {s.toUpperCase()}
                              </Chip>
                            ))}
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Align</FieldLabel>
                          <AlignPicker value={link.metadata?.alignment || 'center'} onChange={v => updateMeta(link.id, 'alignment', v)} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={link.metadata?.show_divider ?? false}
                          onChange={e => updateMeta(link.id, 'show_divider', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">Show decorative line</span>
                      </label>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      TEXT block — paragraph content
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'text' && (
                    <>
                      <div>
                        <FieldLabel>Content</FieldLabel>
                        <textarea rows={4} value={link.metadata?.content || ''}
                          onChange={e => updateMeta(link.id, 'content', e.target.value)}
                          className={`${INPUT} resize-none`} placeholder="Write your text here..." />
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <FieldLabel>Size</FieldLabel>
                          <div className="flex gap-1.5">
                            {['sm', 'base', 'lg'].map(s => (
                              <Chip key={s} active={(link.metadata?.size || 'base') === s} onClick={() => updateMeta(link.id, 'size', s)}>
                                {s === 'sm' ? 'Small' : s === 'base' ? 'Normal' : 'Large'}
                              </Chip>
                            ))}
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Align</FieldLabel>
                          <AlignPicker value={link.metadata?.alignment || 'left'} onChange={v => updateMeta(link.id, 'alignment', v)} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      HEADING block (enhanced) — label + subtitle + align + size + divider
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'heading' && (
                    <>
                      <div>
                        <FieldLabel>Subtitle (optional)</FieldLabel>
                        <input type="text" value={link.metadata?.subtitle || ''} onChange={e => updateMeta(link.id, 'subtitle', e.target.value)}
                          className={INPUT} placeholder="Short description" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <FieldLabel>Size</FieldLabel>
                          <div className="flex gap-1.5">
                            {['sm', 'md', 'lg'].map(s => (
                              <Chip key={s} active={(link.metadata?.size || 'md') === s} onClick={() => updateMeta(link.id, 'size', s)}>
                                {s.toUpperCase()}
                              </Chip>
                            ))}
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Align</FieldLabel>
                          <AlignPicker value={link.metadata?.alignment || 'left'} onChange={v => updateMeta(link.id, 'alignment', v)} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={link.metadata?.show_divider ?? false}
                          onChange={e => updateMeta(link.id, 'show_divider', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">Show line below</span>
                      </label>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      URL block (enhanced) — + animation
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'url' && (
                    <>
                      <div>
                        <FieldLabel>URL</FieldLabel>
                        <input type="url" value={link.url} onChange={e => updateLink(link.id, { url: e.target.value })}
                          className={INPUT} placeholder="https://..." />
                      </div>
                      <div>
                        <FieldLabel>Description (optional)</FieldLabel>
                        <input type="text" value={link.description} onChange={e => updateLink(link.id, { description: e.target.value })}
                          className={INPUT} placeholder="Short subtitle" />
                      </div>
                      <div>
                        <FieldLabel>Thumbnail (optional)</FieldLabel>
                        <div className="flex gap-2">
                          <input type="url" value={link.thumbnail_url} onChange={e => updateLink(link.id, { thumbnail_url: e.target.value })}
                            className={`${INPUT} flex-1`} placeholder="https://... icon image" />
                          <button type="button" onClick={() => setImagePicker({ open: true, linkId: link.id, field: 'thumbnail_url' })}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30 rounded-lg text-[11px] font-semibold transition">
                            <ImagePlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Icon</FieldLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {ICON_TYPES.map(it => (
                            <Chip key={it.id} active={link.icon_type === it.id} onClick={() => updateLink(link.id, { icon_type: it.id })}>
                              {it.label}
                            </Chip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Animation</FieldLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {ANIMATIONS.map(a => (
                            <Chip key={a.id} active={(link.metadata?.animation || 'none') === a.id}
                              onClick={() => updateMeta(link.id, 'animation', a.id)}>
                              {a.label}
                            </Chip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Width in Grid</FieldLabel>
                        <div className="flex gap-1.5">
                          <Chip active={(link.metadata?.col_span || 'full') === 'full'} onClick={() => updateMeta(link.id, 'col_span', 'full')}>
                            Full Width
                          </Chip>
                          <Chip active={link.metadata?.col_span === 'half'} onClick={() => updateMeta(link.id, 'col_span', 'half')}>
                            Half Width
                          </Chip>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      PRODUCT block — rich editor
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'product' && (() => {
                    const sel = products?.find(p => p.id === link.product_id);
                    return (
                      <div className="space-y-3">

                        {/* ── Product selector ── */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <FieldLabel>Product</FieldLabel>
                            <a href="/dashboard/products/new" target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] font-semibold text-pink-600 dark:text-pink-400 hover:underline transition">
                              <Plus className="w-3 h-3" /> New Product
                            </a>
                          </div>
                          {products && products.length > 0 ? (
                            <>
                              <select
                                value={link.product_id}
                                onChange={e => {
                                  const picked = products.find(p => p.id === e.target.value);
                                  updateLink(link.id, {
                                    product_id: e.target.value,
                                    title: link.title || picked?.name || '',
                                    thumbnail_url: link.thumbnail_url || picked?.thumbnail_url || '',
                                  });
                                }}
                                className={INPUT}
                              >
                                <option value="">Select a product…</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} — {'\u20B9'}{p.price.toLocaleString('en-IN')}{p.is_published === false ? ' (draft)' : ''}
                                  </option>
                                ))}
                              </select>

                              {/* Selected product preview card */}
                              {sel && (
                                <div className="mt-2 flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                                  {sel.thumbnail_url ? (
                                    <img src={sel.thumbnail_url} alt={sel.name} className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shrink-0" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                      <Package className="w-5 h-5 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{sel.name}</p>
                                    <p className="text-xs text-pink-600 dark:text-pink-400 font-medium">{'\u20B9'}{sel.price.toLocaleString('en-IN')}</p>
                                    {sel.is_published === false && <span className="text-[10px] text-amber-600 dark:text-amber-400">Draft</span>}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => updateLink(link.id, {
                                      title: sel.name,
                                      thumbnail_url: sel.thumbnail_url || link.thumbnail_url,
                                    })}
                                    className="shrink-0 text-[10px] font-semibold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 px-2.5 py-1 rounded-lg transition"
                                  >
                                    Auto-fill
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
                              <p className="text-xs text-amber-700 dark:text-amber-400">No products yet.</p>
                              <a href="/dashboard/products/new" target="_blank" rel="noopener noreferrer"
                                className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 underline">
                                Create one →
                              </a>
                            </div>
                          )}
                        </div>

                        {/* ── Product image ── */}
                        <div>
                          <FieldLabel>Product Image</FieldLabel>
                          <div className="flex gap-2">
                            <input type="url" value={link.thumbnail_url}
                              onChange={e => updateLink(link.id, { thumbnail_url: e.target.value })}
                              className={`${INPUT} flex-1`} placeholder="Image URL or pick below…" />
                            <button type="button"
                              onClick={() => setImagePicker({ open: true, linkId: link.id, field: 'thumbnail_url' })}
                              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30 rounded-lg text-[11px] font-semibold transition">
                              <ImagePlus className="w-3.5 h-3.5" /> Pick
                            </button>
                          </div>
                          {link.thumbnail_url && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                              <img src={link.thumbnail_url} alt="" className="w-full h-28 object-cover" />
                            </div>
                          )}
                        </div>

                        {/* ── Title ── */}
                        <div>
                          <FieldLabel>Display Title</FieldLabel>
                          <input type="text" value={link.title}
                            onChange={e => updateLink(link.id, { title: e.target.value })}
                            className={INPUT} placeholder="Product name shown on card" />
                        </div>

                        {/* ── Description ── */}
                        <div>
                          <FieldLabel>Short Description</FieldLabel>
                          <textarea value={link.description}
                            onChange={e => updateLink(link.id, { description: e.target.value })}
                            className={`${INPUT} resize-none`} rows={2}
                            placeholder="One-line product pitch…" />
                        </div>

                        {/* ── Badge + CTA ── */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <FieldLabel>Badge Label</FieldLabel>
                            <input type="text" value={link.metadata?.badge || ''}
                              onChange={e => updateMeta(link.id, 'badge', e.target.value)}
                              className={INPUT} placeholder="New, Sale, Hot…" />
                          </div>
                          <div>
                            <FieldLabel>CTA Button Text</FieldLabel>
                            <input type="text" value={link.metadata?.cta_text || ''}
                              onChange={e => updateMeta(link.id, 'cta_text', e.target.value)}
                              className={INPUT} placeholder="Buy Now" />
                          </div>
                        </div>

                        {/* ── Layout + Button position ── */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <FieldLabel>Card Layout</FieldLabel>
                            <div className="flex gap-1.5 flex-wrap">
                              {[{ id: 'horizontal', label: 'Row' }, { id: 'split', label: 'Split' }, { id: 'vertical', label: 'Card' }].map(l => (
                                <Chip key={l.id}
                                  active={(link.metadata?.layout || 'horizontal') === l.id}
                                  onClick={() => updateMeta(link.id, 'layout', l.id)}>
                                  {l.label}
                                </Chip>
                              ))}
                            </div>
                          </div>
                          <div>
                            <FieldLabel>Button Position</FieldLabel>
                            <div className="flex gap-1.5 flex-wrap">
                              {[{ id: 'right', label: 'Right' }, { id: 'center', label: 'Center' }, { id: 'full', label: 'Full' }].map(b => (
                                <Chip key={b.id}
                                  active={(link.metadata?.button_position || 'right') === b.id}
                                  onClick={() => updateMeta(link.id, 'button_position', b.id)}>
                                  {b.label}
                                </Chip>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ── Price controls ── */}
                        <div className="space-y-2">
                          {/* Show price toggle */}
                          <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                            <div>
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Show Price</p>
                              <p className="text-[10px] text-gray-400">Display product price on card</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateMeta(link.id, 'show_price', !(link.metadata?.show_price ?? true))}
                              className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${(link.metadata?.show_price ?? true) ? 'bg-pink-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${(link.metadata?.show_price ?? true) ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                          </div>

                          {/* Price position + original price — only when price is visible */}
                          {(link.metadata?.show_price ?? true) && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <FieldLabel>Price Position</FieldLabel>
                                <div className="flex gap-1.5 flex-wrap">
                                  {[{ id: 'below', label: 'Below title' }, { id: 'inline', label: 'Right of title' }].map(p => (
                                    <Chip key={p.id}
                                      active={(link.metadata?.price_position || 'below') === p.id}
                                      onClick={() => updateMeta(link.id, 'price_position', p.id)}>
                                      {p.label}
                                    </Chip>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <FieldLabel>Original / MRP Price</FieldLabel>
                                <input
                                  type="number"
                                  min={0}
                                  value={link.metadata?.original_price ?? ''}
                                  onChange={e => updateMeta(link.id, 'original_price', e.target.value === '' ? null : Number(e.target.value))}
                                  className={INPUT}
                                  placeholder="e.g. 999"
                                />
                                <p className="text-[10px] text-gray-400 mt-0.5">Shows crossed-out next to price</p>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })()}

                  {/* ════════════════════════════════════════════════
                      VIDEO block (enhanced) — + caption
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'video_embed' && (
                    <>
                      <div>
                        <FieldLabel>Embed URL</FieldLabel>
                        <input type="url" value={link.metadata?.embed_url || ''} onChange={e => updateMeta(link.id, 'embed_url', e.target.value)}
                          className={INPUT} placeholder="https://youtube.com/embed/..." />
                        <p className="text-[10px] text-gray-400 mt-1">Use the embed URL, not the regular video URL</p>
                      </div>
                      <div>
                        <FieldLabel>Aspect Ratio</FieldLabel>
                        <div className="flex gap-2">
                          {['16/9', '4/3', '1/1'].map(r => (
                            <Chip key={r} active={(link.metadata?.aspect_ratio || '16/9') === r}
                              onClick={() => updateMeta(link.id, 'aspect_ratio', r)}>{r}</Chip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Caption (optional)</FieldLabel>
                        <input type="text" value={link.metadata?.caption || ''} onChange={e => updateMeta(link.id, 'caption', e.target.value)}
                          className={INPUT} placeholder="Video description" />
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      EMAIL CAPTURE (enhanced) — + description
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'email_capture' && (
                    <>
                      <div>
                        <FieldLabel>Description (optional)</FieldLabel>
                        <input type="text" value={link.metadata?.description || ''}
                          onChange={e => updateMeta(link.id, 'description', e.target.value)}
                          className={INPUT} placeholder="Get weekly updates on..." />
                      </div>
                      <div>
                        <FieldLabel>Button Text</FieldLabel>
                        <input type="text" value={link.metadata?.button_text || ''} onChange={e => updateMeta(link.id, 'button_text', e.target.value)}
                          className={INPUT} placeholder="Subscribe" />
                      </div>
                      <div>
                        <FieldLabel>Input Placeholder</FieldLabel>
                        <input type="text" value={link.metadata?.placeholder || ''} onChange={e => updateMeta(link.id, 'placeholder', e.target.value)}
                          className={INPUT} placeholder="Enter your email" />
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      IMAGE block (enhanced) — + caption, radius, ratio
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'image' && (
                    <>
                      <div>
                        <FieldLabel>Image</FieldLabel>
                        <div className="flex gap-2">
                          <input type="url" value={link.thumbnail_url} onChange={e => updateLink(link.id, { thumbnail_url: e.target.value })}
                            className={`${INPUT} flex-1`} placeholder="https://..." />
                          <button type="button" onClick={() => setImagePicker({ open: true, linkId: link.id, field: 'thumbnail_url' })}
                            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30 rounded-lg text-[11px] font-semibold transition">
                            <ImagePlus className="w-3.5 h-3.5" /> Add Image
                          </button>
                        </div>
                        {link.thumbnail_url && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img src={link.thumbnail_url} alt="" className="w-full h-24 object-cover" />
                          </div>
                        )}
                      </div>
                      <div>
                        <FieldLabel>Link URL (optional)</FieldLabel>
                        <input type="url" value={link.metadata?.link_url || ''} onChange={e => updateMeta(link.id, 'link_url', e.target.value)}
                          className={INPUT} placeholder="https://..." />
                      </div>
                      <div>
                        <FieldLabel>Caption (optional)</FieldLabel>
                        <input type="text" value={link.metadata?.caption || ''} onChange={e => updateMeta(link.id, 'caption', e.target.value)}
                          className={INPUT} placeholder="Image description" />
                      </div>
                      <div>
                        <FieldLabel>Alt Text</FieldLabel>
                        <input type="text" value={link.metadata?.alt_text || ''} onChange={e => updateMeta(link.id, 'alt_text', e.target.value)}
                          className={INPUT} placeholder="Describe this image" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <FieldLabel>Corners</FieldLabel>
                          <div className="flex gap-1.5">
                            {[{ id: 'none', l: 'Sharp' }, { id: 'lg', l: 'Rounded' }, { id: 'full', l: 'Pill' }].map(o => (
                              <Chip key={o.id} active={(link.metadata?.border_radius || 'lg') === o.id}
                                onClick={() => updateMeta(link.id, 'border_radius', o.id)}>{o.l}</Chip>
                            ))}
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Aspect</FieldLabel>
                          <div className="flex gap-1.5">
                            {[{ id: 'auto', l: 'Auto' }, { id: '16/9', l: '16:9' }, { id: '1/1', l: '1:1' }, { id: '4/5', l: '4:5' }].map(o => (
                              <Chip key={o.id} active={(link.metadata?.aspect_ratio || 'auto') === o.id}
                                onClick={() => updateMeta(link.id, 'aspect_ratio', o.id)}>{o.l}</Chip>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      HTML / IFRAME EMBED block
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'html_embed' && (
                    <>
                      <div>
                        <FieldLabel>HTML / Iframe Code</FieldLabel>
                        <textarea rows={6} value={link.metadata?.html || ''} onChange={e => updateMeta(link.id, 'html', e.target.value)}
                          className={`${INPUT} resize-none font-mono text-xs`}
                          placeholder={'<iframe src="https://..." width="100%" height="300"></iframe>'} />
                        <p className="text-[10px] text-gray-400 mt-1">Paste any embed code — iframes, widgets, maps, forms, etc.</p>
                      </div>
                      <div>
                        <FieldLabel>Height (px)</FieldLabel>
                        <input type="number" value={link.metadata?.height || '300'} onChange={e => updateMeta(link.id, 'height', e.target.value)}
                          className={INPUT} placeholder="300" min="100" max="2000" />
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      SPOTIFY block
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'spotify' && (
                    <>
                      <div>
                        <FieldLabel>Spotify URL</FieldLabel>
                        <input type="url" value={link.metadata?.spotify_url || ''}
                          onChange={e => updateMeta(link.id, 'spotify_url', e.target.value)}
                          className={INPUT} placeholder="https://open.spotify.com/track/..." />
                        <p className="text-[10px] text-gray-400 mt-1">Paste a Spotify track, album, playlist, or artist URL</p>
                      </div>
                      <div>
                        <FieldLabel>Type</FieldLabel>
                        <div className="flex gap-1.5">
                          {['track', 'album', 'playlist', 'artist'].map(t => (
                            <Chip key={t} active={(link.metadata?.embed_type || 'track') === t}
                              onClick={() => updateMeta(link.id, 'embed_type', t)}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      SOCIAL ICONS block
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'social_icons' && (
                    <>
                      <div className="space-y-2">
                        {(link.metadata?.links ?? []).map((s: any, i: number) => {
                          const platform = SOCIAL_PLATFORMS.find(p => p.id === s.platform);
                          const Icon = platform?.icon || Globe;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <Icon className="w-3.5 h-3.5 text-gray-500" />
                              </div>
                              <input type="url" value={s.url}
                                onChange={e => updateSocialInBlock(link.id, i, 'url', e.target.value)}
                                className="flex-1 px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white placeholder-gray-400"
                                placeholder={platform?.placeholder || 'URL'} />
                              <button onClick={() => removeSocialFromBlock(link.id, i)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add platform buttons */}
                      {(() => {
                        const used = new Set((link.metadata?.links ?? []).map((s: any) => s.platform));
                        const avail = SOCIAL_PLATFORMS.filter(p => !used.has(p.id));
                        return avail.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {avail.map(p => (
                              <button key={p.id} onClick={() => addSocialToBlock(link.id, p.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-[11px] font-medium text-gray-600 dark:text-gray-400 transition">
                                <Plus className="w-3 h-3" /> {p.label}
                              </button>
                            ))}
                          </div>
                        ) : null;
                      })()}

                      <div className="flex items-center gap-4">
                        <div>
                          <FieldLabel>Shape</FieldLabel>
                          <div className="flex gap-1.5">
                            {['circle', 'square', 'pill'].map(s => (
                              <Chip key={s} active={(link.metadata?.style || 'circle') === s}
                                onClick={() => updateMeta(link.id, 'style', s)}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </Chip>
                            ))}
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Size</FieldLabel>
                          <div className="flex gap-1.5">
                            {['sm', 'md', 'lg'].map(s => (
                              <Chip key={s} active={(link.metadata?.size || 'md') === s}
                                onClick={() => updateMeta(link.id, 'size', s)}>
                                {s.toUpperCase()}
                              </Chip>
                            ))}
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Align</FieldLabel>
                          <AlignPicker value={link.metadata?.alignment || 'center'} onChange={v => updateMeta(link.id, 'alignment', v)} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      BANNER CTA block
                     ════════════════════════════════════════════════ */}
                  {link.link_type === 'banner' && (
                    <>
                      <div>
                        <FieldLabel>Description</FieldLabel>
                        <textarea rows={2} value={link.metadata?.description || ''}
                          onChange={e => updateMeta(link.id, 'description', e.target.value)}
                          className={`${INPUT} resize-none`} placeholder="Tell visitors what to do..." />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <FieldLabel>Button Text</FieldLabel>
                          <input type="text" value={link.metadata?.button_text || ''}
                            onChange={e => updateMeta(link.id, 'button_text', e.target.value)}
                            className={INPUT} placeholder="Learn More" />
                        </div>
                        <div>
                          <FieldLabel>Button URL</FieldLabel>
                          <input type="url" value={link.metadata?.button_url || ''}
                            onChange={e => updateMeta(link.id, 'button_url', e.target.value)}
                            className={INPUT} placeholder="https://..." />
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Background Color (optional)</FieldLabel>
                        <div className="flex items-center gap-2">
                          <input type="color" value={link.metadata?.bg_color || '#EC4899'}
                            onChange={e => updateMeta(link.id, 'bg_color', e.target.value)}
                            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5" />
                          <input type="text" value={link.metadata?.bg_color || ''}
                            onChange={e => updateMeta(link.id, 'bg_color', e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-pink-500"
                            placeholder="Leave blank for theme color" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Style variant — url, product ── */}
                  {(link.link_type === 'url' || link.link_type === 'product') && (
                    <div>
                      <FieldLabel>Card Style</FieldLabel>
                      <div className="flex gap-2">
                        {STYLE_VARIANTS.map(sv => (
                          <button key={sv.id} onClick={() => updateLink(link.id, { style_variant: sv.id })}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              link.style_variant === sv.id ? CHIP_ON : CHIP_OFF}`}>
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

      {/* ── Add block picker (categorized) ── */}
      {showAddPicker ? (
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-4">
          {BLOCK_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{cat.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {cat.types.map(t => (
                  <button key={t.id} onClick={() => addLink(t.id)}
                    className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-left transition group">
                    <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <t.icon className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{t.label}</p>
                      <p className="text-[10px] text-gray-400">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setShowAddPicker(false)}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2 transition">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setShowAddPicker(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-600 rounded-xl text-sm font-medium text-gray-500 hover:text-pink-600 transition">
          <Plus className="w-4 h-4" /> Add Block
        </button>
      )}

      {links.length > 0 && (
        <p className="text-xs text-gray-400 text-center">{links.length} block{links.length !== 1 ? 's' : ''}</p>
      )}

      {/* Image Picker Modal */}
      <ImagePickerModal
        open={imagePicker.open}
        onClose={() => setImagePicker(prev => ({ ...prev, open: false }))}
        onSelect={(url) => {
          const { linkId, field } = imagePicker;
          if (field === 'thumbnail_url') {
            updateLink(linkId, { thumbnail_url: url });
          } else if (field === 'meta_link_url') {
            updateMeta(linkId, 'link_url', url);
          }
        }}
        title="Select Image"
      />
    </div>
  );
}
