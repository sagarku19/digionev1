'use client';
// Site Page Builder v2 — section editor with settings panel + theme customizer.
// DB tables: sites (read), site_sections_config (read/write), site_main (read), site_design_tokens (read/write)

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Save, Eye, EyeOff, GripVertical, Plus, Trash2, Loader2,
  CheckCircle2, ExternalLink, ChevronUp, ChevronDown, Layout, X,
  Megaphone, MessageSquare, HelpCircle, ShieldCheck, Star, ImageIcon,
  Type, Code2, Mail, Pencil, LayoutGrid, Users, Timer, Play,
  UserCircle, Table2, CreditCard, Palette, Layers, Package,
} from 'lucide-react';
import Link from 'next/link';

// ─── Section type catalogue (all 18 types) ────────────────────
const SECTION_TYPES: Record<string, { label: string; icon: React.ElementType; desc: string }> = {
  hero_banner:        { label: 'Hero Banner',        icon: Layout,        desc: 'Top banner with headline & CTA' },
  featured_products:  { label: 'Featured Products',  icon: Star,          desc: 'Showcase your best products' },
  product_grid:       { label: 'Product Grid',       icon: LayoutGrid,    desc: 'Browse all products in a grid' },
  testimonials:       { label: 'Testimonials',       icon: MessageSquare, desc: 'Social proof from happy customers' },
  faq_accordion:      { label: 'FAQ',                icon: HelpCircle,    desc: 'Collapsible Q&A section' },
  email_capture:      { label: 'Email Capture',      icon: Mail,          desc: 'Newsletter opt-in with lead storage' },
  rich_text:          { label: 'Rich Text',          icon: Type,          desc: 'Custom HTML / formatted text block' },
  custom_html:        { label: 'Custom Code',        icon: Code2,         desc: 'Embed custom HTML/JS' },
  trust_badges:       { label: 'Trust Badges',       icon: ShieldCheck,   desc: 'Payment logos & guarantees' },
  social_proof:       { label: 'Social Proof',       icon: Users,         desc: 'Animated stats & numbers' },
  countdown_timer:    { label: 'Countdown Timer',    icon: Timer,         desc: 'Urgency timer for limited offers' },
  announcement_bar:   { label: 'Announcement Bar',   icon: Megaphone,     desc: 'Top banner for promotions' },
  sticky_cta:         { label: 'Sticky CTA',         icon: ChevronUp,     desc: 'Fixed mobile call-to-action' },
  video_showcase:     { label: 'Video Showcase',     icon: Play,          desc: 'YouTube / Vimeo embed' },
  image_gallery:      { label: 'Image Gallery',      icon: ImageIcon,     desc: 'Masonry grid of images' },
  about_creator:      { label: 'About Creator',      icon: UserCircle,    desc: 'Your bio & social links' },
  product_comparison: { label: 'Product Comparison', icon: Table2,        desc: 'Feature comparison table' },
  pricing_table:      { label: 'Pricing Table',      icon: CreditCard,    desc: 'Plans with feature lists' },
};

// ─── Section field definitions ────────────────────────────────
type SelectField = { key: string; label: string; type: 'select'; options: string[] };
type ItemsField  = { key: string; label: string; type: 'items'; fields: { key: string; label: string; multiline?: boolean }[] };
type SimpleField = { key: string; label: string; type: 'text' | 'textarea' | 'url' | 'number' | 'toggle' | 'color' | 'datetime-local' };
type FieldDef = SimpleField | SelectField | ItemsField;

