import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { rateLimit } from '@/lib/server/rate-limit';

export async function GET(req: Request) {
  try {
    const supabase = createServiceClient();
    if (!(await rateLimit(req, 'products-search', { max: 30, windowSeconds: 60 }))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

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
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Search failed' }, { status: 500 });
  }
}
