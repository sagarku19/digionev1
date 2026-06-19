'use client';
// Edit page: Link in Bio — custom split-screen editor.
// Mini sidebar + Left panel (header + tabs + editor) + Right panel (preview).

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import BioProfileEditor, { type BioProfileData, type SocialLink } from '@/src/components/dashboard/site-edit/tabs/linkinbio/BioProfileEditor';
import { type BioLink } from '@/src/components/dashboard/site-edit/tabs/linkinbio/BioLinksEditor';
import BioAppearanceEditor, { type BioAppearanceData } from '@/src/components/dashboard/site-edit/tabs/linkinbio/BioAppearanceEditor';
import BioTemplates from '@/src/components/dashboard/site-edit/tabs/linkinbio/BioTemplates';
import BioSetupWizard from '@/src/components/dashboard/site-edit/tabs/linkinbio/BioSetupWizard';
import {
  Link2, Globe2, Search,
  Loader2, CheckCircle2, XCircle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLinkInBioSiteQuery } from '@/hooks/useLinkInBioSite';
import ImagePickerModal from '@/components/dashboard/ImagePickerModal';
import LinkInBioShell from '@/components/dashboard/site-edit/editor/LinkInBioShell';
import ProfileCard from '@/components/dashboard/site-edit/editor/ProfileCard';
import SectionList from '@/components/dashboard/site-edit/shell/SectionList';
import { moveItem } from '@/components/dashboard/site-edit/shell/reorder';
import { linkinbioRegistry } from '@/components/dashboard/site-edit/tabs/linkinbio/sectionRegistry';
import { BlockBody } from '@/components/dashboard/site-edit/tabs/linkinbio/blockEditors/registry';

// ─── Templates ──────────────────────────────────────────────────────────
type BioTemplateBlock = {
  link_type: string;
  title?: string;
  description?: string;
  url?: string;
  thumbnail_url?: string;
  icon_type?: string;
  style_variant?: string;
  metadata?: any;
};

type BioTemplate = {
  name: string;
  description: string;
  tag?: string;
  category: 'starter' | 'creative' | 'business' | 'social';
  preview: { bg: string; accent: string; text: string; card: string };
  palette: Record<string, string>;
  layoutStyle: string;
  buttonStyle: string;
  backgroundType: string;
  backgroundValue: string;
  fontFamily?: string;
  cardStyle?: string;
  animation?: string;
  borderRadius?: string;
  spacing?: string;
  profileShape?: 'circular' | 'rounded' | 'square';
  blocks: BioTemplateBlock[];
};

