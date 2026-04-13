// Storefront Layout — Main Store sites served at /store/{slug}
// DB tables read: sites, site_main, site_design_tokens, site_navigation
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StorefrontHeader from '@/components/storefront/StorefrontHeader';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import PreviewBridge from '@/components/storefront/PreviewBridge';

export default async function MainSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from('sites')
    .select('id, creator_id')
    .eq('slug', slug)
    .eq('site_type', 'main')
    .single();

  if (!site) notFound();

  const [{ data: tokens }, { data: nav }, { data: main }] = await Promise.all([
    supabase.from('site_design_tokens').select('color_palette, typography').eq('site_id', site.id).single(),
    supabase.from('site_navigation').select('*').eq('site_id', site.id).single(),
    supabase.from('site_main').select('*').eq('site_id', site.id).single(),
  ]);

  const palette = (tokens?.color_palette as any) || {
    primary: '#6366F1', secondary: '#8B5CF6', accent: '#EC4899',
    surface: '#FFFFFF', text: '#0F172A', muted: '#64748B', background: '#FFFFFF',
  };

  const themeCSS = `
    :root {
      --creator-primary: ${palette.primary};
      --creator-secondary: ${palette.secondary};
      --creator-accent: ${palette.accent};
      --creator-surface: ${palette.surface};
      --creator-text: ${palette.text};
      --creator-text-muted: ${palette.muted};
      --creator-bg: ${palette.background || '#FFFFFF'};
    }
  `;

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
