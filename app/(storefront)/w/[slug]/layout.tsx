// Storefront Layout — Builder sites at /w/{slug}
// Looks up by slug first, then falls back to id (for legacy sites without a custom slug)
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStorefrontTheme } from '@/lib/storefront-theme';
import StorefrontHeader from '@/components/storefront/StorefrontHeader';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import PreviewBridge from '@/components/storefront/PreviewBridge';

export default async function BuilderSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Try by slug first
  let { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', slug)
    .eq('site_type', 'builder')
    .eq('is_active', true)
    .maybeSingle();

  // Fallback: try by id (existing sites created before slug was required)
  if (!site) {
    ({ data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('id', slug)
      .eq('site_type', 'builder')
      .eq('is_active', true)
      .maybeSingle());
  }

  if (!site) notFound();

  const { themeCSS, nav, main } = await getStorefrontTheme(site.id);

  return (
    <div className="min-h-screen flex flex-col store-theme bg-[--creator-bg] text-[--creator-text]">
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <PreviewBridge />
      <StorefrontHeader navConfig={nav} siteMain={main} />
      <main className="flex-1 w-full">{children}</main>
      <StorefrontFooter navConfig={nav} siteMain={main} />
    </div>
  );
}
