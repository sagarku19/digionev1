'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import { useProducts } from '@/hooks/useProducts';
import { revalidateStorefrontPaths } from '@/app/actions/revalidate';

import type { SinglePageContentData } from '@/src/components/dashboard/site-edit/tabs/singlepage/singlepage-types';
import SinglePageLogoEditor from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageLogoEditor';
import SinglePageProductEditor from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageProductEditor';
import SinglePageContentEditor from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageContentEditor';
import SinglePageHeroEditor from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageHeroEditor';
import SinglePageTrustEditor from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageTrustEditor';
import SinglePageTemplateEditor from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageTemplateEditor';
import BioAppearanceEditor, { type BioAppearanceData } from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageAppearanceEditor';
import SinglePageSocialEditor from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageSocialEditor';
import SinglePageCheckoutEditor from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageCheckoutEditor';
import SinglePageSettingsEditor, { type SinglePageSettingsData } from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageSettingsEditor';
import SinglePageAdvancedEditor from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageAdvancedEditor';
import {
  Layers, Settings, Palette,
  ArrowLeft, Save, Loader2, CheckCircle2, ExternalLink,
  Monitor, Tablet, Smartphone, RefreshCw,
  XCircle, Copy, Check, Globe2, Search, Sparkles,
  LayoutDashboard, Package, Store, Plus, Moon, Sun, HelpCircle,
  Undo2, Redo2, ImagePlus, ShieldCheck, ListChecks,
  Image, FileText, Share2, ShoppingCart, Terminal
} from 'lucide-react';
import { useTheme } from '@/contexts/DashboardThemeContext';

type Tab = 'logo' | 'product' | 'content' | 'template' | 'appearance' | 'social' | 'checkout' | 'settings' | 'advanced';

const TABS: { id: Tab; label: string; icon: any; activeBg: string; activeColor: string; activeBorder: string }[] = [
  { id: 'logo', label: 'Logo', icon: Image, activeBg: 'bg-indigo-50 dark:bg-indigo-500/10', activeColor: 'text-indigo-600 dark:text-indigo-300', activeBorder: 'border border-indigo-200 dark:border-indigo-500/30' },
  { id: 'product', label: 'Product', icon: Package, activeBg: 'bg-blue-50 dark:bg-blue-500/10', activeColor: 'text-blue-600 dark:text-blue-300', activeBorder: 'border border-blue-200 dark:border-blue-500/30' },
  { id: 'content', label: 'Content', icon: FileText, activeBg: 'bg-emerald-50 dark:bg-emerald-500/10', activeColor: 'text-emerald-600 dark:text-emerald-300', activeBorder: 'border border-emerald-200 dark:border-emerald-500/30' },
  { id: 'template', label: 'Template', icon: Sparkles, activeBg: 'bg-indigo-50 dark:bg-indigo-500/10', activeColor: 'text-indigo-600 dark:text-indigo-300', activeBorder: 'border border-indigo-200 dark:border-indigo-500/30' },
  { id: 'appearance', label: 'Appearance', icon: Palette, activeBg: 'bg-rose-50 dark:bg-rose-500/10', activeColor: 'text-rose-600 dark:text-rose-300', activeBorder: 'border border-rose-200 dark:border-rose-500/30' },
  { id: 'social', label: 'Social', icon: Share2, activeBg: 'bg-violet-50 dark:bg-violet-500/10', activeColor: 'text-violet-600 dark:text-violet-300', activeBorder: 'border border-violet-200 dark:border-violet-500/30' },
  { id: 'checkout', label: 'Checkout', icon: ShoppingCart, activeBg: 'bg-orange-50 dark:bg-orange-500/10', activeColor: 'text-orange-600 dark:text-orange-300', activeBorder: 'border border-orange-200 dark:border-orange-500/30' },
  { id: 'settings', label: 'Settings', icon: Settings, activeBg: 'bg-gray-100 dark:bg-gray-800', activeColor: 'text-gray-900 dark:text-white', activeBorder: 'border border-gray-300 dark:border-gray-600' },
  { id: 'advanced', label: 'Advanced', icon: Terminal, activeBg: 'bg-purple-50 dark:bg-purple-500/10', activeColor: 'text-purple-600 dark:text-purple-300', activeBorder: 'border border-purple-200 dark:border-purple-500/30' },
];

