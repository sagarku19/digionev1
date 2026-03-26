// Storefront Layout — Blog sites at /blog/{siteId}
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStorefrontTheme } from '@/lib/storefront-theme';
import StorefrontHeader from '@/components/storefront/StorefrontHeader';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import PreviewBridge from '@/components/storefront/PreviewBridge';

export default async function BlogSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('site_type', 'blog')
    .eq('is_active', true)
    .maybeSingle();

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
