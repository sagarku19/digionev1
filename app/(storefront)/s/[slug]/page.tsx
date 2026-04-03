// Route: /s/{slug} — Single product page
// Looks up by slug first, then falls back to id (for legacy sites without a custom slug)
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ProductSalesPage from '@/components/storefront/ProductSalesPage';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Try by slug first
  let { data: site } = await supabase
    .from('sites')
    .select('id, site_type, is_active')
    .eq('slug', slug)
    .eq('site_type', 'single')
    .eq('is_active', true)
    .maybeSingle();

  if (!site) {
    ({ data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('id', slug)
      .eq('site_type', 'single')
      .eq('is_active', true)
      .maybeSingle());
  }

  if (!site) return {};

  const { data: sp } = await supabase
    .from('site_singlepage')
    .select('title, description, hero_image_url, metadata, meta_description')
    .eq('site_id', site.id)
    .maybeSingle();

  if (!sp) return {};

  const metaDict = (sp.metadata as any) ?? {};
  const title = metaDict.custom_title || sp.title || slug;
  const description = sp.meta_description || metaDict.custom_description || sp.description || '';
  const imageUrl = metaDict.custom_image || sp.hero_image_url || '';

  return {
    title,
    description: description || undefined,
    openGraph: {
      title,
      description: description || undefined,
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: title }] : [],
      type: 'website',
      url: `https://digione.ai/s/${slug}`,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description: description || undefined,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function SingleSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; t?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === '1';
  const supabase = await createClient();

  // Try by slug first
  let query = supabase
    .from('sites')
    .select('id, site_type, is_active')
    .eq('slug', slug)
    .eq('site_type', 'single');
  if (!isPreview) query = query.eq('is_active', true);
  let { data: site } = await query.maybeSingle();

  // Fallback: try by id
  if (!site) {
    let fallback = supabase
      .from('sites')
      .select('id, site_type, is_active')
      .eq('id', slug)
      .eq('site_type', 'single');
    if (!isPreview) fallback = fallback.eq('is_active', true);
    ({ data: site } = await fallback.maybeSingle());
  }

  if (!site) notFound();

  const { data: sp } = await supabase
    .from('site_singlepage')
    .select('*, products(*)')
    .eq('site_id', site.id)
    .maybeSingle();

  const { data: tokens } = await supabase
    .from('site_design_tokens')
    .select('color_palette')
    .eq('site_id', site.id)
    .maybeSingle();

  const palette = (tokens?.color_palette as any) || {};

  return <ProductSalesPage siteId={site.id} singlePage={sp} palette={palette} />;
}
