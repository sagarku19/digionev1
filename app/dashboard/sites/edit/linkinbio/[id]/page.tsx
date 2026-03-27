'use client';
// Edit page: Link in Bio — custom split-screen editor.
// Mini sidebar + Left panel (header + tabs + editor) + Right panel (preview).

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import BioProfileEditor, { type BioProfileData, type SocialLink } from '@/components/dashboard/site-edit/tabs/BioProfileEditor';
import BioLinksEditor, { type BioLink } from '@/components/dashboard/site-edit/tabs/BioLinksEditor';
import BioAppearanceEditor, { type BioAppearanceData } from '@/components/dashboard/site-edit/tabs/BioAppearanceEditor';
import {
  Link2, User, LinkIcon, Sparkles, Paintbrush,
  ArrowLeft, Save, Loader2, CheckCircle2, ExternalLink,
  Settings, Monitor, Tablet, Smartphone, RefreshCw,
  XCircle, LayoutDashboard, Package, Store, BarChart2,
  Copy, Check,
} from 'lucide-react';

// ─── Device presets ──────────────────────────────────────────
const DEVICES = [
  { id: 'desktop',  icon: Monitor,    width: '100%',  label: 'Desktop' },
  { id: 'tablet',   icon: Tablet,     width: '768px', label: 'Tablet'  },
  { id: 'mobile',   icon: Smartphone, width: '375px', label: 'Mobile'  },
] as const;

// ─── Mini sidebar nav ────────────────────────────────────────
const MINI_NAV = [
  { href: '/dashboard',           icon: LayoutDashboard, label: 'Overview'  },
  { href: '/dashboard/products',  icon: Package,         label: 'Products'  },
  { href: '/dashboard/sites',     icon: Store,           label: 'Sites'     },
  { href: '/dashboard/settings',  icon: Settings,        label: 'Settings'  },
];

