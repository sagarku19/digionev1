'use client';
/* eslint-disable @typescript-eslint/no-explicit-any --
   Editor-internal jsonb-config casts (section/block bags read with arbitrary keys,
   assigned to typed state via `??` defaults). Deferred "site-edit editor-internal
   any" work in .claude/todo-later/7; Record<string,unknown> breaks the setters. */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import { useProducts } from '@/hooks/products/useProducts';
import { revalidateStorefrontPaths } from '@/app/actions/revalidate';
import { useQueryClient } from '@tanstack/react-query';
import { useSinglePageSiteQuery } from '@/hooks/sites/useSinglePageSite';
import { useEditorHistory } from '@/hooks/site-editor/useEditorHistory';
import { useUnsavedChanges } from '@/hooks/site-editor/useUnsavedChanges';
import { useSlugCheck } from '@/hooks/site-editor/useSlugCheck';
import { saveDesignTokens } from '@/hooks/site-editor/saveDesignTokens';
import UnsavedChangesDialog from '@/src/components/dashboard/site-edit/editor/UnsavedChangesDialog';

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
import SinglePageCheckoutSettingsEditor from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageCheckoutSettingsEditor';
import SinglePageSettingsEditor, { type SinglePageSettingsData } from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageSettingsEditor';
import SinglePageAdvancedEditor from '@/src/components/dashboard/site-edit/tabs/singlepage/SinglePageAdvancedEditor';
import EditorShell from '@/src/components/dashboard/site-edit/editor/EditorShell';
import PreviewPane from '@/src/components/dashboard/site-edit/editor/PreviewPane';
import { type SidebarItem } from '@/src/components/dashboard/site-edit/editor/EditorSidebar';
import {
  Image, Package, FileText, Sparkles, Palette, Share2, ShoppingCart, Settings, Terminal,
  Globe2, Search, Loader2, CheckCircle2, XCircle, SlidersHorizontal,
} from 'lucide-react';

const NAV: SidebarItem[] = [
  { id: 'logo', label: 'Logo', icon: Image, group: 'main' },
  { id: 'product', label: 'Product', icon: Package, group: 'main' },
  { id: 'content', label: 'Content', icon: FileText, group: 'main' },
  { id: 'template', label: 'Template', icon: Sparkles, group: 'main' },
  { id: 'appearance', label: 'Appearance', icon: Palette, group: 'main' },
  { id: 'social', label: 'Social', icon: Share2, group: 'main' },
  { id: 'checkout-page', label: 'Checkout Page', icon: ShoppingCart, group: 'checkout', groupLabel: 'Checkout' },
  { id: 'checkout-settings', label: 'Checkout Settings', icon: SlidersHorizontal, group: 'checkout', groupLabel: 'Checkout' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'main' },
  { id: 'advanced', label: 'Advanced', icon: Terminal, group: 'main' },
];

const SECTION_META: Record<string, string> = {
  logo: 'Logo, header, and page identity.',
  product: 'The product this page sells.',
  content: 'Hero, sections, and trust elements.',
  template: 'Pick a starting design.',
  appearance: 'Theme, colors, and fonts.',
  social: 'Social links and placement.',
  'checkout-page': 'Checkout style, CTA, and trust.',
  'checkout-settings': 'Contact fields, login, and upsells.',
  settings: 'URL, SEO, and visibility.',
  advanced: 'Custom code and tracking.',
};

const INPUT =
  'w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-shadow focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)]';
const SETTINGS_CARD = 'rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]';

