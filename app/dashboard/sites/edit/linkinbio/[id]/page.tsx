'use client';
// Edit page: Link in Bio — custom split-screen editor.
// Mini sidebar + Left panel (header + tabs + editor) + Right panel (preview).

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import BioProfileEditor, { type BioProfileData, type SocialLink } from '@/src/components/dashboard/site-edit/tabs/linkinbio/BioProfileEditor';
import BioLinksEditor, { type BioLink } from '@/src/components/dashboard/site-edit/tabs/linkinbio/BioLinksEditor';
import BioAppearanceEditor, { type BioAppearanceData } from '@/src/components/dashboard/site-edit/tabs/linkinbio/BioAppearanceEditor';
import {
  Link2, User, LinkIcon, Sparkles, Paintbrush,
  ArrowLeft, Save, Loader2, CheckCircle2, ExternalLink,
  Settings, Monitor, Tablet, Smartphone, RefreshCw,
  XCircle, LayoutDashboard, Package, Store, BarChart2,
  Copy, Check, Plus, HelpCircle, Moon, Sun, Search, ImagePlus, Globe2,
  Undo2, Redo2,
} from 'lucide-react';
import { useTheme } from '@/contexts/DashboardThemeContext';

// ─── Device presets ──────────────────────────────────────────
const DEVICES = [
  { id: 'desktop', icon: Monitor, width: '100%', label: 'Desktop' },
  { id: 'tablet', icon: Tablet, width: '768px', label: 'Tablet' },
  { id: 'mobile', icon: Smartphone, width: '375px', label: 'Mobile' },
] as const;

// ─── Mini sidebar nav ────────────────────────────────────────
// The mini sidebar is split into top/bottom actions inline.

// ─── Tabs ────────────────────────────────────────────────────
type Tab = 'profile' | 'templates' | 'section' | 'appearance' | 'settings';

type TabDef = {
  id: Tab;
  label: string;
  icon: React.ElementType;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
};

const TABS: TabDef[] = [
  { id: 'profile', label: 'Profile', icon: User, activeColor: 'text-blue-600 dark:text-blue-400', activeBg: 'bg-blue-50 dark:bg-blue-500/10', activeBorder: 'ring-1 ring-blue-200 dark:ring-blue-500/20' },
  { id: 'templates', label: 'Template', icon: Paintbrush, activeColor: 'text-gray-700 dark:text-[var(--text-secondary)]', activeBg: 'bg-gray-100 dark:bg-[var(--bg-secondary)]', activeBorder: 'ring-1 ring-gray-300 dark:ring-gray-600' },
  { id: 'section', label: 'Section', icon: LinkIcon, activeColor: 'text-emerald-600 dark:text-emerald-400', activeBg: 'bg-emerald-50 dark:bg-emerald-500/10', activeBorder: 'ring-1 ring-emerald-200 dark:ring-emerald-500/20' },
  { id: 'appearance', label: 'Appearance', icon: Sparkles, activeColor: 'text-rose-600 dark:text-rose-400', activeBg: 'bg-rose-50 dark:bg-rose-500/10', activeBorder: 'ring-1 ring-rose-200 dark:ring-rose-500/20' },
  { id: 'settings', label: 'Settings', icon: Settings, activeColor: 'text-amber-600 dark:text-amber-400', activeBg: 'bg-amber-50 dark:bg-amber-500/10', activeBorder: 'ring-1 ring-amber-200 dark:ring-amber-500/20' },
];

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

