import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);

    let query = supabase
      .from('products')
      .select(`
        id, name, description, price, category, thumbnail_url, images, created_at,
        creator_id, is_on_discover_page, is_published,
        profiles!fk_products_creator ( id, full_name, avatar_url )
      `)
      .eq('is_published', true)
      .eq('is_on_discover_page', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (q) {
      query = query.ilike('name', `%${q}%`);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ products: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
