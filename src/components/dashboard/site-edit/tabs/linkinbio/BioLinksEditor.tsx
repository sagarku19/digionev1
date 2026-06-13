'use client';
// BioLinksEditor V2 — block-based editor for Link in Bio.
// Block-type editors live in ./blockEditors (one file per type) and are wired
// through ./blockEditors/registry. This file owns the block LIST: ordering,
// add/remove/duplicate, visibility, and the per-row chrome.

import React, { useState, useRef, useEffect } from 'react';
import {
  GripVertical, Eye, EyeOff, Trash2, ChevronDown, ChevronRight,
  Plus, Link as LinkIcon, Package, Type, Minus, Image, Code,
  Share2, Megaphone, Heading1, FileText, ArrowUpDown, ClipboardList,
  MoreVertical, Copy, Star,
} from 'lucide-react';
import ImagePickerModal from '@/components/dashboard/ImagePickerModal';
import { INPUT, FieldLabel, CHIP_ON, CHIP_OFF, STYLE_VARIANTS } from './blockEditors/_shared';
import { BlockBody } from './blockEditors/registry';
import type { BioLink, ProductLite } from './blockEditors/types';

export type { BioLink };

// ─── Block type categories ─────────────────────────────────
const BLOCK_CATEGORIES = [
  {
    label: 'Content',
    types: [
      { id: 'url', label: 'Link', icon: LinkIcon, desc: 'External URL' },
      { id: 'header', label: 'Header', icon: Heading1, desc: 'Title + subtitle' },
      { id: 'text', label: 'Text', icon: FileText, desc: 'Paragraph block' },
      { id: 'heading', label: 'Section Title', icon: Type, desc: 'Simple label' },
      { id: 'divider', label: 'Divider', icon: Minus, desc: 'Visual separator' },
      { id: 'space', label: 'Space', icon: ArrowUpDown, desc: 'Empty vertical gap' },
    ],
  },
  {
    label: 'Commerce & Social',
    types: [
      { id: 'product', label: 'Product', icon: Package, desc: 'Sell a product' },
      { id: 'lead_form', label: 'Lead Form', icon: ClipboardList, desc: 'Collect visitor info' },
      { id: 'social_icons', label: 'Social Icons', icon: Share2, desc: 'Icon row' },
      { id: 'banner', label: 'Banner CTA', icon: Megaphone, desc: 'Call-to-action card' },
    ],
  },
  {
    label: 'Media & Embeds',
    types: [
      { id: 'image', label: 'Image', icon: Image, desc: 'Full-width image' },
      { id: 'html_embed', label: 'HTML / Iframe', icon: Code, desc: 'Custom embed code' },
    ],
  },

];

// Flat list for lookups
const ALL_TYPES = BLOCK_CATEGORIES.flatMap(c => c.types);

// ─── No-title block types ─────────────────────────────
const NO_TITLE_TYPES = ['divider', 'space', 'html_embed', 'social_icons', 'text', 'product'];

