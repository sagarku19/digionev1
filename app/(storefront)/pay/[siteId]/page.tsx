// Route: /pay/{siteId} — Payment link page
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PaymentLinkPage from '@/components/storefront/PaymentLinkPage';

export const revalidate = 60;

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { siteId } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === '1';
  const supabase = await createClient();

  let query = supabase
    .from('sites')
    .select('id, site_type, is_active')
    .eq('id', siteId)
    .eq('site_type', 'payment');
  if (!isPreview) query = query.eq('is_active', true);
  const { data: site } = await query.maybeSingle();

  if (!site) notFound();

  const { data: sm } = await supabase
    .from('site_main')
    .select('title, meta_description, metadata')
    .eq('site_id', site.id)
    .maybeSingle();

  // Payment config lives in site_main.metadata
  const meta = (sm?.metadata as Record<string, unknown>) ?? {};
  const fixedAmount = typeof meta.fixed_amount === 'number' ? meta.fixed_amount : null;
  const isFlexible = typeof meta.is_flexible === 'boolean' ? meta.is_flexible : fixedAmount === null;
  const productId = typeof meta.product_id === 'string' ? meta.product_id : null;

  let product: { id: string; name: string; price: number; thumbnail_url: string | null } | null = null;
  if (productId) {
    const { data: p } = await supabase
      .from('products')
      .select('id, name, price, thumbnail_url')
      .eq('id', productId)
      .maybeSingle();
    if (p) product = p;
  }

  return <PaymentLinkPage siteId={site.id} siteMain={sm} fixedAmount={fixedAmount} isFlexible={isFlexible} product={product} />;
}
