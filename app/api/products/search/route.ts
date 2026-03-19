import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const creatorId = searchParams.get('creator');

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    let query = supabase
      .from('products')
      .select('id, title, slug, price, cover_image, is_published')
      .ilike('title', `%${q}%`)
      .eq('is_published', true);

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    // Limit to generic top 20 queries mapping fuzzy match pattern
    const { data, error } = await query.limit(20);

    if (error) throw error;

    return NextResponse.json({ results: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