// ─── Main component ──────────────────────────────────────
export default function BioLinksEditor({
  links,
  onChange,
  products,
}: {
  links: BioLink[];
  onChange: (links: BioLink[]) => void;
  products?: ProductLite[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [imagePicker, setImagePicker] = useState<{ open: boolean; linkId: string; field: string }>({ open: false, linkId: '', field: '' });
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menuOpenId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpenId(null);
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpenId]);

  const updateLink = (id: string, updates: Partial<BioLink>) => {
    onChange(links.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const updateMeta = (id: string, key: string, value: unknown) => {
    const link = links.find(l => l.id === id);
    if (!link) return;
    updateLink(id, { metadata: { ...link.metadata, [key]: value } });
  };

  const removeLink = (id: string) => {
    onChange(links.filter(l => l.id !== id).map((l, i) => ({ ...l, sort_order: i + 1 })));
    if (expandedId === id) setExpandedId(null);
  };

  const duplicateLink = (id: string) => {
    const source = links.find(l => l.id === id);
    if (!source) return;
    const idx = links.findIndex(l => l.id === id);
    const clone: BioLink = {
      ...source,
      id: crypto.randomUUID(),
      title: source.title ? `${source.title} (copy)` : '',
      metadata: source.metadata ? JSON.parse(JSON.stringify(source.metadata)) : {},
    };
    const next = [...links];
    next.splice(idx + 1, 0, clone);
    onChange(next.map((l, i) => ({ ...l, sort_order: i + 1 })));
    setExpandedId(clone.id);
  };

  const addLink = (type: string) => {
    const defaults: Record<string, any> = {
      social_icons: { links: [], style: 'circle', size: 'md', alignment: 'center' },
      header: { subtitle: '', alignment: 'center', size: 'xl', show_divider: false },
      text: { content: '', alignment: 'left', size: 'base' },
      html_embed: { html: '' },
      spotify: { spotify_url: '', embed_type: 'track' },
      banner: { description: '', button_text: 'Learn More', button_url: '', bg_color: '' },
      space: { height: 'md' },
      lead_form: {
        fields: [
          { type: 'name', label: 'Full Name', required: false, placeholder: 'Your name' },
          { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
        ],
        button_text: 'Submit',
        description: '',
        success_message: 'Thanks! We\'ll be in touch.',
      },
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
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[var(--border)] rounded-2xl text-center">
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
              className={`relative bg-[var(--bg-primary)] border-2 rounded-[1.25rem] transition-all duration-300 ${isExpanded ? 'border-pink-200 dark:border-pink-500/30' : 'border-[var(--border)]/60'
                } ${dragIdx === idx ? 'opacity-50 scale-95 shadow-md' : 'shadow-sm hover:shadow-md'}`}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (dragIdx !== null) moveLink(dragIdx, idx); setDragIdx(null); }}
              onDragEnd={() => setDragIdx(null)}
            >
              {/* Row header */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab shrink-0" />
                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
                  <TypeIcon className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <button onClick={() => setExpandedId(isExpanded ? null : link.id)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {link.title || link.metadata?.content?.slice(0, 40) || typeInfo?.label || 'Untitled'}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{typeInfo?.label}</p>
                </button>
                <button onClick={() => updateLink(link.id, { is_visible: !link.is_visible })}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                  {link.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <div className="relative" ref={menuOpenId === link.id ? menuRef : undefined}>
                  <button onClick={() => setMenuOpenId(menuOpenId === link.id ? null : link.id)}
                    aria-label="Block options" aria-haspopup="true" aria-expanded={menuOpenId === link.id}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  {menuOpenId === link.id && (
                    <div role="menu" className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-lg z-50 py-1 overflow-hidden"
                      onDragStart={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                      <button role="menuitem"
                        onClick={() => { duplicateLink(link.id); setMenuOpenId(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)] transition"
                      >
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                      </button>
                      <button role="menuitem"
                        onClick={() => { removeLink(link.id); setMenuOpenId(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => setExpandedId(isExpanded ? null : link.id)} className="p-1.5 text-gray-400">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="px-4 pb-5 pt-2 border-t border-[var(--border)]/60 space-y-4">

                  {/* ── Title — most types ── */}
                  {!NO_TITLE_TYPES.includes(link.link_type) && link.link_type !== 'header' && (
                    <div>
                      <FieldLabel>Title</FieldLabel>
                      <input type="text" value={link.title} onChange={e => updateLink(link.id, { title: e.target.value })}
                        className={INPUT} placeholder={link.link_type === 'heading' ? 'Section heading' : 'Block title'} />
                    </div>
                  )}

                  {/* ── Type-specific body ── */}
                  <BlockBody
                    link={link}
                    update={u => updateLink(link.id, u)}
                    updateMeta={(k, v) => updateMeta(link.id, k, v)}
                    openImagePicker={field => setImagePicker({ open: true, linkId: link.id, field })}
                    products={products}
                  />

                  {/* ── Style variant — url, product ── */}
                  {(link.link_type === 'url' || link.link_type === 'product') && (
                    <div>
                      <FieldLabel>Card Style</FieldLabel>
                      <div className="flex gap-2">
                        {STYLE_VARIANTS.map(sv => (
                          <button key={sv.id} onClick={() => updateLink(link.id, { style_variant: sv.id })}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${link.style_variant === sv.id ? CHIP_ON : CHIP_OFF}`}>
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
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
          {BLOCK_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{cat.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {cat.types.map(t => (
                  <button key={t.id} onClick={() => addLink(t.id)}
                    className="flex items-center gap-2.5 p-3 bg-[var(--bg-secondary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] rounded-xl text-left transition group">
                    <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <t.icon className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{t.label}</p>
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
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 dark:border-[var(--border)] hover:border-pink-400 dark:hover:border-pink-600 rounded-xl text-sm font-medium text-gray-500 hover:text-pink-600 transition">
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
