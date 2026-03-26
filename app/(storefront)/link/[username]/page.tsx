import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LinkInBioPage from '@/components/storefront/LinkInBioPage';

export const revalidate = 60;

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

  // Fetch bio profile data
  const { data: bio } = await supabase
    .from('site_linkinbio' as any)
    .select('*')
    .eq('site_id', site.id)
    .maybeSingle();

  if (!bio) notFound();

  // Fetch links (visible only, ordered)
  const { data: rawLinks } = await supabase
    .from('linkinbio_links' as any)
    .select('*')
    .eq('site_id', site.id)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  const links = (rawLinks ?? []) as any[];

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
      bio={bio as any}
      links={links}
      productsMap={productsMap}
      palette={palette}
    />
  );
}
