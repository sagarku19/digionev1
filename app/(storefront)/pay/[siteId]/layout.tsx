// Storefront Layout — Payment sites at /pay/{siteId}
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStorefrontTheme } from '@/lib/storefront-theme';
import PreviewBridge from '@/components/storefront/PreviewBridge';

export default async function PaymentSiteLayout({
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
    .eq('site_type', 'payment')
    .eq('is_active', true)
    .maybeSingle();

  if (!site) notFound();

  const { themeCSS } = await getStorefrontTheme(site.id);

  return (
    <div className="min-h-screen flex flex-col store-theme bg-[--creator-bg] text-[--creator-text]">
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <PreviewBridge />
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
