// Route: /w/{slug} — Builder / custom app page
// Looks up by slug first, then falls back to id (for legacy sites without a custom slug)
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SectionRenderer from '@/components/storefront/SectionRenderer';

export const revalidate = 60;

export default async function BuilderSitePage({
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
    .eq('site_type', 'builder')
    .eq('is_active', true)
    .maybeSingle();

  // Fallback: try by id
  if (!site) {
    ({ data: site } = await supabase
      .from('sites')
      .select('id, site_type, is_active')
      .eq('id', slug)
      .eq('site_type', 'builder')
      .eq('is_active', true)
      .maybeSingle());
  }

  if (!site) notFound();

  const [{ data: config }, { data: assignments }, { data: siteMain }] = await Promise.all([
    supabase.from('site_sections_config').select('sections').eq('site_id', site.id).single(),
    supabase.from('site_product_assignments')
      .select('sort_order, products(id, name, price, category, thumbnail_url, is_published, description)')
      .eq('site_id', site.id)
      .order('sort_order', { ascending: true }),
    supabase.from('site_main').select('title, meta_description, logo_url, banner_url').eq('site_id', site.id).maybeSingle(),
  ]);

  const sections = (config?.sections as any[]) ?? [];
  const products = (assignments ?? []).flatMap((a: any) => (a.products ? [a.products] : []));
  const visible = sections.filter((s: any) => s.is_visible !== false).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-2xl font-bold mb-2">App is under construction</h1>
        <p className="text-[--creator-text-muted]">The creator is currently building this page.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SectionRenderer sections={visible} products={products} siteMain={siteMain} siteId={site.id} />
    </div>
  );
}
