// Storefront Layout — Product Site pages at /site/{slug}
// Minimal layout — the ProductSalesPage component handles its own styling.
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PreviewBridge from '@/components/storefront/PreviewBridge';
import { safeCssColor } from '@/lib/safe-css';

export default async function SinglePageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Layout skips is_active check — the page component handles access control.
  let { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', slug)
    .eq('site_type', 'single')
    .maybeSingle();

  // Fallback: try by id
  if (!site) {
    ({ data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('id', slug)
      .eq('site_type', 'single')
      .maybeSingle());
  }

  if (!site) notFound();

  // Fetch design tokens for theming
  const { data: tokens } = await supabase
    .from('site_design_tokens')
    .select('color_palette')
    .eq('site_id', site.id)
    .maybeSingle();

  // reason: color_palette is a jsonb column typed as Json
  const palette = (tokens?.color_palette as Record<string, string>) || {
    primary: '#EC4899', secondary: '#8B5CF6', accent: '#F59E0B',
    surface: '#FFFFFF', text: '#0F172A', muted: '#64748B', background: '#FFFFFF',
  };

  const themeCSS = `
    :root {
      --creator-primary: ${safeCssColor(palette.primary, '#EC4899')};
      --creator-secondary: ${safeCssColor(palette.secondary, '#8B5CF6')};
      --creator-accent: ${safeCssColor(palette.accent, '#F59E0B')};
      --creator-surface: ${safeCssColor(palette.surface, '#FFFFFF')};
      --creator-text: ${safeCssColor(palette.text, '#0F172A')};
      --creator-text-muted: ${safeCssColor(palette.muted, '#64748B')};
      --creator-bg: ${safeCssColor(palette.background, '#FFFFFF')};
    }
  `;

  return (
    <div className="min-h-screen" style={{ backgroundColor: safeCssColor(palette.background, '#FFFFFF') }}>
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <PreviewBridge />
      {children}
    </div>
  );
}
