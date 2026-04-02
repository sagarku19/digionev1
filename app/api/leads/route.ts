// POST /api/leads — captures lead form submissions into lead_form table.
// Requires form_id (linked to forms table) and site_id.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // service role — bypasses RLS
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      formId?: string;
      siteId?: string;
      name?: string;
      email?: string;
      mobile?: string;
      custom?: Record<string, string>;
    };

    const { formId, siteId, name, email, mobile, custom } = body;

    if (!formId || !siteId) {
      return NextResponse.json({ error: 'formId and siteId are required' }, { status: 400 });
    }

    // At least one contact field must be provided
    if (!email && !mobile && !name) {
      return NextResponse.json({ error: 'At least one contact field is required' }, { status: 400 });
    }

    // Basic email validation if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    // Verify form exists and belongs to this site
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id')
      .eq('id', formId)
      .eq('site_id', siteId)
      .single();

    if (formError || !form) {
      console.error('[api/leads] form lookup error', formError?.message);
      return NextResponse.json({ error: 'Invalid form' }, { status: 400 });
    }

    const { error } = await supabase.from('lead_form').insert({
      form_id: formId,
      site_id: siteId,
      full_name: name?.trim() || null,
      email: email?.toLowerCase().trim() || null,
      mobile: mobile?.trim() || null,
      other: custom && Object.keys(custom).length > 0 ? custom : {},
    });

    if (error) {
      console.error('[api/leads] insert error', error.message);
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error('[api/leads]', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
