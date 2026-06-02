import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const supabase = createServiceClient();

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
      .select('id, name, price, thumbnail_url, is_published')
      .ilike('name', `%${q}%`)
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
