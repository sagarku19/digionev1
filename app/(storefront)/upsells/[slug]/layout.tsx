// Storefront Layout — Upsell checkout pages at /upsells/{slug}
// Minimal layout — no header/footer, just theme CSS vars
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function UpsellPageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: page } = await (supabase.from('upsell_pages' as any) as any)
    .select('id, config, is_published')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (!page) notFound();

  const config = (page.config as any) || {};
  const theme = config.theme || {};
  const primaryColor = theme.primary_color || '#6366F1';
  const bgColor = theme.bg_color || '#FFFFFF';
  const textColor = theme.text_color || '#0F172A';

  const themeCSS = `
    :root {
      --upsell-primary: ${primaryColor};
      --upsell-bg: ${bgColor};
      --upsell-text: ${textColor};
      --upsell-text-muted: ${textColor}99;
      --upsell-border: ${textColor}1A;
    }
  `;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      {children}
    </div>
  );
}
