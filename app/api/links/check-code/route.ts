// GET /api/links/check-code?code=xxx — live availability for the create/edit UI.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isValidCode, normalizeCode } from '@/lib/server/shortlinks/code';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = normalizeCode(searchParams.get('code') ?? '');

  if (!isValidCode(code)) {
    return NextResponse.json({ available: false, error: 'Invalid code' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data, error } = await db.from('linksh_links').select('id').eq('code', code).maybeSingle();
  if (error) return NextResponse.json({ available: false, error: 'Lookup failed' }, { status: 500 });
  return NextResponse.json({ available: data === null });
}