export default function EditLinkInBioPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [previewW, setPreviewW] = useState(700);
  const { theme, setTheme } = useTheme();

  // Measure available preview panel width for desktop zoom scaling
  useEffect(() => {
    const el = previewWrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(es => setPreviewW(es[0].contentRect.width - 2));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isScrolled, setIsScrolled] = useState(false);
  const [device, setDevice] = useState<string>('mobile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [copied, setCopied] = useState(false);

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

  const pushSnapshot = useCallback(() => {
    if (isRestoringRef.current) return;
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
  }, [profile, links, appearance, palette, seo]);

  // Push snapshot on meaningful state changes (debounced)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(pushSnapshot, 400);
    return () => { if (pushTimerRef.current) clearTimeout(pushTimerRef.current); };
  }, [profile, links, appearance, palette, seo, loading, pushSnapshot]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isRestoringRef.current = true;
    historyIndexRef.current -= 1;
    const snap = historyRef.current[historyIndexRef.current];
    setProfile(snap.profile);
    setLinks(snap.links);
    setAppearance(snap.appearance);
    setPalette(snap.palette);
    setSeo(snap.seo);
    // Allow new snapshots again after state settles
    requestAnimationFrame(() => { isRestoringRef.current = false; });
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isRestoringRef.current = true;
    historyIndexRef.current += 1;
    const snap = historyRef.current[historyIndexRef.current];
    setProfile(snap.profile);
    setLinks(snap.links);
    setAppearance(snap.appearance);
    setPalette(snap.palette);
    setSeo(snap.seo);
    requestAnimationFrame(() => { isRestoringRef.current = false; });
  }, []);

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
  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: s }, { data: tokens }] = await Promise.all([
          supabase.from('sites').select('*').eq('id', siteId).single(),
          supabase.from('site_design_tokens').select('color_palette').eq('site_id', siteId).maybeSingle(),
        ]);

        setSite(s);
        if (tokens?.color_palette) setPalette(tokens.color_palette as Record<string, string>);

        setSlug(s?.slug ?? '');
        setOriginalSlug(s?.slug ?? null);
        setIsPublished(s?.is_active ?? true);

        // ── V2: Fetch from linkinbio_pages ──
        const { data: page } = await (supabase.from('linkinbio_pages' as any) as any)
          .select('*')
          .eq('site_id', siteId)
          .maybeSingle();

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

        // ── V2: Fetch blocks + items ──
        const { data: rawBlocks } = await (supabase.from('linkinbio_blocks' as any) as any)
          .select('*')
          .eq('page_id', page?.id)
          .order('sort_order', { ascending: true });

        if (rawBlocks && rawBlocks.length > 0) {
          const blockIds = rawBlocks.map((b: any) => b.id);
          const { data: rawItems } = await (supabase.from('linkinbio_items' as any) as any)
            .select('*')
            .in('block_id', blockIds)
            .order('sort_order', { ascending: true });

          const itemsByBlock: Record<string, any> = {};
          for (const item of rawItems ?? []) {
            itemsByBlock[item.block_id] = item;
          }

          setLinks(rawBlocks.map((b: any) => {
            const content = (b.content as any) ?? {};
            const style = (b.style as any) ?? {};
            const item = itemsByBlock[b.id];

            // Reconstruct the flat BioLink shape the editor expects
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
              _item_id: item?.id ?? null, // track item ID for updates
            };
          }));
        }

        // Load ALL products (not just published) so creator can link any product
        if (s?.creator_id) {
          const { data: prods } = await supabase
            .from('products')
            .select('id, name, price, thumbnail_url, is_published')
            .eq('creator_id', s.creator_id)
            .order('created_at', { ascending: false });
          setProducts(prods ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

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

      setSaved(true);
      setPreviewKey(Date.now());
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [supabase, siteId, palette, slug, originalSlug, profile, appearance, links, seo, isPublished]);

  // ── Derived ──
  const previewUrl = site ? `${getSitePublicPath(site)}?preview=1&t=${previewKey}` : null;
  const displayTitle = profile.displayName || site?.slug || 'Untitled';

  // The main layout remains visible during loading.

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[var(--bg-primary)]">

      {/* ═══ BODY — full height, panels own their headers ═══ */}
      <div className="flex-1 flex min-h-0">

        {/* ═══ MINI SIDEBAR ═══ */}
        <div className="w-14 shrink-0 relative">
          <div className="group/sidebar absolute inset-y-0 left-0 w-14 hover:w-48 bg-[var(--bg-primary)] border-r border-[var(--border)] flex flex-col transition-all duration-200 overflow-hidden z-30 hover:shadow-xl hover:shadow-black/10">
            {/* Back button — h-14 aligns with panel headers */}
            <div className="h-14 shrink-0 border-b border-[var(--border)] flex items-center justify-center group-hover/sidebar:justify-start group-hover/sidebar:px-4 gap-3">
              <button
                onClick={() => router.push('/dashboard/sites')}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] rounded-lg transition shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="hidden group-hover/sidebar:inline text-xs font-medium text-gray-700 dark:text-[var(--text-secondary)] whitespace-nowrap">Dashboard</span>
            </div>
            {/* Top Nav links */}
            <div className="flex flex-col py-3 gap-1 flex-1 overflow-y-auto">
              <Link href="/dashboard" className="mx-2.5 group-hover/sidebar:mx-2 h-9 rounded-lg flex items-center gap-3 justify-center group-hover/sidebar:justify-start px-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition-all duration-200 shrink-0">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span className="hidden group-hover/sidebar:inline text-xs font-medium text-gray-700 dark:text-[var(--text-secondary)] whitespace-nowrap">Overview</span>
              </Link>

              <Link href="/dashboard/products" className="mx-2.5 group-hover/sidebar:mx-2 h-9 rounded-lg flex items-center gap-3 justify-center group-hover/sidebar:justify-start px-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition-all duration-200 shrink-0">
                <Package className="w-4 h-4 shrink-0" />
                <span className="hidden group-hover/sidebar:inline text-xs font-medium text-gray-700 dark:text-[var(--text-secondary)] whitespace-nowrap">Products</span>
              </Link>
              <Link href="/dashboard/products/new" target="_blank" rel="noopener noreferrer" className="mx-2.5 group-hover/sidebar:mx-2 h-9 rounded-lg flex items-center gap-3 justify-center group-hover/sidebar:justify-start px-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition-all duration-200 shrink-0 mb-1 group/addbtn">
                <div className="relative shrink-0 w-4 h-4 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5" />
                  <div className="absolute -bottom-1.5 -right-1.5 bg-[var(--bg-primary)] group-hover/addbtn:bg-transparent rounded-full p-[1px]">
                    <Plus className="w-[10px] h-[10px] stroke-[3]" />
                  </div>
                </div>
                <span className="hidden group-hover/sidebar:inline text-xs font-medium whitespace-nowrap">Add New Product</span>
              </Link>

              <Link href="/dashboard/sites" className="mx-2.5 group-hover/sidebar:mx-2 h-9 rounded-lg flex items-center gap-3 justify-center group-hover/sidebar:justify-start px-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition-all duration-200 shrink-0">
                <Store className="w-4 h-4 shrink-0" />
                <span className="hidden group-hover/sidebar:inline text-xs font-medium text-gray-700 dark:text-[var(--text-secondary)] whitespace-nowrap">Sites</span>
              </Link>
              <Link href="/dashboard/sites/new" target="_blank" rel="noopener noreferrer" className="mx-2.5 group-hover/sidebar:mx-2 h-9 rounded-lg flex items-center gap-3 justify-center group-hover/sidebar:justify-start px-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition-all duration-200 shrink-0 mb-1 group/addbtn">
                <div className="relative shrink-0 w-4 h-4 flex items-center justify-center">
                  <Store className="w-3.5 h-3.5" />
                  <div className="absolute -bottom-1.5 -right-1.5 bg-[var(--bg-primary)] group-hover/addbtn:bg-transparent rounded-full p-[1px]">
                    <Plus className="w-[10px] h-[10px] stroke-[3]" />
                  </div>
                </div>
                <span className="hidden group-hover/sidebar:inline text-xs font-medium whitespace-nowrap">Create New Site</span>
              </Link>
            </div>

            {/* Bottom Nav links */}
            <div className="flex flex-col py-3 gap-1 border-t border-[var(--border)]">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="mx-2.5 group-hover/sidebar:mx-2 h-9 rounded-lg flex items-center gap-3 justify-center group-hover/sidebar:justify-start px-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition-all duration-200 shrink-0"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                <span className="hidden group-hover/sidebar:inline text-xs font-medium text-gray-700 dark:text-[var(--text-secondary)] whitespace-nowrap">
                  Theme: {theme === 'dark' ? 'Dark' : 'Light'}
                </span>
              </button>
              <Link href="/dashboard/help" className="mx-2.5 group-hover/sidebar:mx-2 h-9 rounded-lg flex items-center gap-3 justify-center group-hover/sidebar:justify-start px-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition-all duration-200 shrink-0">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span className="hidden group-hover/sidebar:inline text-xs font-medium text-gray-700 dark:text-[var(--text-secondary)] whitespace-nowrap">Help Center</span>
              </Link>
              <Link href="/dashboard/settings" className="mx-2.5 group-hover/sidebar:mx-2 h-9 rounded-lg flex items-center gap-3 justify-center group-hover/sidebar:justify-start px-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition-all duration-200 shrink-0">
                <Settings className="w-4 h-4 shrink-0" />
                <span className="hidden group-hover/sidebar:inline text-xs font-medium text-gray-700 dark:text-[var(--text-secondary)] whitespace-nowrap">Settings</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ═══ LEFT PANEL ═══ */}
        <div className="flex flex-col flex-1 min-w-80 max-w-[50%] border-r border-[var(--border)] bg-[var(--bg-primary)]">

          {/* ── Editor Header ── */}
          <div className="shrink-0 h-14 border-b border-[var(--border)] flex items-center px-3 gap-2">
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] disabled:opacity-30 disabled:pointer-events-none transition">
                <Undo2 className="w-4 h-4" />
              </button>
              <button onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] disabled:opacity-30 disabled:pointer-events-none transition">
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
            {/* Site name — centered */}
            <div className="flex-1 flex items-center justify-center min-w-0">
              <div className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[180px]">
                  {displayTitle}
                </h1>
              </div>
            </div>
            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-semibold bg-pink-600 hover:bg-pink-500 disabled:opacity-60 text-white px-3.5 py-2 rounded-lg shadow-sm shadow-pink-500/20 transition-all shrink-0"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saved ? 'Saved' : 'Save Changes'}
            </button>
          </div>

          {/* ── Tab Bar ── */}
          <div className={`shrink-0 border-[var(--border)] transition-all duration-300 ease-in-out origin-top overflow-hidden ${isScrolled ? 'max-h-0 opacity-0 border-b-0' : 'max-h-24 opacity-100 border-b'}`}>
            <div className="px-3 py-3">
              <div className="flex gap-1.5 p-1.5 bg-gray-100/80 dark:bg-[var(--bg-secondary)]/50 rounded-2xl border border-gray-200/50 dark:border-[var(--border)]/50 overflow-x-auto hide-scrollbar">
                {TABS.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`group relative flex-1 min-w-[72px] flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-semibold transition-all duration-300
                      ${active
                          ? `${tab.activeBg} ${tab.activeColor} ${tab.activeBorder} shadow-sm scale-100`
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/50 scale-[0.98] hover:scale-100'
                        }`}
                    >
                      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                        <tab.icon className="w-4 h-4" strokeWidth={active ? 2.5 : 2} />
                      </div>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Editor Content (scrollable) ── */}
          <div
            className="flex-1 overflow-y-auto p-5 space-y-5"
            onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 20)}
          >
            {loading ? (
              <div className="w-full space-y-8 opacity-70">
                <div className="space-y-3">
                  <div className="h-4 w-28 bg-gray-200 dark:bg-[var(--bg-secondary)] rounded animate-pulse" />
                  <div className="h-11 w-full bg-gray-200 dark:bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-[var(--bg-secondary)] rounded animate-pulse" />
                  <div className="h-28 w-full bg-gray-200 dark:bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-40 bg-gray-200 dark:bg-[var(--bg-secondary)] rounded animate-pulse" />
                  <div className="flex gap-4">
                    <div className="h-24 w-24 shrink-0 rounded-full bg-gray-200 dark:bg-[var(--bg-secondary)] animate-pulse" />
                    <div className="h-24 flex-1 rounded-xl bg-gray-200 dark:bg-[var(--bg-secondary)] animate-pulse" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-48 bg-gray-200 dark:bg-[var(--bg-secondary)] rounded animate-pulse" />
                  <div className="h-12 w-full bg-gray-200 dark:bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                {/* ── Profile Tab ── */}
                {activeTab === 'profile' && (
                  <BioProfileEditor data={profile} onChange={setProfile} />
                )}

                {/* ── Templates Tab ── */}
                {activeTab === 'templates' && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs text-gray-500">Pick a template to set your page&apos;s layout, theme, and sections instantly.</p>
                    </div>

                    {/* Category groups */}
                    {(['starter', 'creative', 'business', 'social'] as const).map(cat => {
                      const catTemplates = TEMPLATES.filter(t => t.category === cat);
                      if (catTemplates.length === 0) return null;
                      const catLabel = { starter: 'Get Started', creative: 'Creative', business: 'Business', social: 'Social & Store' }[cat];
                      return (
                        <div key={cat} className="space-y-3">
                          <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{catLabel}</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {catTemplates.map(tpl => {
                              const btnRadius = tpl.buttonStyle === 'pill' ? '9999px' : tpl.buttonStyle === 'sharp' ? '0' : tpl.borderRadius === 'lg' ? '12px' : tpl.borderRadius === 'sm' ? '4px' : tpl.borderRadius === 'none' ? '0' : '8px';
                              const bgStyle = tpl.backgroundType === 'gradient' ? tpl.backgroundValue : tpl.preview.bg;
                              const isGlass = tpl.cardStyle === 'glass';
                              const { accent, text: textC, card } = tpl.preview;
                              const avatarRadius = tpl.profileShape === 'square' ? '3px' : tpl.profileShape === 'rounded' ? '6px' : '9999px';

                              return (
                                <button
                                  key={tpl.name}
                                  onClick={() => applyTemplate(tpl)}
                                  className="group relative flex flex-col items-center text-left transition-all"
                                >
                                  {tpl.tag && (
                                    <span className="absolute -top-1.5 right-2 px-2 py-0.5 bg-pink-500 text-white text-[7px] font-bold rounded-full uppercase z-10 shadow-sm shadow-pink-500/30">
                                      {tpl.tag}
                                    </span>
                                  )}

                                  {/* Phone frame */}
                                  <div className="w-full rounded-[1.5rem] border-[6px] border-[var(--border)] group-hover:border-pink-100 dark:group-hover:border-pink-900/40 overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-pink-500/20 group-hover:-translate-y-1">
                                    {/* Inner bezel */}
                                    <div className="w-full bg-white dark:bg-black overflow-hidden relative" style={{ borderRadius: '1.1rem' }}>
                                      {/* Notch bar */}
                                      <div className="h-4 flex items-center justify-center" style={{ background: bgStyle }}>
                                        <div className="w-10 h-1.5 rounded-full" style={{ backgroundColor: textC, opacity: 0.15 }} />
                                      </div>

                                      {/* Screen content */}
                                      <div className="px-3.5 pb-3 pt-1 flex flex-col items-center gap-[5px] overflow-hidden" style={{ background: bgStyle, minHeight: '180px' }}>
                                        {tpl.blocks.slice(0, 8).map((b, i) => {
                                          if (b.link_type === 'header') return (
                                            <div key={i} className="flex flex-col items-center gap-[3px] mb-1 shrink-0">
                                              <div className="w-7 h-7 shadow-sm" style={{ backgroundColor: accent, borderRadius: avatarRadius, border: `1.5px solid ${bgStyle === textC ? accent : textC}20` }} />
                                              <div className="w-16 h-[5px] rounded-full mt-0.5" style={{ backgroundColor: textC, opacity: 0.85 }} />
                                              <div className="w-11 h-[3px] rounded-full" style={{ backgroundColor: textC, opacity: 0.35 }} />
                                            </div>
                                          );
                                          if (b.link_type === 'heading') return (
                                            <div key={i} className="w-14 h-[4px] rounded-sm self-start shrink-0 mt-1" style={{ backgroundColor: textC, opacity: 0.55 }} />
                                          );
                                          if (b.link_type === 'url') {
                                            const featured = b.style_variant === 'featured';
                                            return (
                                              <div key={i} className="w-full shrink-0 flex items-center gap-[5px] px-[5px]" style={{
                                                height: featured ? '14px' : '12px',
                                                backgroundColor: isGlass ? card : card,
                                                borderRadius: btnRadius,
                                                border: tpl.buttonStyle === 'outline' ? `1px solid ${accent}` : tpl.cardStyle === 'bordered' ? `1px solid ${textC}25` : 'none',
                                                boxShadow: tpl.buttonStyle === 'shadow' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                                backdropFilter: isGlass ? 'blur(4px)' : 'none',
                                              }}>
                                                <div className="w-[6px] h-[6px] rounded-sm shrink-0" style={{ backgroundColor: accent, opacity: 0.5 }} />
                                                <div className="flex-1 h-[3px] rounded-full" style={{ backgroundColor: textC, opacity: 0.4 }} />
                                              </div>
                                            );
                                          }
                                          if (b.link_type === 'divider') return (
                                            <div key={i} className="w-10 shrink-0 my-[2px]" style={{ height: '1px', backgroundColor: textC, opacity: 0.12 }} />
                                          );
                                          if (b.link_type === 'text') return (
                                            <div key={i} className="flex flex-col gap-[2px] w-full px-1 shrink-0">
                                              <div className="w-full h-[3px] rounded-full" style={{ backgroundColor: textC, opacity: 0.2 }} />
                                              <div className="w-2/3 h-[3px] rounded-full" style={{ backgroundColor: textC, opacity: 0.12 }} />
                                            </div>
                                          );
                                          if (b.link_type === 'social_icons') return (
                                            <div key={i} className="flex gap-[4px] justify-center shrink-0 my-[2px]">
                                              {Array.from({ length: Math.min(b.metadata?.links?.length || 4, 5) }).map((_, j) => (
                                                <div key={j} className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: accent, opacity: 0.6 }} />
                                              ))}
                                            </div>
                                          );
                                          if (b.link_type === 'lead_form') return (
                                            <div key={i} className="w-full flex gap-[4px] shrink-0">
                                              <div className="flex-1 h-[11px] rounded-sm" style={{ backgroundColor: card, border: `1px solid ${textC}15` }} />
                                              <div className="w-9 h-[11px] shrink-0" style={{ backgroundColor: accent, opacity: 0.8, borderRadius: btnRadius }} />
                                            </div>
                                          );
                                          if (b.link_type === 'banner') return (
                                            <div key={i} className="w-full h-[14px] shrink-0 flex items-center justify-between px-[5px]" style={{ backgroundColor: b.metadata?.bg_color || accent, opacity: 0.8, borderRadius: btnRadius }}>
                                              <div className="w-10 h-[3px] rounded-full bg-white" style={{ opacity: 0.7 }} />
                                              <div className="w-6 h-[7px] rounded-sm bg-white" style={{ opacity: 0.4 }} />
                                            </div>
                                          );
                                          if (b.link_type === 'space') return <div key={i} className="h-[4px] shrink-0" />;
                                          return <div key={i} className="w-full h-[8px] rounded-sm shrink-0" style={{ backgroundColor: card }} />;
                                        })}
                                      </div>

                                      {/* Bottom nav dots */}
                                      <div className="h-3 flex items-center justify-center" style={{ background: bgStyle }}>
                                        <div className="w-8 h-[3px] rounded-full" style={{ backgroundColor: textC, opacity: 0.12 }} />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Label */}
                                  <div className="w-full mt-3 px-1">
                                    <p className="text-xs font-semibold text-[var(--text-primary)]">{tpl.name}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{tpl.description}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Section Tab (formerly Links) ── */}
                {activeTab === 'section' && (
                  <BioLinksEditor links={links} onChange={setLinks} products={products} />
                )}

                {/* ── Appearance Tab ── */}
                {activeTab === 'appearance' && (
                  <BioAppearanceEditor
                    data={appearance}
                    onChange={setAppearance}
                    palette={palette}
                    onPaletteChange={updatePalette}
                  />
                )}

                {/* ── Settings Tab ── */}
                {activeTab === 'settings' && (
                  <div className="space-y-5">

                    {/* URL Slug */}
                    <div className="bg-white dark:bg-[var(--bg-secondary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 space-y-5 shadow-sm">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <Globe2 className="w-4 h-4 text-pink-500" /> Public URL
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">Your link-in-bio page address</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl mb-2 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-500/10 transition-all duration-300">
                          <span className="text-[13px] font-medium text-gray-400 shrink-0 select-none">digione.ai/link/</span>
                          <input
                            type="text"
                            value={slug}
                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            className="flex-1 bg-transparent text-[13px] font-semibold outline-none text-[var(--text-primary)] placeholder-gray-400 min-w-0"
                            placeholder="your-name"
                          />
                        </div>
                        <div className="flex items-center gap-2 min-h-5">
                          {slugStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                          {slugStatus === 'idle' && slug === originalSlug && slug.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Your current URL</span>
                          )}
                          {slugStatus === 'available' && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Available — save to apply</span>
                          )}
                          {slugStatus === 'taken' && (
                            <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" /> Already taken</span>
                          )}
                          {slugStatus === 'invalid' && (
                            <span className="text-xs text-red-500">3+ chars, letters, numbers, hyphens only</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SEO & Social Sharing */}
                    <div className="bg-white dark:bg-[var(--bg-secondary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 space-y-5 shadow-sm">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <Search className="w-4 h-4 text-pink-500" /> SEO & Social Sharing
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">How your page looks when shared on WhatsApp, Twitter, etc.</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[13px] font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">
                            Page Title <span className="text-gray-400 font-normal ml-1">(overrides your display name)</span>
                          </label>
                          <input
                            type="text"
                            value={seo.title}
                            onChange={e => setSeo(s => ({ ...s, title: e.target.value }))}
                            maxLength={70}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl text-[13px] focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none text-[var(--text-primary)] placeholder-gray-400 transition-all duration-300"
                            placeholder={profile.displayName || 'Your Name · Link in Bio'}
                          />
                          <p className="text-[11px] font-medium text-gray-400 mt-1.5">{seo.title.length}/70 characters</p>
                        </div>

                        <div>
                          <label className="block text-[13px] font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">
                            Meta Description <span className="text-gray-400 font-normal ml-1">(overrides your bio)</span>
                          </label>
                          <textarea
                            value={seo.description}
                            onChange={e => setSeo(s => ({ ...s, description: e.target.value }))}
                            maxLength={160}
                            rows={2}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl text-[13px] focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none text-[var(--text-primary)] placeholder-gray-400 transition-all duration-300 resize-none"
                            placeholder={profile.bioText || 'A short description of your page...'}
                          />
                          <p className="text-[11px] font-medium text-gray-400 mt-1.5">{seo.description.length}/160 characters</p>
                        </div>

                        <div>
                          <label className="block text-[13px] font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">
                            Share Preview Image <span className="text-gray-400 font-normal ml-1">(OG image)</span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={seo.image}
                              onChange={e => setSeo(s => ({ ...s, image: e.target.value }))}
                              className="flex-1 px-4 py-3 bg-gray-50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl text-[13px] focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none text-[var(--text-primary)] placeholder-gray-400 transition-all duration-300"
                              placeholder="https://... (defaults to your avatar)"
                            />
                          </div>
                          {(seo.image || profile.avatarUrl) && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-[var(--border)] h-16 bg-[var(--bg-secondary)]">
                              <img src={seo.image || profile.avatarUrl} alt="OG preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Live share preview card */}
                      {(seo.title || profile.displayName) && (
                        <div className="mt-2">
                          <p className="text-[10px] font-medium text-gray-400 mb-2 uppercase tracking-wide">Preview when shared</p>
                          <div className="border border-gray-200 dark:border-[var(--border)] rounded-xl overflow-hidden text-left">
                            {(seo.image || profile.avatarUrl) && (
                              <div className="h-24 bg-gray-100 dark:bg-[var(--bg-secondary)]">
                                <img src={seo.image || profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="px-3 py-2.5">
                              <p className="text-[10px] text-gray-400 mb-0.5">digione.ai</p>
                              <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">
                                {seo.title || profile.displayName || 'Your page title'}
                              </p>
                              <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 mt-0.5">
                                {seo.description || profile.bioText || 'Your page description will appear here.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Activate / Deactivate Link */}
                    <div className="bg-white dark:bg-[var(--bg-secondary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            {isPublished ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            )}
                            {isPublished ? 'Link is Active' : 'Link is Inactive'}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {isPublished
                              ? 'Your page is live and accessible to visitors.'
                              : 'Your page is hidden. Visitors will see a 404 page.'}
                          </p>
                        </div>
                        <button
                          role="switch"
                          aria-checked={isPublished}
                          aria-label={isPublished ? 'Deactivate link' : 'Activate link'}
                          onClick={() => setIsPublished(!isPublished)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublished ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                            }`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL — full-height preview ═══ */}
        <div className="flex-1 flex flex-col bg-gray-100 dark:bg-[var(--bg-secondary)]">

          {/* ── Preview Header ── */}
          <div className="shrink-0 h-14 border-b border-[var(--border)] flex items-center px-4 gap-3 relative">
            {/* Open in Browser */}
            <a
              href={site ? `https://${getSiteDisplayUrl(site)}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-gray-800 dark:hover:text-[var(--text-primary)] bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] hover:border-pink-400 dark:hover:border-pink-600 px-3 py-1.5 rounded-lg transition-all shrink-0 ${!site ? 'opacity-40 pointer-events-none' : ''}`}
              title="Open in browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </a>
            {/* Copy link */}
            <button
              onClick={() => {
                if (site) {
                  navigator.clipboard.writeText(`https://${getSiteDisplayUrl(site)}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              disabled={!site}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-gray-800 dark:hover:text-[var(--text-primary)] bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] hover:border-pink-400 dark:hover:border-pink-600 px-3 py-1.5 rounded-lg transition-all shrink-0 disabled:opacity-40"
              title="Copy page link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Link'}
            </button>
            {/* Preview Page label — truly centered */}
            <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Website Preview
              </span>
            </div>
            <div className="flex-1" />
            {/* Device toggles */}
            <div className="flex items-center gap-1 bg-white dark:bg-[var(--bg-secondary)] p-1 rounded-lg border border-gray-200 dark:border-[var(--border)] shrink-0">
              {DEVICES.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDevice(d.id)}
                  className={`p-1.5 rounded-md transition ${device === d.id
                    ? 'bg-gray-100 dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  title={d.label}
                >
                  <d.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Preview iframe */}
          {(() => {
            const DESKTOP_W = 1280;
            const DESKTOP_H = Math.round(DESKTOP_W * 10 / 16); // 16:10 aspect ratio = 800px
            const isDesktop = device === 'desktop';
            const isMobile = device === 'mobile';
            const devicePx = isDesktop ? DESKTOP_W : isMobile ? 375 : 768;
            const zoom = isDesktop ? Math.min(1, previewW / DESKTOP_W) : 1;

            const BrowserChrome = () => (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-[var(--bg-secondary)] border-b border-gray-200 dark:border-[var(--border)] shrink-0">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 px-3 py-1 bg-white dark:bg-[var(--bg-secondary)] rounded-md border border-gray-200 dark:border-[var(--border)]">
                  <p className="text-[10px] text-gray-400 font-mono truncate">
                    {site ? `https://${getSiteDisplayUrl(site)}` : 'Loading...'}
                  </p>
                </div>
                <button onClick={() => setPreviewKey(Date.now())}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition" title="Refresh">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            );

            // Single container for all devices — avoids unmount/remount flash on device switch
            return (
              <div ref={previewWrapperRef} className={`flex-1 flex items-start justify-center px-6 pb-6 overflow-y-auto overflow-x-hidden ${isDesktop ? 'pt-16' : 'pt-6'}`}>
                <div
                  className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl shadow-2xl border border-gray-200 dark:border-[var(--border)] overflow-hidden flex flex-col"
                  style={{
                    width: devicePx,
                    maxWidth: '100%',
                    height: isDesktop ? DESKTOP_H : '100%',
                    zoom: isDesktop ? zoom : undefined,
                    transformOrigin: 'top left',
                  }}
                >
                  <BrowserChrome />
                  {loading ? (
                    <div className="flex-1 flex flex-col items-center pt-24 px-6 gap-5 bg-white dark:bg-[var(--bg-secondary)] border-0">
                      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[var(--bg-secondary)] animate-pulse shrink-0" />
                      <div className="w-48 h-6 rounded-md bg-gray-200 dark:bg-[var(--bg-secondary)] animate-pulse shrink-0" />
                      <div className="w-64 h-3 rounded-md bg-gray-200 dark:bg-[var(--bg-secondary)] animate-pulse shrink-0 mt-1" />

                      <div className="w-full max-w-[320px] mt-10 space-y-3.5">
                        <div className="w-full h-14 rounded-xl bg-gray-100 dark:bg-[var(--bg-secondary)] animate-pulse" />
                        <div className="w-full h-14 rounded-xl bg-gray-100 dark:bg-[var(--bg-secondary)] animate-pulse" />
                        <div className="w-full h-14 rounded-xl bg-gray-100 dark:bg-[var(--bg-secondary)] animate-pulse" />
                      </div>
                    </div>
                  ) : previewUrl ? (
                    <iframe ref={iframeRef} key={previewKey} src={previewUrl}
                      className="w-full flex-1 border-0" title="Bio Preview" />
                  ) : (
                    <div className="flex items-center justify-center flex-1 text-sm text-gray-400">No preview available</div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>{/* close flex-1 flex min-h-0 body wrapper */}
    </div>
  );
}
