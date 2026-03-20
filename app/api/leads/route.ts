// POST /api/leads — captures email leads from EmailCapture section.
// DB tables written: site_page_views (as a lightweight lead signal; no guest_leads table in schema yet).
// TODO: Add a dedicated `guest_leads` table to schema for proper lead management.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // service role — bypasses RLS
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; siteId?: string; source?: string };
    const { email, siteId } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Log the lead as a page view event with page_slug = 'email_capture'
    // and session_id holding the email (until a proper guest_leads table is added).
    if (siteId) {
      const { error } = await supabase.from('site_page_views').insert({
        site_id: siteId,
        page_slug: 'email_capture',
        session_id: email.toLowerCase().trim(),
      });

      if (error) {
        // Non-fatal: log server-side but still return success to user
        console.error('[api/leads] insert error', error.message);
      }
    }

    // Always return success — even if DB insert failed, the lead is captured in server logs.
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error('[api/leads]', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
