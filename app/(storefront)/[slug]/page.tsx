import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SectionRenderer from '@/components/storefront/SectionRenderer';

// ISR revalidation for storefronts (e.g. 60 seconds)
export const revalidate = 60;

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = await createClient();

  // 1. Fetch site ID (We query main sites with the slug)
  const { data: site } = await supabase
    .from('sites')
    .select('id, site_type')
    .eq('slug', slug)
    .single();

  if (!site || site.site_type !== 'main') {
    notFound();
  }

  // 2. Fetch the sections configuration
  const { data: config } = await supabase
    .from('site_sections_config')
    .select('sections')
    .eq('site_id', site.id)
    .single();

  const sections = (config?.sections as any[]) || [];

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-2xl font-bold mb-2">Store is under construction</h1>
        <p className="text-[--creator-text-muted]">The creator is currently setting up this page.</p>
      </div>
    );
  }

  // 3. Render the sections using the dynamic renderer
  return (
    <div className="w-full">
      <SectionRenderer sections={sections} />
    </div>
  );
}