export default function EditSinglePagePage() {
  const params = useParams();
  const siteId = params.id as string;
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { products } = useProducts();

  // ── UI state ──
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [section, setSection] = useState('logo');

  // ── Site data ──
  const [site, setSite] = useState<any>(null);
  const [isPublished, setIsPublished] = useState(true);

  // ── Slug ──
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);

  // ── Theme ──
  const [palette, setPalette] = useState<Record<string, string>>({});

  // ── Content state ──
  const [content, setContent] = useState<SinglePageContentData>({
    title: '', description: '', heroImage: '', videoUrl: '', stats: [],
    productId: null, upsellProductIds: [], fakePrice: 0, features: [], whatsIncluded: [],
    contentBlocks: [], creatorProfile: { name: '', avatarUrl: '', bio: '' }, faqs: [], testimonials: [],
    logoUrl: '', logoShape: 'free', headerText: '', headerAlignment: 'center', showLogo: true,
    headerStyle: 'standard', logoPlacement: 'top-bar', logoHeaderGap: 'md', headerDivider: false, headerWidth: 'full',
    socialLinks: [], socialDisplayStyle: 'icons-only', socialPosition: 'footer',
    checkoutStyle: 'embedded', checkoutAlignment: 'center', ctaText: '', ctaSubtext: '',
    ctaButtonStyle: 'solid', ctaButtonSize: 'lg', showTrustBadges: true, trustBadges: [], showPaymentIcons: true,
    checkoutShowLogin: true, checkoutFields: { name: 'required', email: 'required', phone: 'optional' },
    customCss: '', customJs: '', customHeadTags: '', contactEmail: '', contactMobile: '', contactWhatsApp: '',
    redirectAfterPurchase: '', passwordProtection: false, pagePassword: '', analyticsGoogleId: '', analyticsFbPixelId: '',
  });

  // ── Settings state ──
  const [siteSettings, setSiteSettings] = useState<SinglePageSettingsData>({
    showBuyNow: true, showAddToCart: true, enableReviews: false, countdownEnd: '',
    passwordProtection: false, pagePassword: '', analyticsGoogleId: '', analyticsFbPixelId: '',
  });

  // ── Appearance state ──
  const [appearance, setAppearance] = useState<BioAppearanceData>({
    layoutStyle: 'classic', buttonStyle: 'rounded', backgroundType: 'solid', backgroundValue: '',
    showWatermark: true, showShareButton: true, fontFamily: 'system', cardStyle: 'solid',
    animation: 'none', borderRadius: 'md', spacing: 'default',
    headingStyle: 'minimal', sectionSpacing: 'comfortable', shadowIntensity: 'medium',
  });

  // ── SEO ──
  const [seo, setSeo] = useState({ title: '', description: '', image: '' });

  // ── Undo / Redo + dirty (shared hook; snapshot tracks content fields) ──
  type EditorSnapshot = { content: SinglePageContentData; settings: SinglePageSettingsData; appearance: BioAppearanceData; palette: Record<string, string>; seo: { title: string; description: string; image: string } };
  const buildSnapshot = useCallback((): EditorSnapshot => ({
    content: JSON.parse(JSON.stringify(content)),
    settings: JSON.parse(JSON.stringify(siteSettings)),
    appearance: { ...appearance },
    palette: { ...palette },
    seo: { ...seo },
  }), [content, siteSettings, appearance, palette, seo]);

  const applySnapshot = useCallback((snap: EditorSnapshot) => {
    setContent(snap.content);
    setSiteSettings(snap.settings);
    setAppearance(snap.appearance);
    setPalette(snap.palette);
    setSeo(snap.seo);
  }, []);

  const { canUndo, canRedo, undo: handleUndo, redo: handleRedo, dirty, setDirty } = useEditorHistory<EditorSnapshot>({
    build: buildSnapshot,
    apply: applySnapshot,
    deps: [content, siteSettings, appearance, palette, seo],
    enabled: !loading,
  });

  // ── Load data ──
  const queryClient = useQueryClient();
  const { data: loaded, isError } = useSinglePageSiteQuery(siteId);
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isError) { setLoading(false); return; }
    if (!loaded || hydratedRef.current === siteId) return;
    hydratedRef.current = siteId;

    const s = loaded.site;
    const tokens = loaded.tokens;
    const page = loaded.page;

    setSite(s);
    if (tokens?.color_palette) setPalette(tokens.color_palette as Record<string, string>);

    setSlug(s?.slug ?? '');
    setOriginalSlug(s?.slug ?? null);
    setIsPublished(s?.is_active ?? true);

    if (page) {
      const pageMeta = (page.metadata as any) || {};

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
        checkoutShowLogin: pageMeta?.checkout_show_login ?? true,
        checkoutFields: pageMeta?.checkout_fields || { name: 'required', email: 'required', phone: 'optional' },
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

    setLoading(false);
  }, [loaded, siteId, isError]);

  // ── When a Checkout section is open, scroll the preview to the checkout block ──
  // Re-post a few times: the iframe may still be loading (listener not yet attached).
  useEffect(() => {
    if (loading) return;
    if (section !== 'checkout-page' && section !== 'checkout-settings') return;
    const post = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage({ type: 'sp-scroll', target: 'checkout' }, window.location.origin);
      } catch { /* cross-origin guard */ }
    };
    post();
    const t1 = setTimeout(post, 300);
    const t2 = setTimeout(post, 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [section, loading, previewKey]);

  // Slug/publish aren't in the snapshot — mark dirty on their change.
  const settingsDirtyInit = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!settingsDirtyInit.current) { settingsDirtyInit.current = true; return; }
    setDirty(true);
  }, [slug, isPublished, loading, setDirty]);

  // ── Slug availability check ──
  const slugStatus = useSlugCheck(slug, originalSlug, 'singlepage');

  // ── Push live content to iframe (debounced, no dep array — fires every render) ──
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestPreviewRef = useRef({ content, appearance, palette, products });
  latestPreviewRef.current = { content, appearance, palette, products };

  useEffect(() => {
    if (loading) return;
    clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(() => {
      const { content, appearance, palette, products } = latestPreviewRef.current;
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      const upsellProducts = (content.upsellProductIds || [])
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({ id: p.id, name: p.name, price: p.price, thumbnail_url: p.thumbnail_url }));
      try {
        iframe.contentWindow.postMessage(
          { type: 'sp-content-update', content, appearance, palette, upsellProducts },
          window.location.origin,
        );
      } catch { /* cross-origin guard */ }
    }, 16);
    return () => clearTimeout(sendTimerRef.current);
  });

  const handleSave = useCallback(async () => {
    if (!siteId) return;
    if (slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking') {
      alert('Please fix your URL and try again.');
      return;
    }
    setSaving(true);
    setSaved(false);

    try {
      if (slug !== originalSlug || isPublished !== site?.is_active) {
        await supabase.from('sites').update({
          slug, is_active: isPublished, updated_at: new Date().toISOString(),
        }).eq('id', siteId);
        setOriginalSlug(slug);
        setSite((prev: any) => ({ ...prev, slug, is_active: isPublished }));
      }

      await saveDesignTokens(siteId, palette, site?.creator_id);

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
        countdown_end_at: siteSettings.countdownEnd || null,
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
          checkout_show_login: content.checkoutShowLogin,
          checkout_fields: content.checkoutFields,
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
      setDirty(false);
      setTimeout(() => setSaved(false), 2500);

      if (site) revalidateStorefrontPaths([getSitePublicPath({ ...site, slug })]).catch(() => {});

      setPreviewKey(Date.now());
      queryClient.invalidateQueries({ queryKey: ['sites', 'singlepage', siteId] });
    } catch (e) {
      console.error('Save failed', e);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }, [siteId, slugStatus, slug, originalSlug, isPublished, site, palette, content, siteSettings, seo, appearance, supabase, queryClient, setDirty]);

  // ── Leave guard ──
  const { pendingNav, guardedNavigate, cancel, discardAndLeave, saveAndLeave } = useUnsavedChanges(dirty, handleSave);

  // ── Derived ──
  const previewUrl = site ? `${getSitePublicPath(site)}?preview=1&t=${previewKey}` : null;
  const displayUrl = site ? getSiteDisplayUrl(site) : null;
  const displayTitle = site?.name || slug || 'Untitled Page';

  // ── Section bodies ──
  const settingsSection = (
    <div className="space-y-5">
      {/* Public URL */}
      <div className={`${SETTINGS_CARD} space-y-3`}>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Globe2 className="h-4 w-4 text-[var(--brand)]" /> Public URL
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Your landing page address</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 transition-shadow focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--focus-ring)]">
          <span className="shrink-0 select-none text-sm text-[var(--text-tertiary)]">digione.ai/site/</span>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            placeholder="launch-deal"
          />
        </div>
        <div className="flex min-h-5 items-center gap-2 text-xs">
          {slugStatus === 'checking' && <span className="flex items-center gap-1 text-[var(--text-tertiary)]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…</span>}
          {slugStatus === 'idle' && slug === originalSlug && slug.length > 0 && (
            <span className="flex items-center gap-1 text-[var(--success)]"><CheckCircle2 className="h-3.5 w-3.5" /> Your current URL</span>
          )}
          {slugStatus === 'available' && (
            <span className="flex items-center gap-1 text-[var(--success)]"><CheckCircle2 className="h-3.5 w-3.5" /> Available — save to apply</span>
          )}
          {slugStatus === 'taken' && (
            <span className="flex items-center gap-1 text-[var(--danger)]"><XCircle className="h-3.5 w-3.5" /> Already taken</span>
          )}
          {slugStatus === 'invalid' && (
            <span className="text-[var(--danger)]">3+ chars, letters, numbers, hyphens only</span>
          )}
        </div>
      </div>

      <SinglePageSettingsEditor data={siteSettings} onChange={setSiteSettings} />

      {/* SEO & Social Sharing */}
      <div className={`${SETTINGS_CARD} space-y-4`}>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Search className="h-4 w-4 text-[var(--brand)]" /> SEO &amp; Social Sharing
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">How your page looks on search engines and WhatsApp.</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]">Page Title</label>
            <input type="text" value={seo.title} onChange={e => setSeo(s => ({ ...s, title: e.target.value }))} maxLength={70}
              className={INPUT} placeholder={content.title || 'Landing Page Title'} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]">Meta Description</label>
            <textarea value={seo.description} onChange={e => setSeo(s => ({ ...s, description: e.target.value }))} maxLength={160} rows={2}
              className={`${INPUT} resize-none`} placeholder={content.description || 'A short pitch...'} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]">Share Preview Image</label>
            <input type="url" value={seo.image} onChange={e => setSeo(s => ({ ...s, image: e.target.value }))}
              className={INPUT} placeholder="https://... (defaults to hero image)" />
          </div>
        </div>
      </div>

      {/* Activate / Deactivate */}
      <div className={SETTINGS_CARD}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              {isPublished ? <CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> : <XCircle className="h-4 w-4 text-[var(--text-tertiary)]" />}
              {isPublished ? 'Link is Active' : 'Link is Inactive'}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {isPublished ? 'Your page is live and accessible to visitors.' : 'Your page is hidden. Visitors will see a 404 page.'}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={isPublished}
            aria-label={isPublished ? 'Deactivate link' : 'Activate link'}
            onClick={() => setIsPublished(!isPublished)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${isPublished ? 'bg-[var(--success)]' : 'border border-[var(--border)] bg-[var(--surface-muted)]'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );

  const sections: Record<string, React.ReactNode> = {
    logo: <SinglePageLogoEditor data={content} onChange={setContent} />,
    product: <SinglePageProductEditor data={content} onChange={setContent} products={products} />,
    content: (
      <div className="space-y-5">
        <SinglePageHeroEditor data={content} onChange={setContent} />
        <SinglePageContentEditor data={content} onChange={setContent} />
        <SinglePageTrustEditor data={content} onChange={setContent} />
      </div>
    ),
    template: (
      <SinglePageTemplateEditor
        currentAppearance={appearance}
        currentPalette={palette}
        onApply={(newPalette, newAppearance) => { setPalette(newPalette); setAppearance(newAppearance); }}
      />
    ),
    appearance: (
      <BioAppearanceEditor
        data={appearance}
        onChange={setAppearance}
        palette={palette}
        onPaletteChange={(key, value) => setPalette(prev => ({ ...prev, [key]: value }))}
      />
    ),
    social: <SinglePageSocialEditor data={content} onChange={setContent} />,
    'checkout-page': <SinglePageCheckoutEditor data={content} onChange={setContent} />,
    'checkout-settings': <SinglePageCheckoutSettingsEditor data={content} onChange={setContent} products={products} />,
    settings: settingsSection,
    advanced: <SinglePageAdvancedEditor data={content} onChange={setContent} />,
  };

  return (
    <>
      <EditorShell
        siteType="single"
        storageKey="singlepage-editor-sidebar"
        nav={NAV}
        sectionMeta={SECTION_META}
        sections={sections}
        defaultActive="logo"
        active={section}
        onActiveChange={setSection}
        title={displayTitle}
        typeLabel="Single page"
        typeIcon={FileText}
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
        preview={
          <PreviewPane
            previewUrl={previewUrl} displayUrl={displayUrl} iframeRef={iframeRef}
            previewKey={previewKey} onRefresh={() => setPreviewKey(Date.now())}
          />
        }
      />

      <UnsavedChangesDialog open={!!pendingNav} saving={saving} onCancel={cancel} onDiscard={discardAndLeave} onSave={saveAndLeave} />
    </>
  );
}
