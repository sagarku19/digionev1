import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import LinkInBioPage from '@/components/storefront/LinkInBioPage';
import type { BioData, BioLink, ProductLite } from '@/components/storefront/linkinbio/blockRenderers/_shared';
import type { Database } from '@/types/database.types';

type LinkinbioItemRow = Database['public']['Tables']['linkinbio_items']['Row'];

export const revalidate = 60;

// reason: these columns are jsonb (typed `Json`); narrow once at the read boundary
type LinkinbioTheme = {
  buttonStyle?: string;
  backgroundType?: string;
  backgroundValue?: string | null;
  fontFamily?: string;
  cardStyle?: string;
  animation?: string;
  borderRadius?: string;
  spacing?: string;
};
type LinkinbioLayout = { style?: string };
type LinkinbioSettings = {
  socialLinks?: { platform: string; url: string; is_visible?: boolean }[];
  showWatermark?: boolean;
  showShareButton?: boolean;
  avatarShape?: 'circular' | 'rounded' | 'square';
  avatarBorder?: boolean;
};
type LinkinbioSeo = {
  custom_title?: string;
  custom_description?: string;
  custom_image?: string;
};
// reason: block content/style/item metadata are heterogeneous per-block jsonb
type BlockContent = Record<string, unknown>;
type BlockStyle = Record<string, unknown>;
type ItemMetadata = Record<string, unknown>;

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
    .from('linkinbio_pages')
    .select('display_name, bio, avatar_url, seo')
    .eq('site_id', site.id)
    .maybeSingle();

  if (!page) return {};

  const seoData = (page.seo ?? {}) as LinkinbioSeo;

  const title = seoData.custom_title || page.display_name || username;
  const description = seoData.custom_description || page.bio || '';
  const imageUrl = seoData.custom_image || page.avatar_url || '';

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
    .from('linkinbio_pages')
    .select('*')
    .eq('site_id', site.id)
    .maybeSingle();

  if (!page) notFound();

  const theme = (page.theme ?? {}) as LinkinbioTheme;
  const layout = (page.layout ?? {}) as LinkinbioLayout;
  const settings = (page.settings ?? {}) as LinkinbioSettings;

  // Map V2 page → BioData shape for the component
  const bio: BioData = {
    display_name: page.display_name ?? '',
    bio_text: page.bio ?? null,
    avatar_url: page.avatar_url ?? null,
    cover_image_url: page.cover_url ?? null,
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
    .from('linkinbio_blocks')
    .select('*')
    .eq('page_id', page.id)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  const blocks = rawBlocks ?? [];

  // Fetch items for all blocks
  const blockIds = blocks.map(b => b.id);
  const itemsByBlock: Record<string, LinkinbioItemRow> = {};
  if (blockIds.length > 0) {
    const { data: rawItems } = await supabase
      .from('linkinbio_items')
      .select('*')
      .in('block_id', blockIds)
      .order('sort_order', { ascending: true });

    for (const item of rawItems ?? []) {
      itemsByBlock[item.block_id] = item;
    }
  }

  // Map V2 blocks+items → old flat BioLink shape
  const links: BioLink[] = blocks.map(b => {
    const content = (b.content ?? {}) as BlockContent;
    const style = (b.style ?? {}) as BlockStyle;
    const item = itemsByBlock[b.id];
    // reason: item.metadata is heterogeneous per-block jsonb
    const itemMeta = item ? (item.metadata as ItemMetadata) : {};

    return {
      id: b.id,
      link_type: b.type,
      title: item?.title ?? (content.title as string | undefined) ?? null,
      description: item?.description ?? (content.description as string | undefined) ?? null,
      url: item?.url ?? (content.url as string | undefined) ?? null,
      thumbnail_url: item?.thumbnail_url ?? (content.thumbnail_url as string | undefined) ?? null,
      product_id: item?.product_id ?? null,
      icon_type: (itemMeta.icon_type as string | undefined) ?? (style.icon_type as string | undefined) ?? null,
      style_variant: (itemMeta.style_variant as string | undefined) ?? (style.variant as string | undefined) ?? 'default',
      metadata: { ...content, ...itemMeta },
    };
  });

  // For product-type links, fetch product data
  const productIds = links
    .filter(l => l.link_type === 'product' && l.product_id)
    .map(l => l.product_id as string);

  let productsMap: Record<string, ProductLite> = {};
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, thumbnail_url, is_published')
      .in('id', productIds);

    if (products) {
      productsMap = Object.fromEntries(products.map(p => [p.id, { ...p, is_published: p.is_published ?? false }]));
    }
  }

  // Fetch design tokens for background
  const { data: tokens } = await supabase
    .from('site_design_tokens')
    .select('color_palette')
    .eq('site_id', site.id)
    .maybeSingle();

  // reason: color_palette is jsonb; at runtime it's a string→string map
  const palette = (tokens?.color_palette ?? {}) as Record<string, string>;

  return (
    <LinkInBioPage
      siteId={site.id}
      username={site.slug ?? undefined}
      bio={bio}
      links={links}
      productsMap={productsMap}
      palette={palette}
    />
  );
}