const SECTION_FIELDS: Record<string, FieldDef[]> = {
  hero_banner: [
    { key: 'title',                label: 'Headline',             type: 'text' },
    { key: 'subtitle',             label: 'Subheadline',          type: 'textarea' },
    { key: 'primary_cta.text',     label: 'Button Text',          type: 'text' },
    { key: 'primary_cta.url',      label: 'Button URL',           type: 'url' },
    { key: 'background_image_url', label: 'Background Image URL', type: 'url' },
    { key: 'alignment',            label: 'Text Alignment',       type: 'select', options: ['left', 'center', 'right'] },
  ],
  featured_products: [
    { key: 'title', label: 'Section Title', type: 'text' },
  ],
  product_grid: [
    { key: 'title',      label: 'Section Title', type: 'text' },
    { key: 'columns',    label: 'Columns',       type: 'select', options: ['2', '3', '4'] },
    { key: 'max_items',  label: 'Max Items',     type: 'number' },
    { key: 'show_price', label: 'Show Price',    type: 'toggle' },
  ],
  testimonials: [
    { key: 'title', label: 'Section Title', type: 'text' },
    { key: 'testimonials', label: 'Testimonials', type: 'items', fields: [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role / Title' },
      { key: 'text', label: 'Quote', multiline: true },
    ]},
  ],
  faq_accordion: [
    { key: 'title', label: 'Section Title', type: 'text' },
    { key: 'faqs', label: 'FAQ Items', type: 'items', fields: [
      { key: 'question', label: 'Question' },
      { key: 'answer',   label: 'Answer', multiline: true },
    ]},
  ],
  email_capture: [
    { key: 'title',       label: 'Headline',          type: 'text' },
    { key: 'subtitle',    label: 'Subtext',           type: 'text' },
    { key: 'button_text', label: 'Button Text',       type: 'text' },
    { key: 'placeholder', label: 'Input Placeholder', type: 'text' },
  ],
  trust_badges: [
    { key: 'title', label: 'Section Title', type: 'text' },
  ],
  social_proof: [
    { key: 'title', label: 'Section Title', type: 'text' },
    { key: 'stats', label: 'Stats', type: 'items', fields: [
      { key: 'value',  label: 'Number (e.g. 10000)' },
      { key: 'suffix', label: 'Suffix (e.g. +, k)' },
      { key: 'label',  label: 'Label' },
    ]},
  ],
  countdown_timer: [
    { key: 'title',               label: 'Headline',                   type: 'text' },
    { key: 'end_time',            label: 'End Date/Time',              type: 'datetime-local' },
    { key: 'expire_action',       label: 'After Expiry',               type: 'select', options: ['hide', 'message', 'redirect'] },
    { key: 'expire_message',      label: 'Expiry Message',             type: 'text' },
    { key: 'expire_redirect_url', label: 'Redirect URL (if redirect)', type: 'url' },
  ],
  announcement_bar: [
    { key: 'text',     label: 'Announcement Text',   type: 'text' },
    { key: 'link_url', label: 'Link URL (optional)', type: 'url' },
    { key: 'bg_color', label: 'Background Color',    type: 'color' },
  ],
  sticky_cta: [
    { key: 'text',             label: 'CTA Text',                  type: 'text' },
    { key: 'button_text',      label: 'Button Text',               type: 'text' },
    { key: 'url',              label: 'Button URL',                type: 'url' },
    { key: 'scroll_threshold', label: 'Show after scrolling (px)', type: 'number' },
  ],
  video_showcase: [
    { key: 'title',         label: 'Section Title',            type: 'text' },
    { key: 'video_url',     label: 'YouTube / Vimeo URL',      type: 'url' },
    { key: 'thumbnail_url', label: 'Thumbnail URL (optional)', type: 'url' },
  ],
  image_gallery: [
    { key: 'title', label: 'Section Title', type: 'text' },
    { key: 'images', label: 'Images', type: 'items', fields: [
      { key: 'url',     label: 'Image URL' },
      { key: 'alt',     label: 'Alt Text' },
      { key: 'caption', label: 'Caption (optional)' },
    ]},
  ],
  rich_text: [
    { key: 'content', label: 'HTML Content', type: 'textarea' },
  ],
  custom_html: [
    { key: 'html', label: 'Custom HTML / Embed Code', type: 'textarea' },
  ],
  about_creator: [
    { key: 'name',       label: 'Your Name',     type: 'text' },
    { key: 'bio',        label: 'Bio',           type: 'textarea' },
    { key: 'avatar_url', label: 'Avatar URL',    type: 'url' },
    { key: 'twitter',    label: 'Twitter URL',   type: 'url' },
    { key: 'instagram',  label: 'Instagram URL', type: 'url' },
    { key: 'youtube',    label: 'YouTube URL',   type: 'url' },
    { key: 'linkedin',   label: 'LinkedIn URL',  type: 'url' },
  ],
  product_comparison: [
    { key: 'title', label: 'Section Title', type: 'text' },
  ],
  pricing_table: [
    { key: 'title', label: 'Section Title', type: 'text' },
  ],
};