const TEMPLATES: BioTemplate[] = [
  // ── Starter ──
  {
    name: 'Minimal',
    description: 'Clean links, nothing else. Just the essentials.',
    category: 'starter',
    preview: { bg: '#FFFFFF', accent: '#000000', text: '#000000', card: '#F5F5F5' },
    palette: { primary: '#000000', text: '#000000', surface: '#F5F5F5', muted: '#525252', background: '#FFFFFF' },
    layoutStyle: 'classic', buttonStyle: 'sharp',
    backgroundType: 'solid', backgroundValue: '#FFFFFF',
    fontFamily: 'space-grotesk', cardStyle: 'bordered', borderRadius: 'none', spacing: 'compact',
    blocks: [
      { link_type: 'url', title: 'Link One', url: '' },
      { link_type: 'url', title: 'Link Two', url: '' },
      { link_type: 'url', title: 'Link Three', url: '' },
      { link_type: 'divider' },
      { link_type: 'text', metadata: { content: 'Simple. Clean. Effective.', alignment: 'center', size: 'sm' } },
    ],
  },
  {
    name: 'Classic Bio',
    description: 'Profile header with social links and a few URLs.',
    category: 'starter',
    preview: { bg: '#FFFFFF', accent: '#0F172A', text: '#0F172A', card: '#F8FAFC' },
    palette: { primary: '#0F172A', text: '#0F172A', surface: '#F8FAFC', muted: '#64748B', background: '#FFFFFF' },
    layoutStyle: 'classic', buttonStyle: 'rounded',
    backgroundType: 'solid', backgroundValue: '#FFFFFF',
    fontFamily: 'inter', cardStyle: 'solid', borderRadius: 'md', spacing: 'default',
    blocks: [
      { link_type: 'header', title: 'Your Name', metadata: { subtitle: 'A short bio about you', alignment: 'center', size: 'xl' } },
      { link_type: 'url', title: 'My Website', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Latest Project', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Get In Touch', url: '', icon_type: 'external' },
      { link_type: 'social_icons', metadata: { links: [{ platform: 'twitter', url: '' }, { platform: 'instagram', url: '' }, { platform: 'linkedin', url: '' }], style: 'circle', size: 'md', alignment: 'center' } },
    ],
  },
  // ── Creative ──
  {
    name: 'Creator Hub', tag: 'POPULAR',
    description: 'For YouTubers, streamers & creators. Featured links + newsletter.',
    category: 'creative',
    preview: { bg: '#09090B', accent: '#F97316', text: '#FAFAFA', card: '#18181B' },
    palette: { primary: '#F97316', text: '#FAFAFA', surface: '#18181B', muted: '#A1A1AA', background: '#09090B' },
    layoutStyle: 'classic', buttonStyle: 'rounded',
    backgroundType: 'solid', backgroundValue: '#09090B',
    fontFamily: 'dm-sans', cardStyle: 'solid', animation: 'slide-up', borderRadius: 'md',
    blocks: [
      { link_type: 'header', title: 'Your Name', metadata: { subtitle: 'Creator \u2022 Designer \u2022 Dreamer', alignment: 'center', size: 'xl' } },
      { link_type: 'social_icons', metadata: { links: [{ platform: 'youtube', url: '' }, { platform: 'instagram', url: '' }, { platform: 'twitter', url: '' }, { platform: 'tiktok', url: '' }], style: 'circle', size: 'md', alignment: 'center' } },
      { link_type: 'heading', title: 'Featured', metadata: { alignment: 'left', size: 'lg', show_divider: true } },
      { link_type: 'url', title: 'Watch My Latest Video', url: '', icon_type: 'external', style_variant: 'featured' },
      { link_type: 'url', title: 'My Online Course', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Support My Work', url: '', icon_type: 'external' },
      { link_type: 'divider' },
      { link_type: 'lead_form', title: 'Join My Newsletter', metadata: { description: 'Get weekly tips straight to your inbox', button_text: 'Subscribe', fields: [{ type: 'name', label: 'Name', required: false, placeholder: 'Your name' }, { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' }] } },
    ],
  },
  {
    name: 'Musician',
    description: 'Tour banner, streaming links & social icons.',
    category: 'creative',
    preview: { bg: '#1a1a2e', accent: '#e94560', text: '#eaeaea', card: '#16213e' },
    palette: { primary: '#e94560', text: '#eaeaea', surface: '#16213e', muted: '#8b8b9e', background: '#1a1a2e' },
    layoutStyle: 'classic', buttonStyle: 'pill',
    backgroundType: 'solid', backgroundValue: '#1a1a2e',
    fontFamily: 'space-grotesk', cardStyle: 'solid', animation: 'slide-up', borderRadius: 'lg',
    blocks: [
      { link_type: 'header', title: 'Artist Name', metadata: { subtitle: 'New Album Out Now', alignment: 'center', size: 'xl' } },
      { link_type: 'heading', title: 'Listen Everywhere', metadata: { alignment: 'center', size: 'md', show_divider: false } },
      { link_type: 'url', title: 'Apple Music', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Bandcamp', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'SoundCloud', url: '', icon_type: 'external' },
      { link_type: 'social_icons', metadata: { links: [{ platform: 'instagram', url: '' }, { platform: 'youtube', url: '' }, { platform: 'tiktok', url: '' }], style: 'circle', size: 'md', alignment: 'center' } },
      { link_type: 'banner', title: 'Tour Dates 2025', metadata: { description: 'Tickets available now', button_text: 'Get Tickets', button_url: '', bg_color: '#e94560' } },
    ],
  },
  {
    name: 'Portfolio', tag: 'NEW',
    description: 'Showcase projects with section headings & resume link.',
    category: 'creative',
    preview: { bg: '#FAF5EF', accent: '#B45309', text: '#292524', card: '#FFFFFF' },
    palette: { primary: '#B45309', text: '#292524', surface: '#FFFFFF', muted: '#78716C', background: '#FAF5EF' },
    layoutStyle: 'classic', buttonStyle: 'rounded',
    backgroundType: 'solid', backgroundValue: '#FAF5EF',
    fontFamily: 'playfair', cardStyle: 'solid', borderRadius: 'sm', spacing: 'relaxed',
    profileShape: 'rounded',
    blocks: [
      { link_type: 'header', title: 'Jane Designer', metadata: { subtitle: 'Visual Designer & Art Director', alignment: 'center', size: 'xl' } },
      { link_type: 'heading', title: 'Selected Work', metadata: { alignment: 'left', size: 'lg', show_divider: true } },
      { link_type: 'url', title: 'Project Alpha \u2014 Brand Identity', url: '', icon_type: 'external', style_variant: 'featured' },
      { link_type: 'url', title: 'Project Beta \u2014 Web Design', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Project Gamma \u2014 Illustration', url: '', icon_type: 'external' },
      { link_type: 'heading', title: 'Connect', metadata: { alignment: 'left', size: 'md', show_divider: true } },
      { link_type: 'url', title: 'Download Resume / CV', url: '', icon_type: 'external' },
      { link_type: 'social_icons', metadata: { links: [{ platform: 'linkedin', url: '' }, { platform: 'github', url: '' }], style: 'pill', size: 'md', alignment: 'center' } },
    ],
  },
  {
    name: 'Influencer', tag: 'NEW',
    description: 'Glassmorphic vibe with collabs & community signup.',
    category: 'social',
    preview: { bg: '#667eea', accent: '#FFFFFF', text: '#FFFFFF', card: 'rgba(255,255,255,0.15)' },
    palette: { primary: '#FFFFFF', text: '#FFFFFF', surface: 'rgba(255,255,255,0.12)', muted: 'rgba(255,255,255,0.7)', background: '#667eea' },
    layoutStyle: 'classic', buttonStyle: 'pill',
    backgroundType: 'gradient', backgroundValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: 'poppins', cardStyle: 'glass', animation: 'fade-in', borderRadius: 'lg', spacing: 'relaxed',
    blocks: [
      { link_type: 'header', title: 'Your Name', metadata: { subtitle: 'Content Creator & Brand Partner', alignment: 'center', size: 'xl' } },
      { link_type: 'social_icons', metadata: { links: [{ platform: 'tiktok', url: '' }, { platform: 'instagram', url: '' }, { platform: 'youtube', url: '' }, { platform: 'twitter', url: '' }], style: 'circle', size: 'lg', alignment: 'center' } },
      { link_type: 'url', title: 'Brand Collaborations', url: '', icon_type: 'external', style_variant: 'featured' },
      { link_type: 'url', title: 'My Favorites on Amazon', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Latest Blog Post', url: '', icon_type: 'external' },
      { link_type: 'lead_form', title: 'Join My Community', metadata: { description: 'Exclusive content and early access', button_text: 'Join Free', fields: [{ type: 'name', label: 'Name', required: false, placeholder: 'Your name' }, { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' }] } },
    ],
  },
  // ── Business ──
  {
    name: 'Business Card',
    description: 'Professional layout with contact form & company links.',
    category: 'business',
    preview: { bg: '#FFFFFF', accent: '#6366F1', text: '#111827', card: '#F9FAFB' },
    palette: { primary: '#6366F1', text: '#111827', surface: '#F9FAFB', muted: '#6B7280', background: '#FFFFFF' },
    layoutStyle: 'classic', buttonStyle: 'sharp',
    backgroundType: 'solid', backgroundValue: '#FFFFFF',
    fontFamily: 'inter', cardStyle: 'solid', borderRadius: 'sm',
    profileShape: 'square',
    blocks: [
      { link_type: 'header', title: 'Company Name', metadata: { subtitle: 'Professional Services', alignment: 'center', size: 'xl' } },
      { link_type: 'url', title: 'Visit Our Website', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Book a Consultation', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Our Services', url: '', icon_type: 'external' },
      { link_type: 'lead_form', title: 'Get in Touch', metadata: { description: 'Leave your email and we will reach out', button_text: 'Contact Us', fields: [{ type: 'name', label: 'Name', required: true, placeholder: 'Your name' }, { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' }, { type: 'mobile', label: 'Mobile', required: false, placeholder: '+91 98765 43210' }] } },
      { link_type: 'social_icons', metadata: { links: [{ platform: 'linkedin', url: '' }, { platform: 'twitter', url: '' }], style: 'pill', size: 'md', alignment: 'center' } },
    ],
  },
  {
    name: 'Newsletter', tag: 'NEW',
    description: 'Email-first layout with past issues & subscribe CTA.',
    category: 'business',
    preview: { bg: '#FDF2F8', accent: '#C084FC', text: '#4C1D95', card: '#FFFFFF' },
    palette: { primary: '#C084FC', text: '#4C1D95', surface: '#FFFFFF', muted: '#A78BFA', background: '#FDF2F8' },
    layoutStyle: 'classic', buttonStyle: 'pill',
    backgroundType: 'gradient', backgroundValue: 'linear-gradient(135deg, #FDF2F8 0%, #EDE9FE 50%, #DBEAFE 100%)',
    fontFamily: 'poppins', cardStyle: 'solid', animation: 'slide-up', borderRadius: 'lg', spacing: 'relaxed',
    blocks: [
      { link_type: 'header', title: 'The Weekly Brief', metadata: { subtitle: 'Curated insights on design & tech', alignment: 'center', size: 'xl' } },
      { link_type: 'text', metadata: { content: 'Join 10,000+ readers getting actionable tips every Thursday.', alignment: 'center', size: 'base' } },
      { link_type: 'lead_form', title: 'Subscribe', metadata: { description: 'Free weekly newsletter', button_text: 'Subscribe', fields: [{ type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' }] } },
      { link_type: 'divider' },
      { link_type: 'heading', title: 'Recent Issues', metadata: { alignment: 'left', size: 'md', show_divider: false } },
      { link_type: 'url', title: 'Issue #42 \u2014 Design Systems at Scale', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Issue #41 \u2014 The Future of AI in Design', url: '', icon_type: 'external' },
      { link_type: 'social_icons', metadata: { links: [{ platform: 'twitter', url: '' }, { platform: 'linkedin', url: '' }], style: 'circle', size: 'sm', alignment: 'center' } },
    ],
  },
  // ── Social / Store ──
  {
    name: 'Store', tag: 'NEW',
    description: 'Sale banner, product links & shop quick links.',
    category: 'social',
    preview: { bg: '#F3F4F6', accent: '#EF4444', text: '#111827', card: '#FFFFFF' },
    palette: { primary: '#EF4444', text: '#111827', surface: '#FFFFFF', muted: '#6B7280', background: '#F3F4F6' },
    layoutStyle: 'grid', buttonStyle: 'shadow',
    backgroundType: 'solid', backgroundValue: '#F3F4F6',
    fontFamily: 'poppins', cardStyle: 'solid', borderRadius: 'lg',
    profileShape: 'rounded',
    blocks: [
      { link_type: 'header', title: 'Brand Name', metadata: { subtitle: 'Shop Our Collection', alignment: 'center', size: 'xl' } },
      { link_type: 'banner', title: 'Summer Sale', metadata: { description: '20% off everything this week', button_text: 'Shop Now', button_url: '', bg_color: '#EF4444' } },
      { link_type: 'heading', title: 'Quick Links', metadata: { alignment: 'left', size: 'md', show_divider: true } },
      { link_type: 'url', title: 'Shop All Products', url: '', icon_type: 'external', style_variant: 'featured' },
      { link_type: 'url', title: 'New Arrivals', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Best Sellers', url: '', icon_type: 'external' },
      { link_type: 'social_icons', metadata: { links: [{ platform: 'instagram', url: '' }, { platform: 'tiktok', url: '' }], style: 'circle', size: 'md', alignment: 'center' } },
    ],
  },
  {
    name: 'Neon Cyber',
    description: 'Dark neon aesthetic with bold accent links.',
    category: 'creative',
    preview: { bg: '#0a0a0a', accent: '#00FF88', text: '#E0FFE0', card: '#111111' },
    palette: { primary: '#00FF88', text: '#E0FFE0', surface: '#111111', muted: '#66BB6A', background: '#0a0a0a' },
    layoutStyle: 'classic', buttonStyle: 'outline',
    backgroundType: 'solid', backgroundValue: '#0a0a0a',
    fontFamily: 'space-grotesk', cardStyle: 'bordered', animation: 'scale', borderRadius: 'sm',
    blocks: [
      { link_type: 'header', title: 'Handle', metadata: { subtitle: 'Digital Creator', alignment: 'center', size: 'xl' } },
      { link_type: 'url', title: 'Main Link', url: '', icon_type: 'external', style_variant: 'featured' },
      { link_type: 'url', title: 'Second Link', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Third Link', url: '', icon_type: 'external' },
      { link_type: 'social_icons', metadata: { links: [{ platform: 'github', url: '' }, { platform: 'twitter', url: '' }], style: 'circle', size: 'md', alignment: 'center' } },
    ],
  },
];

// ─── Design templates (colour + style only — no content blocks) ──────────
type DesignTemplate = {
  name: string;
  tag?: string;
  preview: { bg: string; accent: string; text: string; card: string };
  palette: Record<string, string>;
  layoutStyle: string;
  buttonStyle: string;
  backgroundType: string;
  backgroundValue: string;
  fontFamily?: string;
  cardStyle?: string;
  animation?: string;
  borderRadius?: string;
  spacing?: string;
  profileShape?: 'circular' | 'rounded' | 'square';
};

const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    name: 'Minimal',
    preview: { bg: '#FFFFFF', accent: '#111111', text: '#111111', card: '#F4F4F5' },
    palette: { primary: '#111111', text: '#111111', surface: '#F4F4F5', muted: '#6B7280', background: '#FFFFFF' },
    layoutStyle: 'classic', buttonStyle: 'sharp', backgroundType: 'solid', backgroundValue: '#FFFFFF',
    fontFamily: 'space-grotesk', cardStyle: 'bordered', borderRadius: 'none', spacing: 'compact',
  },
  {
    name: 'Midnight', tag: 'Dark',
    preview: { bg: '#0A0A0A', accent: '#22FF88', text: '#E5FFE5', card: '#141414' },
    palette: { primary: '#22FF88', text: '#E5FFE5', surface: '#141414', muted: '#6EE7B7', background: '#0A0A0A' },
    layoutStyle: 'classic', buttonStyle: 'outline', backgroundType: 'solid', backgroundValue: '#0A0A0A',
    fontFamily: 'space-grotesk', cardStyle: 'bordered', borderRadius: 'sm',
  },
  {
    name: 'Ocean',
    preview: { bg: '#1E3A8A', accent: '#38BDF8', text: '#F0F9FF', card: '#1E40AF' },
    palette: { primary: '#38BDF8', text: '#F0F9FF', surface: '#1E40AF', muted: '#93C5FD', background: '#1E3A8A' },
    layoutStyle: 'classic', buttonStyle: 'rounded', backgroundType: 'gradient', backgroundValue: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    fontFamily: 'inter', cardStyle: 'glass', borderRadius: 'lg',
  },
  {
    name: 'Sunset',
    preview: { bg: '#7A1F3D', accent: '#FB7185', text: '#FFF1F2', card: '#9F1239' },
    palette: { primary: '#FB7185', text: '#FFF1F2', surface: '#9F1239', muted: '#FDA4AF', background: '#7A1F3D' },
    layoutStyle: 'classic', buttonStyle: 'pill', backgroundType: 'gradient', backgroundValue: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    fontFamily: 'poppins', cardStyle: 'glass', borderRadius: 'lg', spacing: 'relaxed',
  },
  {
    name: 'Forest',
    preview: { bg: '#0F2417', accent: '#34D399', text: '#ECFDF5', card: '#14321F' },
    palette: { primary: '#34D399', text: '#ECFDF5', surface: '#14321F', muted: '#6EE7B7', background: '#0F2417' },
    layoutStyle: 'classic', buttonStyle: 'rounded', backgroundType: 'solid', backgroundValue: '#0F2417',
    fontFamily: 'dm-sans', cardStyle: 'solid', borderRadius: 'md',
  },
  {
    name: 'Royal', tag: 'Glass',
    preview: { bg: '#2E1065', accent: '#C084FC', text: '#F5F3FF', card: '#4C1D95' },
    palette: { primary: '#C084FC', text: '#F5F3FF', surface: '#4C1D95', muted: '#D8B4FE', background: '#2E1065' },
    layoutStyle: 'classic', buttonStyle: 'pill', backgroundType: 'gradient', backgroundValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: 'poppins', cardStyle: 'glass', borderRadius: 'lg', spacing: 'relaxed',
  },
  {
    name: 'Editorial',
    preview: { bg: '#FAF5EF', accent: '#B45309', text: '#292524', card: '#FFFFFF' },
    palette: { primary: '#B45309', text: '#292524', surface: '#FFFFFF', muted: '#78716C', background: '#FAF5EF' },
    layoutStyle: 'classic', buttonStyle: 'rounded', backgroundType: 'solid', backgroundValue: '#FAF5EF',
    fontFamily: 'playfair', cardStyle: 'solid', borderRadius: 'sm', spacing: 'relaxed', profileShape: 'rounded',
  },
  {
    name: 'Candy',
    preview: { bg: '#FDF2F8', accent: '#C084FC', text: '#4C1D95', card: '#FFFFFF' },
    palette: { primary: '#C084FC', text: '#4C1D95', surface: '#FFFFFF', muted: '#A78BFA', background: '#FDF2F8' },
    layoutStyle: 'classic', buttonStyle: 'pill', backgroundType: 'gradient', backgroundValue: 'linear-gradient(135deg, #FDF2F8 0%, #EDE9FE 50%, #DBEAFE 100%)',
    fontFamily: 'poppins', cardStyle: 'solid', borderRadius: 'lg', spacing: 'relaxed',
  },
];

export default function EditLinkInBioPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── UI state ──
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(Date.now());

  // ── New shell editing state ──
  const [section, setSection] = useState('content');
  const [imagePicker, setImagePicker] = useState<{ open: boolean; field: string; blockId: string }>({ open: false, field: '', blockId: '' });

  // ── Site data ──
  const [site, setSite] = useState<any>(null);
  const [isPublished, setIsPublished] = useState(true);

  // ── Slug ──
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  // ── Theme ──
  const [palette, setPalette] = useState<Record<string, string>>({});

  // ── Profile state ──
  const [profile, setProfile] = useState<BioProfileData>({
    displayName: '',
    bioText: '',
    avatarUrl: '',
    coverImageUrl: '',
    socialLinks: [],
  });

  // ── Links state ──
  const [links, setLinks] = useState<BioLink[]>([]);

  // ── Appearance state ──
  const [appearance, setAppearance] = useState<BioAppearanceData>({
    layoutStyle: 'classic',
    buttonStyle: 'rounded',
    backgroundType: 'solid',
    backgroundValue: '',
    showWatermark: true,
    showShareButton: true,
    fontFamily: 'system',
    cardStyle: 'solid',
    animation: 'none',
    borderRadius: 'md',
    spacing: 'default',
  });

  // ── SEO ──
  const [seo, setSeo] = useState({ title: '', description: '', image: '' });

  // ── Products ──
  const [products, setProducts] = useState<{ id: string; name: string; price: number; thumbnail_url: string | null }[]>([]);

  // ── Undo / Redo ──
  type EditorSnapshot = { profile: BioProfileData; links: BioLink[]; appearance: BioAppearanceData; palette: Record<string, string>; seo: { title: string; description: string; image: string } };
  const historyRef = useRef<EditorSnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  // Bumped whenever the history position changes so canUndo/canRedo re-render
  // (the refs above don't trigger renders on their own).
  const [historyVersion, setHistoryVersion] = useState(0);
  const bumpHistoryUi = useCallback(() => setHistoryVersion((v) => v + 1), []);

  const pushSnapshot = useCallback(() => {
    const snap: EditorSnapshot = {
      profile: JSON.parse(JSON.stringify(profile)),
      links: JSON.parse(JSON.stringify(links)),
      appearance: { ...appearance },
      palette: { ...palette },
      seo: { ...seo },
    };
    const idx = historyIndexRef.current;
    // Trim any future states if we diverged
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(snap);
    // Cap at 50 snapshots
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    bumpHistoryUi();
  }, [profile, links, appearance, palette, seo, bumpHistoryUi]);

  // Push snapshot on meaningful state changes (debounced). A state change caused
  // by undo/redo sets isRestoringRef — skip recording it (and clear the flag) so
  // the redo future isn't trimmed.
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (isRestoringRef.current) { isRestoringRef.current = false; return; }
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(pushSnapshot, 400);
    return () => { if (pushTimerRef.current) clearTimeout(pushTimerRef.current); };
  }, [profile, links, appearance, palette, seo, loading, pushSnapshot]);

  // Mark the editor dirty on any user edit (skip the initial post-load hydrate).
  const dirtyInitRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!dirtyInitRef.current) { dirtyInitRef.current = true; return; }
    setDirty(true);
  }, [profile, links, appearance, palette, seo, slug, isPublished, loading]);

  const canUndo = historyVersion >= 0 && historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const restoreSnapshot = useCallback((snap: EditorSnapshot) => {
    isRestoringRef.current = true;
    setProfile(snap.profile);
    setLinks(snap.links);
    setAppearance(snap.appearance);
    setPalette(snap.palette);
    setSeo(snap.seo);
    bumpHistoryUi();
  }, [bumpHistoryUi]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    restoreSnapshot(historyRef.current[historyIndexRef.current]);
  }, [restoreSnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    restoreSnapshot(historyRef.current[historyIndexRef.current]);
  }, [restoreSnapshot]);

  // Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // ── Load data ──
  const queryClient = useQueryClient();
  const { data: loaded, isError } = useLinkInBioSiteQuery(siteId);
  // Hydrate local state from cache exactly once per siteId. Background refetches must
  // not clobber unsaved user edits in the editor.
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isError) { setLoading(false); return; }
    if (!loaded || hydratedRef.current === siteId) return;
    hydratedRef.current = siteId;

    const s = loaded.site;
    const tokens = loaded.tokens;
    const page = loaded.page;
    const rawBlocks = loaded.blocks;
    const rawItems = loaded.items;

    setSite(s);
    if (tokens?.color_palette) setPalette(tokens.color_palette as Record<string, string>);

    setSlug(s?.slug ?? '');
    setOriginalSlug(s?.slug ?? null);
    setIsPublished(s?.is_active ?? true);

    if (page) {
      const theme = (page.theme as any) ?? {};
      const layout = (page.layout as any) ?? {};
      const settings = (page.settings as any) ?? {};

      const pageSeo = (page.seo as any) ?? {};
      setSeo({
        title: pageSeo.custom_title ?? '',
        description: pageSeo.custom_description ?? '',
        image: pageSeo.custom_image ?? '',
      });

      setProfile({
        displayName: page.display_name ?? '',
        bioText: page.bio ?? '',
        avatarUrl: page.avatar_url ?? '',
        coverImageUrl: page.cover_url ?? '',
        socialLinks: (settings.socialLinks as SocialLink[]) ?? [],
        avatarShape: (settings.avatarShape as 'circular' | 'rounded' | 'square') ?? 'circular',
        avatarBorder: settings.avatarBorder ?? true,
      });
      setAppearance({
        layoutStyle: layout.style ?? 'classic',
        buttonStyle: theme.buttonStyle ?? 'rounded',
        backgroundType: theme.backgroundType ?? 'solid',
        backgroundValue: theme.backgroundValue ?? '',
        showWatermark: settings.showWatermark ?? true,
        showShareButton: settings.showShareButton ?? true,
        fontFamily: theme.fontFamily ?? 'system',
        cardStyle: theme.cardStyle ?? 'solid',
        animation: theme.animation ?? 'none',
        borderRadius: theme.borderRadius ?? 'md',
        spacing: theme.spacing ?? 'default',
      });
    }

    if (rawBlocks.length > 0) {
      const itemsByBlock: Record<string, any> = {};
      for (const item of rawItems) {
        itemsByBlock[item.block_id] = item;
      }
      setLinks(rawBlocks.map((b: any) => {
        const content = (b.content as any) ?? {};
        const style = (b.style as any) ?? {};
        const item = itemsByBlock[b.id];
        return {
          id: b.id,
          link_type: b.type,
          title: item?.title ?? content.title ?? '',
          description: item?.description ?? content.description ?? '',
          url: item?.url ?? content.url ?? '',
          thumbnail_url: item?.thumbnail_url ?? content.thumbnail_url ?? '',
          product_id: item?.product_id ?? '',
          icon_type: item?.metadata?.icon_type ?? style.icon_type ?? 'external',
          style_variant: item?.metadata?.style_variant ?? style.variant ?? 'default',
          is_visible: b.is_visible ?? true,
          sort_order: b.sort_order ?? 0,
          metadata: { ...content, ...(item?.metadata ?? {}) },
          _item_id: item?.id ?? null,
        };
      }));
    }

    setProducts(loaded.products);

    setLoading(false);
  }, [loaded, siteId, isError]);

  // ── Slug availability check ──
  useEffect(() => {
    if (!slug || slug === originalSlug) { setSlugStatus('idle'); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3) {
      setSlugStatus('invalid'); return;
    }
    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=linkinbio`);
        const json = await res.json();
        setSlugStatus(json.available ? 'available' : 'taken');
      } catch { setSlugStatus('idle'); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, originalSlug]);

  // ── Update palette (single key) and push to iframe ──
  const updatePalette = useCallback((key: string, value: string) => {
    setPalette(prev => {
      const next = { ...prev, [key]: value };
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'theme-update', palette: next },
          window.location.origin,
        );
      } catch { /* cross-origin guard */ }
      return next;
    });
  }, []);

  // ── Apply a DESIGN template (palette + appearance only — keeps content) ──
  const applyDesign = useCallback((tpl: DesignTemplate) => {
    setPalette(tpl.palette);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'theme-update', palette: tpl.palette },
        window.location.origin,
      );
    } catch { /* cross-origin guard */ }

    setAppearance(prev => ({
      ...prev,
      layoutStyle: tpl.layoutStyle,
      buttonStyle: tpl.buttonStyle,
      backgroundType: tpl.backgroundType,
      backgroundValue: tpl.backgroundValue,
      fontFamily: tpl.fontFamily ?? prev.fontFamily,
      cardStyle: tpl.cardStyle ?? prev.cardStyle,
      animation: tpl.animation ?? prev.animation,
      borderRadius: tpl.borderRadius ?? prev.borderRadius,
      spacing: tpl.spacing ?? prev.spacing,
    }));

    if (tpl.profileShape) {
      setProfile(prev => ({ ...prev, avatarShape: tpl.profileShape }));
    }
  }, []);

  // ── Apply a full template (palette + layout + button + background) ──
  const applyTemplate = useCallback((tpl: BioTemplate) => {
    // Apply palette
    setPalette(tpl.palette);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'theme-update', palette: tpl.palette },
        window.location.origin,
      );
    } catch { /* cross-origin guard */ }

    // Apply appearance (including new V2 fields)
    setAppearance(prev => ({
      ...prev,
      layoutStyle: tpl.layoutStyle,
      buttonStyle: tpl.buttonStyle,
      backgroundType: tpl.backgroundType,
      backgroundValue: tpl.backgroundValue,
      fontFamily: tpl.fontFamily ?? prev.fontFamily,
      cardStyle: tpl.cardStyle ?? prev.cardStyle,
      animation: tpl.animation ?? prev.animation,
      borderRadius: tpl.borderRadius ?? prev.borderRadius,
      spacing: tpl.spacing ?? prev.spacing,
    }));

    // Apply avatar shape from template
    if (tpl.profileShape) {
      setProfile(prev => ({ ...prev, avatarShape: tpl.profileShape }));
    }

    // Apply pre-built blocks from template
    if (tpl.blocks && tpl.blocks.length > 0) {
      const newLinks: BioLink[] = tpl.blocks.map((b, i) => ({
        id: crypto.randomUUID(),
        link_type: b.link_type,
        title: b.title ?? '',
        description: b.description ?? '',
        url: b.url ?? '',
        thumbnail_url: b.thumbnail_url ?? '',
        product_id: '',
        icon_type: b.icon_type ?? 'external',
        style_variant: b.style_variant ?? 'default',
        is_visible: true,
        sort_order: i,
        metadata: b.metadata ?? {},
      }));
      setLinks(newLinks);
    }
  }, []);

  // ── Push content to iframe (debounced, no dep array to avoid React Compiler size mismatch) ──
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestRef = useRef({ profile, links, appearance, products, palette });
  latestRef.current = { profile, links, appearance, products, palette };

  useEffect(() => {
    clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(() => {
      const { profile, links, appearance, products, palette } = latestRef.current;
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;

      const bioData = {
        display_name: profile.displayName,
        bio_text: profile.bioText || null,
        avatar_url: profile.avatarUrl || null,
        cover_image_url: profile.coverImageUrl || null,
        layout_style: appearance.layoutStyle,
        button_style: appearance.buttonStyle,
        background_type: appearance.backgroundType,
        background_value: appearance.backgroundValue || null,
        social_links: profile.socialLinks,
        show_watermark: appearance.showWatermark,
        show_share_button: appearance.showShareButton,
        font_family: appearance.fontFamily || 'system',
        card_style: appearance.cardStyle || 'solid',
        animation: appearance.animation || 'none',
        border_radius: appearance.borderRadius || 'md',
        spacing: appearance.spacing || 'default',
        avatar_shape: profile.avatarShape ?? 'circular',
        avatar_border: profile.avatarBorder ?? true,
      };

      const previewLinks = links.filter(l => l.is_visible).map(l => ({
        id: l.id,
        link_type: l.link_type,
        title: l.title || null,
        description: l.description || null,
        url: l.url || null,
        thumbnail_url: l.thumbnail_url || null,
        product_id: l.product_id || null,
        icon_type: l.icon_type || null,
        style_variant: l.style_variant || 'default',
        metadata: l.metadata || {},
      }));

      const previewProductsMap: Record<string, any> = {};
      for (const p of products) {
        previewProductsMap[p.id] = p;
      }

      try {
        iframe.contentWindow.postMessage(
          { type: 'bio-content-update', bio: bioData, links: previewLinks, productsMap: previewProductsMap },
          window.location.origin,
        );
        iframe.contentWindow.postMessage(
          { type: 'theme-update', palette },
          window.location.origin,
        );
      } catch { /* cross-origin guard */ }
    }, 16);

    return () => clearTimeout(sendTimerRef.current);
  }); // intentionally no deps — runs every render, debounced to ~1 frame

  // ── Save all ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Design tokens
      if (Object.keys(palette).length > 0) {
        await supabase
          .from('site_design_tokens')
          .upsert({ site_id: siteId, color_palette: palette, creator_id: site?.creator_id } as any, { onConflict: 'site_id' });
      }

      // Slug + published status
      const siteUpdates: Record<string, any> = { is_active: isPublished };
      if (slug && slug !== originalSlug) {
        siteUpdates.slug = slug;
        setOriginalSlug(slug);
      }
      await supabase.from('sites').update(siteUpdates).eq('id', siteId);

      // ── V2: Upsert linkinbio_pages ──
      const pagePayload = {
        display_name: profile.displayName,
        bio: profile.bioText || null,
        avatar_url: profile.avatarUrl || null,
        cover_url: profile.coverImageUrl || null,
        theme: {
          buttonStyle: appearance.buttonStyle,
          backgroundType: appearance.backgroundType,
          backgroundValue: appearance.backgroundValue || null,
          fontFamily: appearance.fontFamily || 'system',
          cardStyle: appearance.cardStyle || 'solid',
          animation: appearance.animation || 'none',
          borderRadius: appearance.borderRadius || 'md',
          spacing: appearance.spacing || 'default',
        },
        layout: { style: appearance.layoutStyle },
        seo: {
          title: profile.displayName,
          description: profile.bioText || '',
          custom_title: seo.title || null,
          custom_description: seo.description || null,
          custom_image: seo.image || null,
        },
        settings: {
          showWatermark: appearance.showWatermark,
          showShareButton: appearance.showShareButton,
          socialLinks: profile.socialLinks,
          avatarShape: profile.avatarShape ?? 'circular',
          avatarBorder: profile.avatarBorder ?? true,
        },
      };

      const { data: existingPage } = await (supabase.from('linkinbio_pages' as any) as any)
        .select('id')
        .eq('site_id', siteId)
        .maybeSingle();

      let pageId: string;
      if (existingPage) {
        pageId = existingPage.id;
        await (supabase.from('linkinbio_pages' as any) as any).update(pagePayload).eq('id', pageId);
      } else {
        const { data: newPage } = await (supabase.from('linkinbio_pages' as any) as any)
          .insert({ site_id: siteId, ...pagePayload })
          .select('id')
          .single();
        pageId = newPage.id;
      }

      // ── V2: Delete old blocks (cascades to items) then insert fresh ──
      await (supabase.from('linkinbio_blocks' as any) as any).delete().eq('page_id', pageId);

      if (links.length > 0) {
        const ITEM_TYPES = ['url', 'product'];

        for (let i = 0; i < links.length; i++) {
          const l = links[i];
          const hasItem = ITEM_TYPES.includes(l.link_type);

          // Build block content for non-item types
          const blockContent: any = {};
          if (l.link_type === 'heading') {
            blockContent.title = l.title || null;
            blockContent.subtitle = l.metadata?.subtitle || null;
            blockContent.alignment = l.metadata?.alignment || 'left';
            blockContent.size = l.metadata?.size || 'md';
            blockContent.show_divider = l.metadata?.show_divider ?? false;
          }
          if (l.link_type === 'header') {
            blockContent.title = l.title || null;
            blockContent.subtitle = l.metadata?.subtitle || null;
            blockContent.alignment = l.metadata?.alignment || 'center';
            blockContent.size = l.metadata?.size || 'xl';
            blockContent.show_divider = l.metadata?.show_divider ?? false;
          }
          if (l.link_type === 'text') {
            blockContent.content = l.metadata?.content || null;
            blockContent.alignment = l.metadata?.alignment || 'left';
            blockContent.size = l.metadata?.size || 'base';
          }
          if (l.link_type === 'video_embed') {
            blockContent.embed_url = l.metadata?.embed_url || null;
            blockContent.aspect_ratio = l.metadata?.aspect_ratio || '16/9';
            blockContent.caption = l.metadata?.caption || null;
          }
          if (l.link_type === 'lead_form') {
            // Upsert a forms record for this lead form block
            const formTitle = l.title || 'Lead Form';
            const formDesc = l.metadata?.description || null;
            let formId = l.metadata?.form_id || null;

            if (formId) {
              // Update existing form
              await supabase.from('forms').update({
                title: formTitle,
                description: formDesc,
              }).eq('id', formId);
            } else {
              // Create new form
              const { data: newForm } = await supabase.from('forms')
                .insert({ site_id: siteId, title: formTitle, description: formDesc })
                .select('id')
                .single();
              if (newForm) formId = newForm.id;
            }

            blockContent.form_id = formId;
            blockContent.fields = l.metadata?.fields || [];
            blockContent.description = l.metadata?.description || null;
            blockContent.button_text = l.metadata?.button_text || 'Submit';
            blockContent.success_message = l.metadata?.success_message || null;
          }
          if (l.link_type === 'image') {
            blockContent.thumbnail_url = l.thumbnail_url || null;
            blockContent.link_url = l.metadata?.link_url || null;
            blockContent.alt_text = l.metadata?.alt_text || null;
            blockContent.caption = l.metadata?.caption || null;
            blockContent.border_radius = l.metadata?.border_radius || 'lg';
            blockContent.aspect_ratio = l.metadata?.aspect_ratio || 'auto';
          }
          if (l.link_type === 'space') {
            blockContent.height = l.metadata?.height || 'md';
          }
          if (l.link_type === 'html_embed') {
            blockContent.html = l.metadata?.html || null;
            blockContent.height = l.metadata?.height || '300';
          }
          if (l.link_type === 'spotify') {
            blockContent.spotify_url = l.metadata?.spotify_url || null;
            blockContent.embed_type = l.metadata?.embed_type || 'track';
          }
          if (l.link_type === 'social_icons') {
            blockContent.links = l.metadata?.links || [];
            blockContent.style = l.metadata?.style || 'circle';
            blockContent.size = l.metadata?.size || 'md';
            blockContent.alignment = l.metadata?.alignment || 'center';
          }
          if (l.link_type === 'banner') {
            blockContent.title = l.title || null;
            blockContent.description = l.metadata?.description || null;
            blockContent.button_text = l.metadata?.button_text || null;
            blockContent.button_url = l.metadata?.button_url || null;
            blockContent.bg_color = l.metadata?.bg_color || null;
          }

          const blockStyle: any = {};
          if (hasItem) {
            blockStyle.variant = l.style_variant || 'default';
            blockStyle.icon_type = l.icon_type || 'external';
          }

          // Insert block
          const { data: block } = await (supabase.from('linkinbio_blocks' as any) as any)
            .insert({
              page_id: pageId,
              type: l.link_type,
              content: blockContent,
              style: blockStyle,
              sort_order: i + 1,
              is_visible: l.is_visible,
            })
            .select('id')
            .single();

          // Insert item for url/product blocks
          if (hasItem && block) {
            const itemMeta: any = {};
            if (l.icon_type) itemMeta.icon_type = l.icon_type;
            if (l.style_variant) itemMeta.style_variant = l.style_variant;
            if (l.link_type === 'product') {
              if (l.metadata?.cta_text) itemMeta.cta_text = l.metadata.cta_text;
              if (l.metadata?.badge !== undefined) itemMeta.badge = l.metadata.badge;
              if (l.metadata?.show_price !== undefined) itemMeta.show_price = l.metadata.show_price;
              if (l.metadata?.layout) itemMeta.layout = l.metadata.layout;
              if (l.metadata?.button_position) itemMeta.button_position = l.metadata.button_position;
              if (l.metadata?.price_position) itemMeta.price_position = l.metadata.price_position;
              if (l.metadata?.original_price !== undefined && l.metadata?.original_price !== null) itemMeta.original_price = l.metadata.original_price;
            }
            if (l.link_type === 'url' && l.metadata?.animation) itemMeta.animation = l.metadata.animation;

            await (supabase.from('linkinbio_items' as any) as any).insert({
              block_id: block.id,
              type: l.link_type === 'product' ? 'product' : 'link',
              title: l.title || '',
              description: l.description || '',
              url: l.url || '',
              thumbnail_url: l.thumbnail_url || '',
              product_id: l.product_id || null,
              metadata: itemMeta,
              sort_order: 0,
              is_visible: true,
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['sites', 'linkinbio', siteId] });
      setSaved(true);
      setDirty(false);
      setPreviewKey(Date.now());
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [supabase, siteId, palette, slug, originalSlug, profile, appearance, links, seo, isPublished, queryClient]);

  // ── Leave guard: warn before navigating away with unsaved changes ──
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const guardedNavigate = useCallback((href: string) => {
    if (dirty) setPendingNav(href);
    else router.push(href);
  }, [dirty, router]);
  const discardAndLeave = useCallback(() => {
    const href = pendingNav;
    setPendingNav(null);
    if (href) router.push(href);
  }, [pendingNav, router]);
  const saveAndLeave = useCallback(async () => {
    await handleSave();
    const href = pendingNav;
    setPendingNav(null);
    if (href) router.push(href);
  }, [handleSave, pendingNav, router]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // ── First-run setup wizard (shown for newly created sites via ?setup=1) ──
  const [setupRequested, setSetupRequested] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  useEffect(() => {
    setSetupRequested(new URLSearchParams(window.location.search).get('setup') === '1');
  }, []);
  const showSetup = !loading && setupRequested && !setupDone;
  const closeSetup = useCallback(() => {
    setSetupDone(true);
    router.replace(`/dashboard/sites/edit/linkinbio/${siteId}`);
  }, [router, siteId]);
  const finishSetup = useCallback(async () => {
    await handleSave();
    closeSetup();
  }, [handleSave, closeSetup]);

  // ── Section-list helpers (operate on the `links` block array) ──
  const reindex = (ls: BioLink[]) => ls.map((l, i) => ({ ...l, sort_order: i + 1 }));
  const handleReorder = (from: number, to: number) => setLinks(prev => reindex(moveItem(prev, from, to)));
  const handleToggleVisible = (id: string) =>
    setLinks(prev => prev.map(l => (l.id === id ? { ...l, is_visible: !l.is_visible } : l)));
  const handleDeleteBlock = (id: string) => {
    setLinks(prev => reindex(prev.filter(l => l.id !== id)));
  };
  const handleDuplicateBlock = (id: string) =>
    setLinks(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx < 0) return prev;
      const src = prev[idx];
      const clone: BioLink = {
        ...src,
        id: crypto.randomUUID(),
        title: src.title ? `${src.title} (copy)` : '',
        metadata: src.metadata ? JSON.parse(JSON.stringify(src.metadata)) : {},
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return reindex(next);
    });
  const handleAddBlock = (type: string): string => {
    const meta: Record<string, any> = {
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
        success_message: "Thanks! We'll be in touch.",
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
      metadata: meta[type] ?? {},
    };
    setLinks(prev => [...prev, { ...newLink, sort_order: prev.length + 1 }]);
    return newLink.id;
  };
  const updateBlock = (id: string, updates: Partial<BioLink>) =>
    setLinks(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
  const updateBlockMeta = (id: string, key: string, value: unknown) =>
    setLinks(prev => prev.map(l => (l.id === id ? { ...l, metadata: { ...l.metadata, [key]: value } } : l)));

  // ── Derived ──
  const previewUrl = site ? `${getSitePublicPath(site)}?preview=1&t=${previewKey}` : null;
  const displayTitle = profile.displayName || site?.slug || 'Untitled';

  // The main layout remains visible during loading.

  const INPUT_CLS =
    'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';

  const profileSection = <BioProfileEditor data={profile} onChange={setProfile} />;

  const contentSlot = (
    <SectionList
      items={links}
      registry={linkinbioRegistry}
      typeOf={(l) => l.link_type}
      onReorder={handleReorder}
      onToggleVisible={handleToggleVisible}
      onDuplicate={handleDuplicateBlock}
      onDelete={handleDeleteBlock}
      onAdd={handleAddBlock}
      onCancelAdded={handleDeleteBlock}
      pinned={
        <ProfileCard
          name={profile.displayName}
          username={site?.slug ?? ''}
          bio={profile.bioText}
          avatarUrl={profile.avatarUrl}
          socialLinks={profile.socialLinks}
          onEdit={() => setSection('profile')}
        />
      }
      renderEditor={(l) => (
        <BlockBody
          link={l}
          update={(u) => updateBlock(l.id, u)}
          updateMeta={(k, v) => updateBlockMeta(l.id, k, v)}
          openImagePicker={(field) => setImagePicker({ open: true, field, blockId: l.id })}
          products={products}
        />
      )}
    />
  );

  const templateSlot = (
    <BioTemplates
      designTemplates={DESIGN_TEMPLATES.map((t) => ({ name: t.name, tag: t.tag, preview: t.preview }))}
      contentTemplates={TEMPLATES.map((t) => ({ name: t.name, tag: t.tag, description: t.description, preview: t.preview }))}
      onApplyDesign={(i) => applyDesign(DESIGN_TEMPLATES[i])}
      onApplyContent={(i) => applyTemplate(TEMPLATES[i])}
    />
  );

  const designSlot = (
    <BioAppearanceEditor
      data={appearance}
      onChange={setAppearance}
      palette={palette}
      onPaletteChange={updatePalette}
    />
  );

  const settingsSlot = (
    <div className="space-y-5">
      {/* Public URL */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] space-y-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Globe2 className="w-4 h-4" /> Public URL
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Your link-in-bio page address</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--focus-ring)] transition-shadow">
          <span className="text-sm text-[var(--text-tertiary)] shrink-0 select-none">digione.ai/link/</span>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className="flex-1 bg-transparent text-sm font-medium outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] min-w-0"
            placeholder="your-name"
          />
        </div>
        <div className="flex items-center gap-2 min-h-5 text-xs">
          {slugStatus === 'checking' && (
            <span className="flex items-center gap-1 text-[var(--text-tertiary)]"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</span>
          )}
          {slugStatus === 'idle' && slug === originalSlug && slug.length > 0 && (
            <span className="flex items-center gap-1 text-[var(--success)]"><CheckCircle2 className="w-3.5 h-3.5" /> Your current URL</span>
          )}
          {slugStatus === 'available' && (
            <span className="flex items-center gap-1 text-[var(--success)]"><CheckCircle2 className="w-3.5 h-3.5" /> Available — save to apply</span>
          )}
          {slugStatus === 'taken' && (
            <span className="flex items-center gap-1 text-[var(--danger)]"><XCircle className="w-3.5 h-3.5" /> Already taken</span>
          )}
          {slugStatus === 'invalid' && (
            <span className="text-[var(--danger)]">3+ chars, letters, numbers, hyphens only</span>
          )}
        </div>
      </div>

      {/* SEO & Social Sharing */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] space-y-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Search className="w-4 h-4" /> SEO &amp; Social Sharing
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">How your page looks when shared on WhatsApp, Twitter, etc.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Page Title</label>
          <input
            type="text"
            value={seo.title}
            onChange={e => setSeo(s => ({ ...s, title: e.target.value }))}
            maxLength={70}
            className={INPUT_CLS}
            placeholder={profile.displayName || 'Your Name · Link in Bio'}
          />
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">{seo.title.length}/70 characters</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Meta Description</label>
          <textarea
            value={seo.description}
            onChange={e => setSeo(s => ({ ...s, description: e.target.value }))}
            maxLength={160}
            rows={2}
            className={`${INPUT_CLS} resize-none`}
            placeholder={profile.bioText || 'A short description of your page...'}
          />
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">{seo.description.length}/160 characters</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Share Preview Image</label>
          <input
            type="url"
            value={seo.image}
            onChange={e => setSeo(s => ({ ...s, image: e.target.value }))}
            className={INPUT_CLS}
            placeholder="https://... (defaults to your avatar)"
          />
        </div>
      </div>

      {/* Activate / Deactivate */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {isPublished ? 'Link is Active' : 'Link is Inactive'}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isPublished ? 'Your page is live and accessible to visitors.' : 'Your page is hidden. Visitors will see a 404 page.'}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={isPublished}
            aria-label={isPublished ? 'Deactivate link' : 'Activate link'}
            onClick={() => setIsPublished(!isPublished)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${isPublished ? 'bg-[var(--success)]' : 'bg-[var(--surface-muted)] border border-[var(--border)]'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <LinkInBioShell
        title={displayTitle}
        typeLabel="Link-in-bio"
        typeIcon={Link2}
        onBack={() => guardedNavigate('/dashboard/sites')}
        onNavigate={guardedNavigate}
        saving={saving}
        saved={saved}
        dirty={dirty}
        onSave={handleSave}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        previewUrl={previewUrl}
        displayUrl={site ? getSiteDisplayUrl(site) : null}
        iframeRef={iframeRef}
        previewKey={previewKey}
        onRefresh={() => setPreviewKey(Date.now())}
        active={section}
        onActiveChange={setSection}
        sections={{ profile: profileSection, template: templateSlot, content: contentSlot, design: designSlot, settings: settingsSlot }}
      />

      {imagePicker.open && (
        <ImagePickerModal
          open={imagePicker.open}
          onClose={() => setImagePicker(p => ({ ...p, open: false }))}
          onSelect={(url) => {
            if (imagePicker.field === 'thumbnail_url') updateBlock(imagePicker.blockId, { thumbnail_url: url });
            else if (imagePicker.field === 'meta_link_url') updateBlockMeta(imagePicker.blockId, 'link_url', url);
          }}
        />
      )}

      {showSetup && (
        <BioSetupWizard
          profile={profile}
          onChangeProfile={setProfile}
          designTemplates={DESIGN_TEMPLATES.map((t) => ({ name: t.name, tag: t.tag, preview: t.preview }))}
          contentTemplates={TEMPLATES.map((t) => ({ name: t.name, tag: t.tag, description: t.description, preview: t.preview }))}
          onApplyDesign={(i) => applyDesign(DESIGN_TEMPLATES[i])}
          onApplyContent={(i) => applyTemplate(TEMPLATES[i])}
          onClose={closeSetup}
          onSave={handleSave}
          onFinish={finishSetup}
        />
      )}

      {pendingNav && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            aria-label="Stay on page"
            tabIndex={-1}
            onClick={() => setPendingNav(null)}
            className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Unsaved changes"
            className="relative z-10 w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card-lg)]"
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Unsaved changes</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              You have unsaved changes. Save them to apply live, or discard them before leaving.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingNav(null)}
                className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Cancel
              </button>
              <button
                onClick={discardAndLeave}
                className="rounded-[var(--radius-sm)] px-3.5 py-2 text-sm font-medium text-[var(--danger)] transition hover:bg-[var(--danger-bg)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Discard changes
              </button>
              <button
                onClick={saveAndLeave}
                disabled={saving}
                className="rounded-[var(--radius-sm)] bg-[var(--brand)] px-3.5 py-2 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save & leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
