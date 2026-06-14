// Storefront Layout — Link in Bio at /link/{username}
// Minimal layout — no header/footer, bio page has its own layout
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PreviewBridge from '@/components/storefront/PreviewBridge';
import { safeCssColor } from '@/lib/safe-css';

export default async function LinkInBioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // Look up site by slug (username) + linkinbio type
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', username)
    .eq('site_type', 'linkinbio')
    .eq('is_active', true)
    .maybeSingle();

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
