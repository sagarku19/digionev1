import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    // Fetch the product with creator profile
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        id, name, description, price, category, thumbnail_url, images,
        content, creator_id, is_published, is_on_discover_page,
        post_purchase_instructions, created_at,
        profiles!fk_products_creator ( id, full_name, avatar_url, email )
      `)
      .eq('id', productId)
      .eq('is_published', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch related products (same category, same creator, or discover products)
    const { data: related } = await supabase
      .from('products')
      .select(`
        id, name, price, category, thumbnail_url, creator_id,
        profiles!fk_products_creator ( id, full_name, avatar_url )
      `)
      .eq('is_published', true)
      .eq('is_on_discover_page', true)
      .is('deleted_at', null)
      .neq('id', productId)
      .or(`category.eq.${product.category},creator_id.eq.${product.creator_id}`)
      .limit(8);

    // Fetch more products by the same creator
    const { data: creatorProducts } = await supabase
      .from('products')
      .select('id, name, price, category, thumbnail_url')
      .eq('creator_id', product.creator_id)
      .eq('is_published', true)
      .is('deleted_at', null)
      .neq('id', productId)
      .limit(4);

    return NextResponse.json({
      product,
      related: related ?? [],
      creatorProducts: creatorProducts ?? [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
