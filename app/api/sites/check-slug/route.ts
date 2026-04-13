// API Route: GET /api/sites/check-slug?slug=xxx&type=xxx
// Checks slug availability:
//   main, single, linkinbio → checks slug column in sites table
//   payment → slug not needed (URL uses siteId), always available

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug')?.toLowerCase().trim();
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ available: false, error: 'No type provided' }, { status: 400 });
    }

    // Payment doesn't use slugs — URL is /pay/{siteId}
    if (type === 'payment') {
      return NextResponse.json({ available: true });
    }

    // main, single, linkinbio need a slug — payment uses siteId
    if (!slug) {
      return NextResponse.json({ available: false, error: 'No slug provided' }, { status: 400 });
    }

    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
      return NextResponse.json({
        available: false,
        error: 'Slug must be 3-50 chars, lowercase letters, numbers, and hyphens only'
      }, { status: 400 });
    }

    const db = createServiceClient();

    const { data } = await db
      .from('sites')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    return NextResponse.json({ available: data === null });
  } catch (err) {
    console.error('[check-slug]', err);
    return NextResponse.json({ available: false, error: 'Internal error' }, { status: 500 });
  }
}
