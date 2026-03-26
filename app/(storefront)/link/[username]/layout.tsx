// Storefront Layout — Link in Bio at /link/{username}
// Minimal layout — no header/footer, bio page has its own layout
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PreviewBridge from '@/components/storefront/PreviewBridge';

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

  const palette = (tokens?.color_palette as any) || {
    primary: '#EC4899', secondary: '#8B5CF6', accent: '#F59E0B',
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
    <div className="min-h-screen" style={{ backgroundColor: palette.background || '#FFFFFF' }}>
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <PreviewBridge />
      {children}
    </div>
  );
}
