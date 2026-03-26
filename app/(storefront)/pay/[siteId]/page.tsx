// Route: /pay/{siteId} — Payment link page
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PaymentLinkPage from '@/components/storefront/PaymentLinkPage';

export const revalidate = 60;

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from('sites')
    .select('id, site_type, is_active')
    .eq('id', siteId)
    .eq('site_type', 'payment')
    .eq('is_active', true)
    .maybeSingle();

  if (!site) notFound();

  const { data: sm } = await supabase
    .from('site_main')
    .select('title, meta_description')
    .eq('site_id', site.id)
    .single();

  return <PaymentLinkPage siteId={site.id} siteMain={sm} />;
}