// ─── Theme fields ─────────────────────────────────────────────
const THEME_FIELDS = [
  { key: 'primary',    label: 'Primary / Brand Color',   default: '#6366F1' },
  { key: 'secondary',  label: 'Secondary Color',         default: '#8B5CF6' },
  { key: 'background', label: 'Page Background',         default: '#FFFFFF' },
  { key: 'surface',    label: 'Card / Surface',          default: '#F8FAFC' },
  { key: 'text',       label: 'Body Text',               default: '#0F172A' },
  { key: 'muted',      label: 'Muted / Secondary Text',  default: '#64748B' },
];

// ─── Types ────────────────────────────────────────────────────
type Section = {
  id: string;
  type: string;
  sort_order: number;
  is_visible: boolean;
  settings: Record<string, unknown>;
};

// ─── Nested key helpers ───────────────────────────────────────
function getNestedValue(obj: any, path: string): unknown {
  return path.split('.').reduce((o: any, k) => o?.[k], obj);
}
function setNestedValue(obj: any, path: string, value: unknown): any {
  const keys = path.split('.');
  const result = { ...obj };
  let cur: any = result;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = { ...(cur[keys[i]] ?? {}) };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return result;
}

const PI = 'w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400 transition';

// ─── Items Editor ─────────────────────────────────────────────
function ItemsEditor({ items, fieldDefs, onChange }: {
  items: any[];
  fieldDefs: { key: string; label: string; multiline?: boolean }[];
  onChange: (items: any[]) => void;
}) {
  const add    = () => onChange([...items, {}]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, key: string, val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Item {i + 1}</span>
            <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-600 transition">Remove</button>
          </div>
          {fieldDefs.map(f => f.multiline ? (
            <textarea
              key={f.key}
              value={item[f.key] ?? ''}
              onChange={e => update(i, f.key, e.target.value)}
              placeholder={f.label}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
            />
          ) : (
            <input
              key={f.key}
              type="text"
              value={item[f.key] ?? ''}
              onChange={e => update(i, f.key, e.target.value)}
              placeholder={f.label}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
            />
          ))}
        </div>
      ))}
      <button
        onClick={add}
        className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl text-xs font-semibold transition"
      >
        <Plus className="w-3.5 h-3.5" /> Add item
      </button>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────