// ─── Tabs ────────────────────────────────────────────────────
type Tab = 'profile' | 'templates' | 'section' | 'appearance' | 'settings';
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile',    label: 'Profile',    icon: User },
  { id: 'templates',  label: 'Templates',  icon: Paintbrush },
  { id: 'section',    label: 'Section',    icon: LinkIcon },
  { id: 'appearance', label: 'Appearance', icon: Sparkles },
  { id: 'settings',   label: 'Settings',   icon: Settings },
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
      { link_type: 'email_capture', title: 'Join My Newsletter', metadata: { description: 'Get weekly tips straight to your inbox', button_text: 'Subscribe', placeholder: 'your@email.com' } },
    ],
  },
  {
    name: 'Musician',
    description: 'Spotify embed, tour banner & streaming links.',
    category: 'creative',
    preview: { bg: '#1a1a2e', accent: '#e94560', text: '#eaeaea', card: '#16213e' },
    palette: { primary: '#e94560', text: '#eaeaea', surface: '#16213e', muted: '#8b8b9e', background: '#1a1a2e' },
    layoutStyle: 'classic', buttonStyle: 'pill',
    backgroundType: 'solid', backgroundValue: '#1a1a2e',
    fontFamily: 'space-grotesk', cardStyle: 'solid', animation: 'slide-up', borderRadius: 'lg',
    blocks: [
      { link_type: 'header', title: 'Artist Name', metadata: { subtitle: 'New Album Out Now', alignment: 'center', size: 'xl' } },
      { link_type: 'spotify', metadata: { spotify_url: '', embed_type: 'track' } },
      { link_type: 'heading', title: 'Listen Everywhere', metadata: { alignment: 'center', size: 'md', show_divider: false } },
      { link_type: 'url', title: 'Apple Music', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Bandcamp', url: '', icon_type: 'external' },
      { link_type: 'social_icons', metadata: { links: [{ platform: 'spotify', url: '' }, { platform: 'instagram', url: '' }, { platform: 'youtube', url: '' }, { platform: 'tiktok', url: '' }], style: 'circle', size: 'md', alignment: 'center' } },
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
    description: 'Glassmorphic vibe with video, collabs & community signup.',
    category: 'social',
    preview: { bg: '#667eea', accent: '#FFFFFF', text: '#FFFFFF', card: 'rgba(255,255,255,0.15)' },
    palette: { primary: '#FFFFFF', text: '#FFFFFF', surface: 'rgba(255,255,255,0.12)', muted: 'rgba(255,255,255,0.7)', background: '#667eea' },
    layoutStyle: 'classic', buttonStyle: 'pill',
    backgroundType: 'gradient', backgroundValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: 'poppins', cardStyle: 'glass', animation: 'fade-in', borderRadius: 'lg', spacing: 'relaxed',
    blocks: [
      { link_type: 'header', title: 'Your Name', metadata: { subtitle: 'Content Creator & Brand Partner', alignment: 'center', size: 'xl' } },
      { link_type: 'social_icons', metadata: { links: [{ platform: 'tiktok', url: '' }, { platform: 'instagram', url: '' }, { platform: 'youtube', url: '' }, { platform: 'twitter', url: '' }], style: 'circle', size: 'lg', alignment: 'center' } },
      { link_type: 'heading', title: 'Latest Content', metadata: { alignment: 'center', size: 'md', show_divider: false } },
      { link_type: 'video_embed', metadata: { embed_url: '', aspect_ratio: '16/9', caption: '' } },
      { link_type: 'url', title: 'Brand Collaborations', url: '', icon_type: 'external', style_variant: 'featured' },
      { link_type: 'url', title: 'My Favorites on Amazon', url: '', icon_type: 'external' },
      { link_type: 'email_capture', title: 'Join My Community', metadata: { description: 'Exclusive content and early access', button_text: 'Join Free', placeholder: 'your@email.com' } },
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
    blocks: [
      { link_type: 'header', title: 'Company Name', metadata: { subtitle: 'Professional Services', alignment: 'center', size: 'xl' } },
      { link_type: 'url', title: 'Visit Our Website', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Book a Consultation', url: '', icon_type: 'external' },
      { link_type: 'url', title: 'Our Services', url: '', icon_type: 'external' },
      { link_type: 'email_capture', title: 'Get in Touch', metadata: { description: 'Leave your email and we will reach out', button_text: 'Contact Us', placeholder: 'your@email.com' } },
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
    fontFamily: 'poppins', cardStyle: 'solid', animation: 'slide-up', borderRadius: 'full', spacing: 'relaxed',
    blocks: [
      { link_type: 'header', title: 'The Weekly Brief', metadata: { subtitle: 'Curated insights on design & tech', alignment: 'center', size: 'xl' } },
      { link_type: 'text', metadata: { content: 'Join 10,000+ readers getting actionable tips every Thursday.', alignment: 'center', size: 'base' } },
      { link_type: 'email_capture', title: 'Subscribe', metadata: { description: 'Free weekly newsletter', button_text: 'Subscribe', placeholder: 'your@email.com' } },
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

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [device, setDevice] = useState<string>('mobile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [copied, setCopied] = useState(false);

  // ── Site data ──
  const [site, setSite] = useState<any>(null);

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

  // ── Products ──
  const [products, setProducts] = useState<{ id: string; name: string; price: number; thumbnail_url: string | null }[]>([]);

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

        // ── V2: Fetch from linkinbio_pages ──
        const { data: page } = await (supabase.from('linkinbio_pages' as any) as any)
          .select('*')
          .eq('site_id', siteId)
          .maybeSingle();

        if (page) {
          const theme = (page.theme as any) ?? {};
          const layout = (page.layout as any) ?? {};
          const settings = (page.settings as any) ?? {};

          setProfile({
            displayName: page.display_name ?? '',
            bioText: page.bio ?? '',
            avatarUrl: page.avatar_url ?? '',
            coverImageUrl: page.cover_url ?? '',
            socialLinks: (settings.socialLinks as SocialLink[]) ?? [],
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
          .upsert({ site_id: siteId, color_palette: palette } as any, { onConflict: 'site_id' });
      }

      // Slug
      if (slug && slug !== originalSlug) {
        await supabase.from('sites').update({ slug }).eq('id', siteId);
        setOriginalSlug(slug);
      }

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
        seo: { title: profile.displayName, description: profile.bioText || '' },
        settings: {
          showWatermark: appearance.showWatermark,
          showShareButton: appearance.showShareButton,
          socialLinks: profile.socialLinks,
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
          if (l.link_type === 'email_capture') {
            blockContent.title = l.title || null;
            blockContent.description = l.metadata?.description || null;
            blockContent.button_text = l.metadata?.button_text || null;
            blockContent.placeholder = l.metadata?.placeholder || null;
          }
          if (l.link_type === 'image') {
            blockContent.thumbnail_url = l.thumbnail_url || null;
            blockContent.link_url = l.metadata?.link_url || null;
            blockContent.alt_text = l.metadata?.alt_text || null;
            blockContent.caption = l.metadata?.caption || null;
            blockContent.border_radius = l.metadata?.border_radius || 'lg';
            blockContent.aspect_ratio = l.metadata?.aspect_ratio || 'auto';
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
            if (l.link_type === 'product' && l.metadata?.cta_text) itemMeta.cta_text = l.metadata.cta_text;
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
  }, [supabase, siteId, palette, slug, originalSlug, profile, appearance, links]);

  // ── Derived ──
  const previewUrl = site ? `${getSitePublicPath(site)}?preview=1&t=${previewKey}` : null;
  const displayTitle = profile.displayName || site?.slug || 'Untitled';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
        <span className="text-sm text-gray-500">Loading editor...</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[#060610]">

      {/* ═══ BODY — full height, panels own their headers ═══ */}
      <div className="flex-1 flex min-h-0">

        {/* ═══ MINI SIDEBAR ═══ */}
        <div className="w-14 shrink-0 relative">
          <div className="group/sidebar absolute inset-y-0 left-0 w-14 hover:w-48 bg-white dark:bg-[#0A0A1A] border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-200 overflow-hidden z-30 hover:shadow-xl hover:shadow-black/10">
            {/* Back button — h-14 aligns with panel headers */}
            <div className="h-14 shrink-0 border-b border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover/sidebar:justify-start group-hover/sidebar:px-4 gap-3">
              <button
                onClick={() => router.push('/dashboard/sites')}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="hidden group-hover/sidebar:inline text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Dashboard</span>
            </div>
            {/* Nav links */}
            <div className="flex flex-col py-3 gap-2">
              {MINI_NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="mx-2.5 group-hover/sidebar:mx-2 h-9 rounded-lg flex items-center gap-3 justify-center group-hover/sidebar:justify-start px-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 shrink-0"
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="hidden group-hover/sidebar:inline text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ LEFT PANEL ═══ */}
        <div className="flex flex-col flex-1 min-w-80 max-w-[50%] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A1A]">

        {/* ── Editor Header ── */}
        <div className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 flex items-center px-3 gap-2">
          {/* Site name — centered */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <div className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
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
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 px-3 py-2.5">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${
                    active
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Editor Content (scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Profile Tab ── */}
          {activeTab === 'profile' && (
            <BioProfileEditor data={profile} onChange={setProfile} />
          )}

          {/* ── Templates Tab ── */}
          {activeTab === 'templates' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs text-gray-500">Each template applies a complete page layout with pre-built sections, theme, and styling.</p>
              </div>

              {/* Category groups */}
              {(['starter', 'creative', 'business', 'social'] as const).map(cat => {
                const catTemplates = TEMPLATES.filter(t => t.category === cat);
                if (catTemplates.length === 0) return null;
                const catLabel = { starter: 'Get Started', creative: 'Creative', business: 'Business', social: 'Social & Store' }[cat];
                return (
                  <div key={cat} className="space-y-2.5">
                    <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{catLabel}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {catTemplates.map(tpl => {
                        const btnRadius = tpl.buttonStyle === 'pill' ? '9999px' : tpl.buttonStyle === 'sharp' ? '0' : tpl.borderRadius === 'full' ? '9999px' : tpl.borderRadius === 'lg' ? '12px' : tpl.borderRadius === 'sm' ? '4px' : tpl.borderRadius === 'none' ? '0' : '8px';
                        const bgStyle = tpl.backgroundType === 'gradient' ? tpl.backgroundValue : tpl.preview.bg;
                        const isGlass = tpl.cardStyle === 'glass';
                        return (
                          <button
                            key={tpl.name}
                            onClick={() => applyTemplate(tpl)}
                            className="group relative rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-600 overflow-hidden transition-all hover:shadow-lg text-left"
                          >
                            {tpl.tag && (
                              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-pink-500 text-white text-[8px] font-bold rounded-md uppercase z-10">
                                {tpl.tag}
                              </span>
                            )}
                            {/* Block wireframe preview */}
                            <div className="h-40 px-4 py-3 flex flex-col items-center gap-[3px] overflow-hidden" style={{ background: bgStyle }}>
                              {tpl.blocks.slice(0, 8).map((b, i) => {
                                const accent = tpl.preview.accent;
                                const text = tpl.preview.text;
                                const card = tpl.preview.card;

                                if (b.link_type === 'header') return (
                                  <div key={i} className="flex flex-col items-center gap-[2px] mb-0.5 shrink-0">
                                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: accent }} />
                                    <div className="w-14 h-[5px] rounded-full" style={{ backgroundColor: text, opacity: 0.8 }} />
                                    <div className="w-10 h-[3px] rounded-full" style={{ backgroundColor: text, opacity: 0.4 }} />
                                  </div>
                                );
                                if (b.link_type === 'heading') return (
                                  <div key={i} className="w-12 h-[4px] rounded-sm self-start shrink-0 mt-0.5" style={{ backgroundColor: text, opacity: 0.6 }} />
                                );
                                if (b.link_type === 'url') return (
                                  <div key={i} className="w-full h-[10px] shrink-0" style={{
                                    backgroundColor: isGlass ? card : card,
                                    borderRadius: btnRadius,
                                    border: tpl.buttonStyle === 'outline' ? `1px solid ${accent}` : tpl.cardStyle === 'bordered' ? `1px solid ${text}30` : 'none',
                                    boxShadow: tpl.buttonStyle === 'shadow' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                    backdropFilter: isGlass ? 'blur(4px)' : 'none',
                                  }} />
                                );
                                if (b.link_type === 'divider') return (
                                  <div key={i} className="w-12 shrink-0 my-[1px]" style={{ height: '1px', backgroundColor: text, opacity: 0.15 }} />
                                );
                                if (b.link_type === 'text') return (
                                  <div key={i} className="flex flex-col gap-[2px] w-full px-1 shrink-0">
                                    <div className="w-full h-[3px] rounded-full" style={{ backgroundColor: text, opacity: 0.25 }} />
                                    <div className="w-3/4 h-[3px] rounded-full" style={{ backgroundColor: text, opacity: 0.15 }} />
                                  </div>
                                );
                                if (b.link_type === 'social_icons') return (
                                  <div key={i} className="flex gap-[3px] justify-center shrink-0 my-[1px]">
                                    {Array.from({ length: Math.min(b.metadata?.links?.length || 4, 4) }).map((_, j) => (
                                      <div key={j} className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: accent, opacity: 0.7 }} />
                                    ))}
                                  </div>
                                );
                                if (b.link_type === 'email_capture') return (
                                  <div key={i} className="w-full flex gap-[3px] shrink-0">
                                    <div className="flex-1 h-[10px] rounded-sm" style={{ backgroundColor: card, border: `1px solid ${text}20` }} />
                                    <div className="w-8 h-[10px] rounded-sm" style={{ backgroundColor: accent, opacity: 0.8 }} />
                                  </div>
                                );
                                if (b.link_type === 'spotify') return (
                                  <div key={i} className="w-full h-[12px] rounded-sm shrink-0" style={{ backgroundColor: '#1DB954', opacity: 0.6 }} />
                                );
                                if (b.link_type === 'video_embed') return (
                                  <div key={i} className="w-full h-[18px] rounded-sm shrink-0 flex items-center justify-center" style={{ backgroundColor: `${text}15` }}>
                                    <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: `6px solid ${accent}` }} />
                                  </div>
                                );
                                if (b.link_type === 'banner') return (
                                  <div key={i} className="w-full h-[12px] rounded-sm shrink-0" style={{ backgroundColor: b.metadata?.bg_color || accent, opacity: 0.75 }} />
                                );
                                return <div key={i} className="w-full h-[8px] rounded-sm shrink-0" style={{ backgroundColor: card }} />;
                              })}
                            </div>
                            {/* Label + description */}
                            <div className="px-3 py-2 bg-white dark:bg-[#0A0A1A] border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white">{tpl.name}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{tpl.description}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                                  {tpl.blocks.length} sections
                                </span>
                                {tpl.blocks.some(b => b.link_type === 'email_capture') && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-500 font-medium">email</span>
                                )}
                                {tpl.blocks.some(b => b.link_type === 'spotify' || b.link_type === 'video_embed') && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/10 text-purple-500 font-medium">media</span>
                                )}
                              </div>
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
              <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-pink-500" /> URL Slug
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Customize your public URL</p>
                </div>
                <div>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm"
                    placeholder="my-bio-page"
                  />
                  <div className="flex items-center gap-2 mt-2 min-h-5">
                    {slugStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                    {slugStatus === 'idle' && slug === originalSlug && slug.length > 0 && (
                      <span className="text-xs text-gray-400">digione.in/link/{slug}</span>
                    )}
                    {slugStatus === 'available' && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Available</span>
                    )}
                    {slugStatus === 'taken' && (
                      <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" /> Already taken</span>
                    )}
                    {slugStatus === 'invalid' && (
                      <span className="text-xs text-red-500">3+ chars, lowercase letters, numbers, hyphens</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT PANEL — full-height preview ═══ */}
      <div className="flex-1 flex flex-col bg-gray-100 dark:bg-[#080818]">

        {/* ── Preview Header ── */}
        <div className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3">
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
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-600 px-3 py-1.5 rounded-lg transition-all shrink-0 disabled:opacity-40"
            title="Copy page link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          {/* Preview Page label — centered */}
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Website Preview
            </span>
          </div>
          {/* Device toggles */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
            {DEVICES.map(d => (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                className={`p-1.5 rounded-md transition ${
                  device === d.id
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
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
        <div className="flex-1 flex items-start justify-center px-6 pb-6 overflow-auto">
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 flex flex-col"
            style={{
              width: DEVICES.find(d => d.id === device)?.width ?? '100%',
              maxWidth: '100%',
              height: '100%',
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 px-3 py-1 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] text-gray-400 font-mono truncate">
                  {site ? `https://${getSiteDisplayUrl(site)}` : 'Loading...'}
                </p>
              </div>
              <button
                onClick={() => setPreviewKey(Date.now())}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* iframe */}
            {previewUrl ? (
              <iframe
                ref={iframeRef}
                key={previewKey}
                src={previewUrl}
                className="w-full flex-1 border-0"
                title="Bio Preview"
              />
            ) : (
              <div className="flex items-center justify-center flex-1 text-sm text-gray-400">
                No preview available
              </div>
            )}
          </div>
        </div>
      </div>
      </div>{/* close flex-1 flex min-h-0 body wrapper */}
    </div>
  );
}
