// Route: /upsells/{slug} — Public upsell checkout page
// Server component — renders primary product + upsell add-ons + contact fields
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import UpsellCheckoutClient from './UpsellCheckoutClient';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: page } = await (supabase.from('upsell_pages' as any) as any)
    .select('title, config')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (!page) return { title: 'Not Found' };

  const config = (page.config as any) || {};
  return {
    title: config.meta_title || page.title || 'Checkout',
    description: config.meta_description || `Get ${page.title}`,
  };
}

export default async function UpsellPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch upsell page
  const { data: page } = await (supabase.from('upsell_pages' as any) as any)
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (!page) notFound();

  const config = (page.config as any) || {};
  const upsellProductIds: string[] = page.upsell_product_ids ?? [];

  // Fetch all products (primary + upsells) in one query
  const allProductIds = [page.primary_product_id, ...upsellProductIds].filter(Boolean);
  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, price, thumbnail_url, metadata')
    .in('id', allProductIds);

  const productsMap = new Map((products ?? []).map((p: any) => [p.id, p]));

  const primaryProduct = productsMap.get(page.primary_product_id);
  if (!primaryProduct) notFound();

  const upsellProducts = upsellProductIds
    .map((id: string) => productsMap.get(id))
    .filter(Boolean);

  return (
    <UpsellCheckoutClient
      page={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        config,
      }}
      primaryProduct={primaryProduct}
      upsellProducts={upsellProducts}
    />
  );
}
