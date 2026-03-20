// API Route: GET /api/sites/check-slug?slug=xxx
// Checks whether a slug is available. Reads: sites table.
// Uses service client so the check works regardless of auth state.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug')?.toLowerCase().trim();
    const type = searchParams.get('type');

    if (!slug || !type) {
      return NextResponse.json({ available: false, error: 'No slug or type provided' }, { status: 400 });
    }

    // Validate slug format
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
      return NextResponse.json({
        available: false,
        error: 'Slug must be 3–50 chars, lowercase letters, numbers, and hyphens only'
      }, { status: 400 });
    }

    const db = createServiceClient();
    
    // For main sites, check "slug". For child sites, check "child_slug"
    const columnToCheck = type === 'main' ? 'slug' : 'child_slug';

    const { data } = await db
      .from('sites')
      .select('id')
      .eq(columnToCheck, slug)
      .maybeSingle();

    return NextResponse.json({ available: data === null });
  } catch (err) {
    console.error('[check-slug]', err);
    return NextResponse.json({ available: false, error: 'Internal error' }, { status: 500 });
  }
}
