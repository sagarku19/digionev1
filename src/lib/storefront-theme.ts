// Shared storefront theming helper — fetches design tokens, nav, and site_main
// for any site by its ID. Used by all storefront layouts.

import { createClient } from '@/lib/supabase/server';

export async function getStorefrontTheme(siteId: string) {
  const supabase = await createClient();

  const [{ data: tokens }, { data: nav }, { data: main }] = await Promise.all([
    supabase.from('site_design_tokens').select('color_palette, typography').eq('site_id', siteId).single(),
    supabase.from('site_navigation').select('*').eq('site_id', siteId).single(),
    supabase.from('site_main').select('*').eq('site_id', siteId).single(),
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

  return { themeCSS, nav, main };
}
