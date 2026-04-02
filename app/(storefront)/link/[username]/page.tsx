import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import LinkInBioPage from '@/components/storefront/LinkInBioPage';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', username)
    .eq('site_type', 'linkinbio')
    .eq('is_active', true)
    .maybeSingle();

  if (!site) return {};

  const { data: page } = await supabase
    .from('linkinbio_pages' as any)
    .select('display_name, bio, avatar_url, seo')
    .eq('site_id', site.id)
    .maybeSingle();

  if (!page) return {};

  const p = page as any;
  const seoData = (p.seo as any) ?? {};

  const title = seoData.custom_title || p.display_name || username;
  const description = seoData.custom_description || p.bio || '';
  const imageUrl = seoData.custom_image || p.avatar_url || '';

  return {
    title,
    description: description || undefined,
    openGraph: {
      title,
      description: description || undefined,
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: title }] : [],
      type: 'profile',
      url: `https://digione.ai/link/${username}`,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description: description || undefined,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function LinkInBioStorefront({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // Fetch site
  const { data: site } = await supabase
    .from('sites')
    .select('id, slug, creator_id')
    .eq('slug', username)
    .eq('site_type', 'linkinbio')
    .eq('is_active', true)
    .maybeSingle();

  if (!site) notFound();

  // ── V2: Fetch linkinbio_pages ──
  const { data: page } = await supabase
    .from('linkinbio_pages' as any)
    .select('*')
    .eq('site_id', site.id)
    .maybeSingle();

  if (!page) notFound();

  const pageData = page as any;
  const theme = (pageData.theme as any) ?? {};
  const layout = (pageData.layout as any) ?? {};
  const settings = (pageData.settings as any) ?? {};

  // Map V2 page → BioData shape for the component
  const bio = {
    display_name: pageData.display_name ?? '',
    bio_text: pageData.bio ?? null,
    avatar_url: pageData.avatar_url ?? null,
    cover_image_url: pageData.cover_url ?? null,
    layout_style: layout.style ?? 'classic',
    button_style: theme.buttonStyle ?? 'rounded',
    background_type: theme.backgroundType ?? 'solid',
    background_value: theme.backgroundValue ?? null,
    social_links: settings.socialLinks ?? [],
    show_watermark: settings.showWatermark ?? true,
    show_share_button: settings.showShareButton ?? true,
    // V2 appearance fields
    font_family: theme.fontFamily ?? 'system',
    card_style: theme.cardStyle ?? 'solid',
    animation: theme.animation ?? 'none',
    border_radius: theme.borderRadius ?? 'md',
    spacing: theme.spacing ?? 'default',
    avatar_shape: (settings.avatarShape ?? 'circular') as 'circular' | 'rounded' | 'square',
    avatar_border: settings.avatarBorder ?? true,
  };

  // ── V2: Fetch blocks + items ──
  const { data: rawBlocks } = await supabase
    .from('linkinbio_blocks' as any)
    .select('*')
    .eq('page_id', pageData.id)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  const blocks = (rawBlocks ?? []) as any[];

  // Fetch items for all blocks
  const blockIds = blocks.map((b: any) => b.id);
  let itemsByBlock: Record<string, any> = {};
  if (blockIds.length > 0) {
    const { data: rawItems } = await supabase
      .from('linkinbio_items' as any)
      .select('*')
      .in('block_id', blockIds)
      .order('sort_order', { ascending: true });

    for (const item of (rawItems ?? []) as any[]) {
      itemsByBlock[item.block_id] = item;
    }
  }

  // Map V2 blocks+items → old flat BioLink shape
  const links = blocks.map((b: any) => {
    const content = (b.content as any) ?? {};
    const style = (b.style as any) ?? {};
    const item = itemsByBlock[b.id];

    return {
      id: b.id,
      link_type: b.type,
      title: item?.title ?? content.title ?? null,
      description: item?.description ?? content.description ?? null,
      url: item?.url ?? content.url ?? null,
      thumbnail_url: item?.thumbnail_url ?? content.thumbnail_url ?? null,
      product_id: item?.product_id ?? null,
      icon_type: item?.metadata?.icon_type ?? style.icon_type ?? null,
      style_variant: item?.metadata?.style_variant ?? style.variant ?? 'default',
      metadata: { ...content, ...(item?.metadata ?? {}) },
    };
  });

  // For product-type links, fetch product data
  const productIds = links
    .filter((l: any) => l.link_type === 'product' && l.product_id)
    .map((l: any) => l.product_id);

  let productsMap: Record<string, any> = {};
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, thumbnail_url, is_published')
      .in('id', productIds);

    if (products) {
      productsMap = Object.fromEntries(products.map(p => [p.id, p]));
    }
  }

  // Fetch design tokens for background
  const { data: tokens } = await supabase
    .from('site_design_tokens')
    .select('color_palette')
    .eq('site_id', site.id)
    .maybeSingle();

  const palette = (tokens?.color_palette as any) || {};

  return (
    <LinkInBioPage
      siteId={site.id}
      username={site.slug ?? undefined}
      bio={bio as any}
      links={links}
      productsMap={productsMap}
      palette={palette}
    />
  );
}
