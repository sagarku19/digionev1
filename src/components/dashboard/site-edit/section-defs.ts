// Shared section type catalogue, field definitions, theme fields, and helpers.
// Used by SectionManager, ThemeEditor, and the builder page.

import {
  Layout, Star, LayoutGrid, MessageSquare, HelpCircle, Mail, Type, Code2,
  ShieldCheck, Users, Timer, Megaphone, ChevronUp, Play, ImageIcon,
  UserCircle, Table2, CreditCard,
} from 'lucide-react';
import type React from 'react';

// ─── Section type catalogue (all 18 types) ────────────────────
export const SECTION_TYPES: Record<string, { label: string; icon: React.ElementType; desc: string }> = {
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
export type SelectField = { key: string; label: string; type: 'select'; options: string[] };
export type ItemsField  = { key: string; label: string; type: 'items'; fields: { key: string; label: string; multiline?: boolean }[] };
export type SimpleField = { key: string; label: string; type: 'text' | 'textarea' | 'url' | 'number' | 'toggle' | 'color' | 'datetime-local' };
export type FieldDef = SimpleField | SelectField | ItemsField;

export const SECTION_FIELDS: Record<string, FieldDef[]> = {
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
export const THEME_FIELDS = [
  { key: 'primary',    label: 'Primary / Brand Color',   default: '#6366F1' },
  { key: 'secondary',  label: 'Secondary Color',         default: '#8B5CF6' },
  { key: 'background', label: 'Page Background',         default: '#FFFFFF' },
  { key: 'surface',    label: 'Card / Surface',          default: '#F8FAFC' },
  { key: 'text',       label: 'Body Text',               default: '#0F172A' },
  { key: 'muted',      label: 'Muted / Secondary Text',  default: '#64748B' },
];

// ─── Types ────────────────────────────────────────────────────
export type Section = {
  id: string;
  type: string;
  sort_order: number;
  is_visible: boolean;
  settings: Record<string, unknown>;
};

// ─── Nested key helpers ───────────────────────────────────────
export function getNestedValue(obj: any, path: string): unknown {
  return path.split('.').reduce((o: any, k) => o?.[k], obj);
}

export function setNestedValue(obj: any, path: string, value: unknown): any {
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

// Shared input class
export const PI = 'w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400 transition';
