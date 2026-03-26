// Route: /s/{slug} — Single product page
// Looks up by slug first, then falls back to id (for legacy sites without a custom slug)
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductSalesPage from '@/components/storefront/ProductSalesPage';

export const revalidate = 60;

export default async function SingleSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

  // Fallback: try by id
  if (!site) {
    ({ data: site } = await supabase
      .from('sites')
      .select('id, site_type, is_active')
      .eq('id', slug)
      .eq('site_type', 'single')
      .eq('is_active', true)
      .maybeSingle());
  }

  if (!site) notFound();

  const { data: sp } = await supabase
    .from('site_singlepage')
    .select('*, products(*)')
    .eq('site_id', site.id)
    .single();

  return <ProductSalesPage siteId={site.id} singlePage={sp} />;
}
