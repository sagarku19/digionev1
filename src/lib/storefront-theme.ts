// Shared storefront theming helper — fetches design tokens, nav, and site_main
// for any site by its ID. Used by all storefront layouts.

import { createClient } from '@/lib/supabase/server';
import { safeCssColor } from '@/lib/safe-css';

export async function getStorefrontTheme(siteId: string) {
  const supabase = await createClient();

  const [{ data: tokens }, { data: nav }, { data: main }] = await Promise.all([
    supabase.from('site_design_tokens').select('color_palette, typography').eq('site_id', siteId).single(),
    supabase.from('site_navigation').select('*').eq('site_id', siteId).single(),
    supabase.from('site_main').select('*').eq('site_id', siteId).single(),
  ]);

  const palette: Record<string, unknown> =
    (tokens?.color_palette as Record<string, unknown> | null) ?? {};

  const themeCSS = `
    :root {
      --creator-primary: ${safeCssColor(palette.primary, '#6366F1')};
      --creator-secondary: ${safeCssColor(palette.secondary, '#8B5CF6')};
      --creator-accent: ${safeCssColor(palette.accent, '#EC4899')};
      --creator-surface: ${safeCssColor(palette.surface, '#FFFFFF')};
      --creator-text: ${safeCssColor(palette.text, '#0F172A')};
      --creator-text-muted: ${safeCssColor(palette.muted, '#64748B')};
      --creator-bg: ${safeCssColor(palette.background, '#FFFFFF')};
    }
  `;

  return { themeCSS, nav, main };
}