export default function EditSinglePagePage() {
  const params = useParams();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const siteId = params.id as string;
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { products } = useProducts();

  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [previewW, setPreviewW] = useState(0);

  useEffect(() => {
    const ob = new ResizeObserver(entries => {
      setPreviewW(entries[0]?.contentRect.width || 0);
    });
    const current = previewWrapperRef.current;
    if (current) ob.observe(current);
    return () => ob.disconnect();
  }, []);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<Tab>('logo');
  const [tabSidebarOpen, setTabSidebarOpen] = useState(true);
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

  // ── Content state ──
  const [content, setContent] = useState<SinglePageContentData>({
    title: '',
    description: '',
    heroImage: '',
    videoUrl: '',
    stats: [],
    productId: null,
    upsellProductIds: [],
    fakePrice: 0,
    features: [],
    whatsIncluded: [],
    contentBlocks: [],
    creatorProfile: { name: '', avatarUrl: '', bio: '' },
    faqs: [],
    testimonials: [],
    logoUrl: '',
    logoShape: 'free',
    headerText: '',
    headerAlignment: 'center',
    showLogo: true,
    headerStyle: 'standard',
    logoPlacement: 'top-bar',
    logoHeaderGap: 'md',
    headerDivider: false,
    headerWidth: 'full',
    socialLinks: [],
    socialDisplayStyle: 'icons-only',
    socialPosition: 'footer',
    checkoutStyle: 'embedded',
    checkoutAlignment: 'center',
    ctaText: '',
    ctaSubtext: '',
    ctaButtonStyle: 'solid',
    ctaButtonSize: 'lg',
    showTrustBadges: true,
    trustBadges: [],
    showPaymentIcons: true,
    customCss: '',
    customJs: '',
    customHeadTags: '',
    contactEmail: '',
    contactMobile: '',
    contactWhatsApp: '',
    redirectAfterPurchase: '',
    passwordProtection: false,
    pagePassword: '',
    analyticsGoogleId: '',
    analyticsFbPixelId: '',
  });

  // ── Settings state ──
  const [siteSettings, setSiteSettings] = useState<SinglePageSettingsData>({
    showBuyNow: true,
    showAddToCart: true,
    enableReviews: false,
    countdownEnd: '',
    passwordProtection: false,
    pagePassword: '',
    analyticsGoogleId: '',
    analyticsFbPixelId: '',
  });

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
    headingStyle: 'minimal',
    sectionSpacing: 'comfortable',
    shadowIntensity: 'medium',
  });

  // ── SEO ──
  const [seo, setSeo] = useState({ title: '', description: '', image: '' });

  // ── Undo / Redo ──
  type EditorSnapshot = { content: SinglePageContentData; settings: SinglePageSettingsData; appearance: BioAppearanceData; palette: Record<string, string>; seo: { title: string; description: string; image: string } };
  const historyRef = useRef<EditorSnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);

  const pushSnapshot = useCallback(() => {
    if (isRestoringRef.current) return;
    const snap: EditorSnapshot = {
      content: JSON.parse(JSON.stringify(content)),
      settings: JSON.parse(JSON.stringify(siteSettings)),
      appearance: { ...appearance },
      palette: { ...palette },
      seo: { ...seo },
    };
    const idx = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, [content, siteSettings, appearance, palette, seo]);

  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(pushSnapshot, 400);
    return () => { if (pushTimerRef.current) clearTimeout(pushTimerRef.current); };
  }, [content, siteSettings, appearance, palette, seo, loading, pushSnapshot]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isRestoringRef.current = true;
    historyIndexRef.current -= 1;
    const snap = historyRef.current[historyIndexRef.current];
    setContent(snap.content);
    setSiteSettings(snap.settings);
    setAppearance(snap.appearance);
    setPalette(snap.palette);
    setSeo(snap.seo);
    requestAnimationFrame(() => { isRestoringRef.current = false; });
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isRestoringRef.current = true;
    historyIndexRef.current += 1;
    const snap = historyRef.current[historyIndexRef.current];
    setContent(snap.content);
    setSiteSettings(snap.settings);
    setAppearance(snap.appearance);
    setPalette(snap.palette);
    setSeo(snap.seo);
    requestAnimationFrame(() => { isRestoringRef.current = false; });
  }, []);

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

        const { data: page } = await supabase.from('site_singlepage').select('*').eq('site_id', siteId).maybeSingle();

        if (page) {
          const pageMeta = page.metadata as any || {};

          setContent({
            title: page.title || '',
            description: page.description || '',
            heroImage: page.hero_image_url || '',
            videoUrl: pageMeta?.video_url || '',
            stats: pageMeta?.stats || [],
            productId: page.product_id || null,
            upsellProductIds: pageMeta?.upsell_product_ids || [],
            fakePrice: pageMeta?.fake_price || 0,
            features: pageMeta?.features || [],
            whatsIncluded: (page.guarantee_badges as string[]) || [],
            contentBlocks: pageMeta?.content_blocks || [],
            creatorProfile: pageMeta?.creator_profile || { name: '', avatarUrl: '', bio: '' },
            faqs: (page.faq_items as any[]) || [],
            testimonials: (page.testimonials as any[]) || [],
            logoUrl: pageMeta?.logo_url || '',
            logoShape: pageMeta?.logo_shape || 'free',
            headerText: pageMeta?.header_text || '',
            headerAlignment: pageMeta?.header_alignment || 'center',
            showLogo: pageMeta?.show_logo ?? true,
            headerStyle: pageMeta?.header_style || 'standard',
            logoPlacement: pageMeta?.logo_placement || 'top-bar',
            logoHeaderGap: pageMeta?.logo_header_gap || 'md',
            headerDivider: pageMeta?.header_divider ?? false,
            headerWidth: pageMeta?.header_width || 'full',
            socialLinks: pageMeta?.social_links || [],
            socialDisplayStyle: pageMeta?.social_display_style || 'icons-only',
            socialPosition: pageMeta?.social_position || 'footer',
            checkoutStyle: pageMeta?.checkout_style || 'embedded',
            checkoutAlignment: pageMeta?.checkout_alignment || 'center',
            ctaText: pageMeta?.cta_text || '',
            ctaSubtext: pageMeta?.cta_subtext || '',
            ctaButtonStyle: pageMeta?.cta_button_style || 'solid',
            ctaButtonSize: pageMeta?.cta_button_size || 'lg',
            showTrustBadges: pageMeta?.show_trust_badges ?? true,
            trustBadges: pageMeta?.trust_badges || [],
            showPaymentIcons: pageMeta?.show_payment_icons ?? true,
            customCss: pageMeta?.custom_css || '',
            customJs: pageMeta?.custom_js || '',
            customHeadTags: pageMeta?.custom_head_tags || '',
            contactEmail: pageMeta?.contact_email || '',
            contactMobile: pageMeta?.contact_mobile || '',
            contactWhatsApp: pageMeta?.contact_whatsapp || '',
            redirectAfterPurchase: pageMeta?.redirect_after_purchase || '',
            passwordProtection: pageMeta?.password_protection ?? false,
            pagePassword: pageMeta?.page_password || '',
            analyticsGoogleId: pageMeta?.analytics_google_id || '',
            analyticsFbPixelId: pageMeta?.analytics_fb_pixel_id || '',
          });

          setSiteSettings({
            showBuyNow: page.show_buy_now ?? true,
            showAddToCart: page.show_add_to_cart ?? true,
            enableReviews: page.enable_reviews ?? false,
            countdownEnd: page.countdown_end_at || '',
            passwordProtection: pageMeta?.password_protection ?? false,
            pagePassword: pageMeta?.page_password || '',
            analyticsGoogleId: pageMeta?.analytics_google_id || '',
            analyticsFbPixelId: pageMeta?.analytics_fb_pixel_id || '',
          });

          setSeo({
            title: typeof pageMeta?.custom_title === 'string' ? pageMeta.custom_title : '',
            description: page.meta_description || '',
            image: typeof pageMeta?.custom_image === 'string' ? pageMeta.custom_image : '',
          });

          const theme = (page.theme as any) ?? {};
          setAppearance({
            layoutStyle: theme.layoutStyle ?? 'classic',
            buttonStyle: theme.buttonStyle ?? 'rounded',
            backgroundType: theme.backgroundType ?? 'solid',
            backgroundValue: theme.backgroundValue ?? '',
            showWatermark: theme.showWatermark ?? true,
            showShareButton: theme.showShareButton ?? true,
            fontFamily: theme.fontFamily ?? 'system',
            cardStyle: theme.cardStyle ?? 'solid',
            animation: theme.animation ?? 'none',
            borderRadius: theme.borderRadius ?? 'md',
            spacing: theme.spacing ?? 'default',
            headingStyle: theme.headingStyle ?? 'minimal',
            sectionSpacing: theme.sectionSpacing ?? 'comfortable',
            shadowIntensity: theme.shadowIntensity ?? 'medium',
          });
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
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=singlepage`);
        const json = await res.json();
        setSlugStatus(json.available ? 'available' : 'taken');
      } catch { setSlugStatus('idle'); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, originalSlug]);

  // ── Push live content to iframe (debounced, no dep array — fires every render) ──
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestPreviewRef = useRef({ content, appearance, palette });
  latestPreviewRef.current = { content, appearance, palette };

  useEffect(() => {
    if (loading) return;
    clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(() => {
      const { content, appearance, palette } = latestPreviewRef.current;
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      try {
        iframe.contentWindow.postMessage(
          { type: 'sp-content-update', content, appearance, palette },
          window.location.origin,
        );
      } catch { /* cross-origin guard */ }
    }, 16);
    return () => clearTimeout(sendTimerRef.current);
  }); // intentionally no deps — runs every render, debounced to ~1 frame

  const handleSave = async () => {
    if (!siteId) return;
    if (slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking') {
      alert('Please fix your URL and try again.');
      return;
    }
    setSaving(true);
    setSaved(false);

    try {
      // 1. Update slug & active status
      if (slug !== originalSlug || isPublished !== site?.is_active) {
        await supabase.from('sites').update({
          slug,
          is_active: isPublished,
          updated_at: new Date().toISOString()
        }).eq('id', siteId);
        setOriginalSlug(slug);
        setSite((prev: any) => ({ ...prev, slug, is_active: isPublished }));
      }

      // 2. Upsert tokens
      const { data: currentTokens } = await supabase.from('site_design_tokens').select('id').eq('site_id', siteId).maybeSingle();
      if (currentTokens) {
        await supabase.from('site_design_tokens').update({ color_palette: palette }).eq('id', currentTokens.id);
      } else {
        const { data: user } = await supabase.auth.getUser();
        if (user.user?.id) {
          await supabase.from('site_design_tokens').insert({ site_id: siteId, creator_id: user.user.id, color_palette: palette, spacing_scale: {}, typography: {}, border_radius_scale: {} });
        }
      }

      // 3. Upsert site_singlepage
      const { data: existingSp } = await supabase.from('site_singlepage').select('id').eq('site_id', siteId).maybeSingle();

      const payload = {
        title: content.title,
        description: content.description,
        hero_image_url: content.heroImage,
        product_id: content.productId || undefined,
        guarantee_badges: content.whatsIncluded,
        faq_items: content.faqs,
        testimonials: content.testimonials,
        show_buy_now: siteSettings.showBuyNow,
        show_add_to_cart: siteSettings.showAddToCart,
        enable_reviews: siteSettings.enableReviews,
        countdown_end_at: siteSettings.countdownEnd || undefined,
        meta_description: seo.description,
        metadata: {
          custom_title: seo.title,
          custom_image: seo.image,
          video_url: content.videoUrl,
          stats: content.stats,
          fake_price: content.fakePrice,
          features: content.features,
          creator_profile: content.creatorProfile,
          upsell_product_ids: content.upsellProductIds,
          content_blocks: content.contentBlocks,
          logo_url: content.logoUrl,
          logo_shape: content.logoShape,
          header_text: content.headerText,
          header_alignment: content.headerAlignment,
          show_logo: content.showLogo,
          header_style: content.headerStyle,
          logo_placement: content.logoPlacement,
          logo_header_gap: content.logoHeaderGap,
          header_divider: content.headerDivider,
          header_width: content.headerWidth,
          social_links: content.socialLinks,
          social_display_style: content.socialDisplayStyle,
          social_position: content.socialPosition,
          checkout_style: content.checkoutStyle,
          checkout_alignment: content.checkoutAlignment,
          cta_text: content.ctaText,
          cta_subtext: content.ctaSubtext,
          cta_button_style: content.ctaButtonStyle,
          cta_button_size: content.ctaButtonSize,
          show_trust_badges: content.showTrustBadges,
          trust_badges: content.trustBadges,
          show_payment_icons: content.showPaymentIcons,
          custom_css: content.customCss,
          custom_js: content.customJs,
          custom_head_tags: content.customHeadTags,
          contact_email: content.contactEmail,
          contact_mobile: content.contactMobile,
          contact_whatsapp: content.contactWhatsApp,
          redirect_after_purchase: content.redirectAfterPurchase,
          password_protection: content.passwordProtection ?? siteSettings.passwordProtection,
          page_password: content.pagePassword ?? siteSettings.pagePassword,
          analytics_google_id: content.analyticsGoogleId ?? siteSettings.analyticsGoogleId,
          analytics_fb_pixel_id: content.analyticsFbPixelId ?? siteSettings.analyticsFbPixelId,
        },
        theme: appearance,
        updated_at: new Date().toISOString(),
      };

      if (existingSp) {
        await supabase.from('site_singlepage').update(payload).eq('site_id', siteId);
      } else {
        await supabase.from('site_singlepage').insert({ site_id: siteId, ...payload } as any);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      // Revalidate the public slug page ISR cache
      if (site) {
        revalidateStorefrontPaths([getSitePublicPath(site)]).catch(() => {});
      }

      setPreviewKey(Date.now());
    } catch (e: any) {
      console.error('Save failed', e);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const getResponsiveWidth = () => {
    if (device === 'mobile') return '375px';
    if (device === 'tablet') return '768px';
    return '100%';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[#060610]">
      {/* ═══ BODY — full height, panels own their headers ═══ */}
      <div className="flex-1 flex min-h-0">



        {/* ═══ LEFT PANEL ═══ */}
        <div className="w-1/2 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-[#0A0A1A] z-10 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_24px_-10px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white dark:bg-[#0A0A1A]">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/sites" className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                  {site?.name || slug || 'Untitled Page'}
                </h1>
                {!loading && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">All changes autosaved locally</p>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title="Toggle Theme"
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-sm"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-gray-500 hover:text-white transition-colors" /> : <Moon className="w-4 h-4 text-gray-500 hover:text-gray-900 transition-colors" />}
              </button>

              {/* Undo/Redo */}
              <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-1">
                <button onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
                  className={`p-1.5 rounded-lg transition-all ${canUndo ? 'text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 shadow-sm' : 'text-gray-300 dark:text-gray-700 opacity-50'}`}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-800" />
                <button onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
                  className={`p-1.5 rounded-lg transition-all ${canRedo ? 'text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 shadow-sm' : 'text-gray-300 dark:text-gray-700 opacity-50'}`}>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all focus:ring-4 focus:ring-pink-500/20 active:scale-95 ${saved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900'
                  }`}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>

          {/* ── Body: vertical tab sidebar + scrollable editor ── */}
          <div className="flex-1 flex min-h-0 overflow-hidden">

            {/* Vertical Tab Sidebar */}
            <div className={`shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#07071A] transition-all duration-200 ${tabSidebarOpen ? 'w-44' : 'w-14'}`}>
              {/* Collapse toggle */}
              <button
                onClick={() => setTabSidebarOpen(!tabSidebarOpen)}
                className="h-10 flex items-center justify-end pr-3 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors shrink-0"
                title={tabSidebarOpen ? 'Collapse tabs' : 'Expand tabs'}
              >
                <ArrowLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${tabSidebarOpen ? '' : 'rotate-180'}`} />
              </button>

              {/* Tab buttons */}
              <div className="flex flex-col gap-1 px-2 pb-4">
                {TABS.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      title={tab.label}
                      className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 ${active
                        ? `${tab.activeBg} ${tab.activeColor} ${tab.activeBorder} shadow-sm`
                        : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
                        } ${tabSidebarOpen ? 'justify-start' : 'justify-center'}`}
                    >
                      <tab.icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                      {tabSidebarOpen && <span className="truncate">{tab.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable editor content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loading ? (
                <div className="w-full space-y-8 opacity-70">
                  <div className="space-y-3">
                    <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="h-11 w-full bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="h-28 w-full bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="flex gap-4">
                      <div className="h-24 w-24 shrink-0 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                      <div className="h-24 flex-1 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : (
                <>

                  {/* ── Logo Tab ── */}
                  {activeTab === 'logo' && (
                    <SinglePageLogoEditor data={content} onChange={setContent} />
                  )}

                  {/* ── Product Tab ── */}
                  {activeTab === 'product' && (
                    <SinglePageProductEditor data={content} onChange={setContent} products={products} />
                  )}

                  {/* ── Content Tab ── */}
                  {activeTab === 'content' && (
                    <div className="space-y-5">
                      <SinglePageHeroEditor data={content} onChange={setContent} />
                      <SinglePageContentEditor data={content} onChange={setContent} />
                      <SinglePageTrustEditor data={content} onChange={setContent} />
                    </div>
                  )}

                  {/* ── Template Tab ── */}
                  {activeTab === 'template' && (
                    <SinglePageTemplateEditor
                      currentAppearance={appearance}
                      currentPalette={palette}
                      onApply={(newPalette, newAppearance) => {
                        setPalette(newPalette);
                        setAppearance(newAppearance);
                      }}
                    />
                  )}

                  {/* ── Appearance Tab ── */}
                  {activeTab === 'appearance' && (
                    <BioAppearanceEditor
                      data={appearance}
                      onChange={setAppearance}
                      palette={palette}
                      onPaletteChange={(key, value) => setPalette(prev => ({ ...prev, [key]: value }))}
                    />
                  )}

                  {/* ── Social Tab ── */}
                  {activeTab === 'social' && (
                    <SinglePageSocialEditor data={content} onChange={setContent} />
                  )}

                  {/* ── Checkout Tab ── */}
                  {activeTab === 'checkout' && (
                    <SinglePageCheckoutEditor data={content} onChange={setContent} />
                  )}

                  {/* ── Settings Tab ── */}
                  {activeTab === 'settings' && (
                    <div className="space-y-5">

                      {/* URL Slug */}
                      <div className="bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 space-y-5 shadow-sm">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Globe2 className="w-4 h-4 text-pink-500" /> Public URL
                          </h3>
                          <p className="text-[13px] text-gray-500 mt-1">Your landing page address</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl mb-2 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-500/10 transition-all duration-300">
                            <span className="text-[13px] font-medium text-gray-400 shrink-0 select-none">digione.ai/s/</span>
                            <input
                              type="text"
                              value={slug}
                              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                              className="flex-1 bg-transparent text-[13px] font-semibold outline-none text-gray-900 dark:text-white placeholder-gray-400 min-w-0"
                              placeholder="launch-deal"
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

                      <SinglePageSettingsEditor data={siteSettings} onChange={setSiteSettings} />

                      {/* SEO & Social Sharing */}
                      <div className="bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 space-y-5 shadow-sm">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Search className="w-4 h-4 text-pink-500" /> SEO & Social Sharing
                          </h3>
                          <p className="text-[13px] text-gray-500 mt-1">How your page looks on search engines and WhatsApp.</p>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Page Title
                            </label>
                            <input
                              type="text"
                              value={seo.title}
                              onChange={e => setSeo(s => ({ ...s, title: e.target.value }))}
                              maxLength={70}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300"
                              placeholder={content.title || 'Landing Page Title'}
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Meta Description
                            </label>
                            <textarea
                              value={seo.description}
                              onChange={e => setSeo(s => ({ ...s, description: e.target.value }))}
                              maxLength={160}
                              rows={2}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300 resize-none"
                              placeholder={content.description || 'A short pitch...'}
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Share Preview Image
                            </label>
                            <input
                              type="url"
                              value={seo.image}
                              onChange={e => setSeo(s => ({ ...s, image: e.target.value }))}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300"
                              placeholder="https://... (defaults to hero image)"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Activate / Deactivate Link */}
                      <div className="bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              {isPublished ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-400" />}
                              {isPublished ? 'Link is Active' : 'Link is Inactive'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {isPublished ? 'Your page is live and accessible to visitors.' : 'Your page is hidden. Visitors will see a 404 page.'}
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

                  {/* ── Advanced Tab ── */}
                  {activeTab === 'advanced' && (
                    <SinglePageAdvancedEditor data={content} onChange={setContent} />
                  )}
                </>
              )}
            </div>{/* end scrollable editor */}
          </div>{/* end body flex (tab sidebar + editor) */}
        </div>{/* end LEFT PANEL */}

        {/* ═══ RIGHT PANEL — full-height preview ═══ */}
        <div className="flex-1 flex flex-col bg-gray-100 dark:bg-[#080818]">

          {/* ── Preview Header ── */}
          <div className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3 relative">
            {/* Open in Browser */}
            <a
              href={site ? `https://${getSiteDisplayUrl(site)}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-600 px-3 py-1.5 rounded-lg transition-all shrink-0 ${!site ? 'opacity-40 pointer-events-none' : ''}`}
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
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-600 px-3 py-1.5 rounded-lg transition-all shrink-0 disabled:opacity-40"
              title="Copy page link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Link'}
            </button>
            {/* Preview label — truly centered */}
            <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Website Preview
              </span>
            </div>
            <div className="flex-1" />
            {/* Device toggles */}
            <div className="flex items-center gap-1 bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
              {[
                { id: 'desktop', icon: Monitor, label: 'Desktop' },
                { id: 'tablet', icon: Tablet, label: 'Tablet' },
                { id: 'mobile', icon: Smartphone, label: 'Mobile' },
              ].map(dev => (
                <button
                  key={dev.id}
                  onClick={() => setDevice(dev.id)}
                  className={`p-1.5 rounded-md transition ${device === dev.id
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  title={dev.label}
                >
                  <dev.icon className="w-4 h-4" />
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

            const previewUrl = site ? `${getSitePublicPath(site)}?preview=1&t=${previewKey}` : null;

            const BrowserChrome = () => (
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
                  className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
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
                    <div className="flex-1 flex flex-col items-center pt-24 px-6 gap-5 bg-white dark:bg-gray-900 border-0">
                      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0" />
                      <div className="w-48 h-6 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0" />
                      <div className="w-64 h-3 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0 mt-1" />

                      <div className="w-full max-w-[320px] mt-10 space-y-3.5">
                        <div className="w-full h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                        <div className="w-full h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                        <div className="w-full h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                      </div>
                    </div>
                  ) : previewUrl ? (
                    <iframe ref={iframeRef} key={previewKey} src={previewUrl}
                      className="w-full flex-1 border-0" title="Landing Page Preview" />
                  ) : (
                    <div className="flex items-center justify-center flex-1 text-sm text-gray-400">No preview available</div>
                  )}
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