function SettingsPanel({ section, onUpdate, onClose }: {
  section: Section;
  onUpdate: (id: string, settings: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const fields = SECTION_FIELDS[section.type] ?? [];
  const [local, setLocal] = useState<Record<string, unknown>>(section.settings ?? {});
  const meta = SECTION_TYPES[section.type] ?? { label: section.type, icon: Layout };

  const get = (key: string) => getNestedValue(local, key);
  const set = (key: string, val: unknown) => setLocal(prev => setNestedValue(prev, key, val));

  const handleApply = () => { onUpdate(section.id, local); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 cursor-pointer" onClick={onClose} />
      <div className="w-full max-w-sm bg-white dark:bg-[#0D0D1F] border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            {React.createElement(meta.icon, { className: 'w-4 h-4 text-indigo-500' })}
            <h2 className="font-bold text-gray-900 dark:text-white">{meta.label}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {fields.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No configurable settings for this section type.</p>
          )}

          {fields.map(field => {
            if (field.type === 'items') {
              return (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{field.label}</label>
                  <ItemsEditor
                    items={(get(field.key) as any[]) ?? []}
                    fieldDefs={field.fields}
                    onChange={val => set(field.key, val)}
                  />
                </div>
              );
            }

            if (field.type === 'select') {
              return (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{field.label}</label>
                  <select value={(get(field.key) as string) ?? ''} onChange={e => set(field.key, e.target.value)} className={PI}>
                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
            }

            if (field.type === 'toggle') {
              const checked = !!(get(field.key));
              return (
                <div key={field.key} className="flex items-center justify-between py-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                  <button
                    type="button"
                    onClick={() => set(field.key, !checked)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              );
            }

            if (field.type === 'textarea') {
              return (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{field.label}</label>
                  <textarea
                    value={(get(field.key) as string) ?? ''}
                    onChange={e => set(field.key, e.target.value)}
                    rows={field.key === 'html' || field.key === 'content' ? 8 : 3}
                    className={`${PI} resize-none font-mono text-xs`}
                  />
                </div>
              );
            }

            if (field.type === 'color') {
              const val = (get(field.key) as string) ?? '#6366f1';
              return (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{field.label}</label>
                  <div className="flex items-center gap-2.5">
                    <input type="color" value={val} onChange={e => set(field.key, e.target.value)} className="w-11 h-11 rounded-xl cursor-pointer border border-gray-200 dark:border-gray-700 p-0.5 bg-white dark:bg-gray-900" />
                    <input type="text" value={val} onChange={e => set(field.key, e.target.value)} className={`${PI} flex-1`} placeholder="#6366f1" />
                  </div>
                </div>
              );
            }

            // text | url | number | datetime-local
            return (
              <div key={field.key}>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{field.label}</label>
                <input
                  type={field.type === 'number' ? 'number' : field.type}
                  value={(get(field.key) as string | number) ?? ''}
                  onChange={e => set(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                  className={PI}
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Cancel
          </button>
          <button onClick={handleApply} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-500/20">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section Row ──────────────────────────────────────────────
function SectionRow({ section, index, total, onMove, onToggle, onDelete, onEdit }: {
  section: Section; index: number; total: number;
  onMove: (from: number, to: number) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (section: Section) => void;
}) {
  const meta = SECTION_TYPES[section.type] ?? { label: section.type, icon: Layout, desc: '' };
  const Icon = meta.icon;
  const hasSettings = (SECTION_FIELDS[section.type] ?? []).length > 0;

  return (
    <div className={`group flex items-center gap-3 bg-white dark:bg-[#0A0A1A] border rounded-xl px-4 py-3.5 transition-all ${
      section.is_visible
        ? 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-800'
        : 'border-dashed border-gray-200 dark:border-gray-800 opacity-60'
    }`}>
      {/* Order controls */}
      <div className="flex flex-col items-center gap-0.5 text-gray-300 dark:text-gray-700 shrink-0">
        <button onClick={() => onMove(index, index - 1)} disabled={index === 0} className="p-0.5 rounded hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <GripVertical className="w-4 h-4" />
        <button onClick={() => onMove(index, index + 1)} disabled={index === total - 1} className="p-0.5 rounded hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{meta.label}</p>
        <p className="text-xs text-gray-400 truncate">{meta.desc}</p>
      </div>

      {/* Badge */}
      <span className={`hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
        section.is_visible
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
      }`}>
        {section.is_visible ? 'Visible' : 'Hidden'}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
        {hasSettings && (
          <button
            onClick={() => onEdit(section)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
            title="Edit settings"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => onToggle(section.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition" title={section.is_visible ? 'Hide' : 'Show'}>
          {section.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button onClick={() => onDelete(section.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Add Section Panel ────────────────────────────────────────
function AddSectionPanel({ onAdd, onClose }: { onAdd: (type: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const entries = Object.entries(SECTION_TYPES).filter(([, m]) =>
    search === '' || m.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#0D0E1A] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h3 className="font-bold text-gray-900 dark:text-white">Add a section</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition text-xl font-light leading-none">×</button>
        </div>
        <div className="px-4 pt-3 shrink-0">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search sections…"
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {entries.map(([type, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={type}
                onClick={() => { onAdd(type); onClose(); }}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 truncate">{meta.label}</p>
                  <p className="text-xs text-gray-400 truncate">{meta.desc}</p>
                </div>
              </button>
            );
          })}
          {entries.length === 0 && (
            <p className="col-span-2 text-center text-sm text-gray-400 py-8">No sections match "{search}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Theme Tab ────────────────────────────────────────────────
function ThemeTab({ siteId }: { siteId: string }) {
  const supabase = createClient();
  const [palette, setPalette] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('site_design_tokens')
      .select('color_palette')
      .eq('site_id', siteId)
      .single()
      .then(({ data }) => {
        if (data?.color_palette) setPalette(data.color_palette as Record<string, string>);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from('site_design_tokens')
      .upsert({ site_id: siteId, color_palette: palette }, { onConflict: 'site_id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading theme…</div>;

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl flex items-start gap-3">
        <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          Colors are applied as CSS variables across your entire storefront. Save and refresh to see changes.
        </p>
      </div>

      {THEME_FIELDS.map(f => {
        const val = palette[f.key] ?? f.default;
        return (
          <div key={f.key} className="flex items-center gap-4 p-4 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl">
            <input
              type="color"
              value={val}
              onChange={e => setPalette(prev => ({ ...prev, [f.key]: e.target.value }))}
              className="w-12 h-12 rounded-xl cursor-pointer border border-gray-200 dark:border-gray-700 p-0.5 bg-white dark:bg-gray-900 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{f.label}</p>
              <input
                type="text"
                value={val}
                onChange={e => setPalette(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="text-xs text-gray-400 bg-transparent border-none outline-none w-full mt-0.5 font-mono"
              />
            </div>
            <div className="w-8 h-8 rounded-lg shrink-0 border border-gray-200 dark:border-gray-700 shadow-inner" style={{ backgroundColor: val }} />
          </div>
        );
      })}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
        {saving ? 'Saving…' : saved ? 'Theme saved!' : 'Save Theme'}
      </button>
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────────
function ProductsTab({ siteId }: { siteId: string }) {
  const supabase = createClient();
  const [products, setProducts] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: userRow } = await supabase.from('users').select('id').eq('auth_provider_id', user.id).single();
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', userRow?.id).single();
      if (!profile) { setLoading(false); return; }

      const [{ data: prods }, { data: asgn }] = await Promise.all([
        supabase.from('products').select('id, name, price, thumbnail_url, is_published').eq('creator_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('site_product_assignments').select('product_id').eq('site_id', siteId),
      ]);

      setProducts(prods ?? []);
      setAssigned(new Set((asgn ?? []).map((a: any) => a.product_id)));
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const toggle = (id: string) => setAssigned(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('site_product_assignments').delete().eq('site_id', siteId);
    if (assigned.size > 0) {
      const rows = Array.from(assigned).map((product_id, i) => ({ site_id: siteId, product_id, sort_order: i + 1 }));
      await supabase.from('site_product_assignments').insert(rows);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading products…</div>;

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl flex items-start gap-3">
        <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          Select which products appear on this storefront. They show in Featured Products and Product Grid sections.
        </p>
      </div>

      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center">
          <Package className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm font-medium text-gray-500">No products yet</p>
          <p className="text-xs text-gray-400 mt-1">Create products in the Products section first.</p>
        </div>
      )}

      <div className="space-y-2">
        {products.map(product => {
          const isSelected = assigned.has(product.id);
          return (
            <div
              key={product.id}
              onClick={() => toggle(product.id)}
              className={`flex items-center gap-4 p-4 bg-white dark:bg-[#0A0A1A] border rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-500/5'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {product.thumbnail_url ? (
                <img src={product.thumbnail_url} alt={product.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  ₹{product.price?.toLocaleString('en-IN')} · {product.is_published ? 'Published' : 'Draft'}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
              }`}>
                {isSelected && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {products.length > 0 && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : saved ? 'Saved!' : `Save (${assigned.size} selected)`}
        </button>
      )}
    </div>
  );
}

// ─── Main Builder Page ────────────────────────────────────────
export default function SiteBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = (params.id ?? params.siteId) as string;
  const supabase = createClient();

  const [sections, setSections] = useState<Section[]>([]);
  const [siteName, setSiteName] = useState('');
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [siteType, setSiteType] = useState<string>('main');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [activeTab, setActiveTab] = useState<'sections' | 'theme' | 'products'>('sections');

  useEffect(() => {
    const load = async () => {
      const [{ data: site }, { data: config }, { data: sm }] = await Promise.all([
        supabase.from('sites').select('slug, child_slug, site_type, creator_id').eq('id', siteId).single(),
        supabase.from('site_sections_config').select('sections').eq('site_id', siteId).single(),
        supabase.from('site_main').select('title').eq('site_id', siteId).maybeSingle(),
      ]);
      setSiteName(sm?.title ?? site?.slug ?? 'Untitled');
      setSiteType(site?.site_type ?? 'main');
      // Build preview URL based on site type
      if (site?.site_type === 'main' && site.slug) {
        setSiteSlug(`p/${site.slug}`);
      } else if (site?.creator_id && site?.site_type) {
        const { dbTypeToUrlSegment } = await import('@/lib/site-urls');
        const seg = dbTypeToUrlSegment(site.site_type);
        setSiteSlug(seg ? `${site.creator_id}/${seg}` : null);
      } else {
        setSiteSlug(site?.slug ?? site?.child_slug ?? null);
      }
      const raw = config?.sections as Section[] | null;
      if (raw) setSections([...raw].sort((a, b) => a.sort_order - b.sort_order));
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const handleMove = useCallback((from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    setSections(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((s, i) => ({ ...s, sort_order: i + 1 }));
    });
  }, [sections.length]);

  const handleToggle = useCallback((id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, is_visible: !s.is_visible } : s));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSections(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, sort_order: i + 1 })));
  }, []);

  const handleAdd = useCallback((type: string) => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      type,
      sort_order: sections.length + 1,
      is_visible: true,
      settings: {},
    };
    setSections(prev => [...prev, newSection]);
  }, [sections.length]);

  const handleUpdateSettings = useCallback((id: string, settings: Record<string, unknown>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, settings } : s));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from('site_sections_config')
      .update({ sections: sections as unknown as import('@/types/database.types').Json })
      .eq('site_id', siteId);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm text-gray-500">Loading builder…</span>
      </div>
    );
  }

  const visibleCount = sections.filter(s => s.is_visible).length;

  return (
    <div className="pb-24 pt-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const typeSlug = siteType === 'single' ? 'singlepage' : siteType;
              router.push(`/dashboard/sites/edit/${typeSlug}/${siteId}`);
            }}
            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Page Builder</p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{siteName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {siteSlug && (
            <Link
              href={`/${siteSlug}`}
              target="_blank"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Preview
            </Link>
          )}
          {activeTab === 'sections' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          )}
          {activeTab !== 'sections' && saved && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl mb-5">
        <button
          onClick={() => setActiveTab('sections')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'sections'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          Sections
          {sections.length > 0 && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-bold">
              {visibleCount}/{sections.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'theme'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Palette className="w-4 h-4" />
          Theme
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'products'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Package className="w-4 h-4" />
          Products
        </button>
      </div>

      {/* Theme Tab */}
      {activeTab === 'theme' && <ThemeTab siteId={siteId} />}

      {/* Products Tab */}
      {activeTab === 'products' && <ProductsTab siteId={siteId} />}

      {/* Sections Tab */}
      {activeTab === 'sections' && (
        <>
          <div className="mb-4 p-3.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl flex items-start gap-3">
            <Layout className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              Hover a section and click <strong>✏ Edit</strong> to configure content. Reorder with arrows. Click <strong>Save</strong> when done.
            </p>
          </div>

          <div className="space-y-2.5 mb-5">
            {sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center">
                <Layout className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
                <p className="text-sm font-medium text-gray-500">No sections yet</p>
                <p className="text-xs text-gray-400 mt-1">Add your first section below to start building.</p>
              </div>
            ) : (
              sections.map((section, index) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  index={index}
                  total={sections.length}
                  onMove={handleMove}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={setEditingSection}
                />
              ))
            )}
          </div>

          <button
            onClick={() => setShowAddPanel(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 font-semibold text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </>
      )}

      {/* Modals */}
      {showAddPanel && (
        <AddSectionPanel onAdd={handleAdd} onClose={() => setShowAddPanel(false)} />
      )}
      {editingSection && (
        <SettingsPanel
          section={editingSection}
          onUpdate={handleUpdateSettings}
          onClose={() => setEditingSection(null)}
        />
      )}
    </div>
  );
}
