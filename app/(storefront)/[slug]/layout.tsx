// Storefront Layout Wrapper
// DB tables read: sites, site_main, site_design_tokens, site_navigation
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StorefrontHeader from '@/components/storefront/StorefrontHeader';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = await createClient();

  // 1. Fetch site mapping
  const { data: site } = await supabase
    .from('sites')
    .select('id, creator_id')
    .eq('slug', slug)
    .single();

  if (!site) {
    notFound();
  }

  // 2. Fetch theme tokens
  const { data: tokens } = await supabase
    .from('site_design_tokens')
    .select('color_palette, typography')
    .eq('site_id', site.id)
    .single();

  // Default fallbacks mapping
  const palette = (tokens?.color_palette as any) || {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#EC4899',
    surface: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
    background: '#FFFFFF',
  };

  const getThemeCSS = () => `
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

  // 3. Fetch Navigation
  const { data: nav } = await supabase
    .from('site_navigation')
    .select('*')
    .eq('site_id', site.id)
    .single();

  // 4. Fetch Main Settings
  const { data: main } = await supabase
    .from('site_main')
    .select('*')
    .eq('site_id', site.id)
    .single();

  return (
    <div className="min-h-screen flex flex-col store-theme bg-[--creator-bg] text-[--creator-text]">
      <style dangerouslySetInnerHTML={{ __html: getThemeCSS() }} />
      <StorefrontHeader navConfig={nav} siteMain={main} />
      <main className="flex-1 w-full">
        {children}
      </main>
      <StorefrontFooter navConfig={nav} siteMain={main} />
    </div>
  );
}
