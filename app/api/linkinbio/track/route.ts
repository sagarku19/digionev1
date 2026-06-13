// API Route: POST /api/linkinbio/track
// Fire-and-forget click/view tracking for Link in Bio pages.
// No auth required — this is a public tracking endpoint.
// Inserts into linkinbio_analytics + increments click_count on linkinbio_items.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createHash } from 'crypto';
import { rateLimit } from '@/lib/server/rate-limit';

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimit(req, 'linkinbio-track', { max: 60, windowSeconds: 60 }))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json() as {
      site_id?: string;
      link_id?: string;
      event_type?: string;
    };

    const { site_id, link_id, event_type } = body;

    if (!site_id || !event_type) {
      return NextResponse.json({ error: 'Missing site_id or event_type' }, { status: 400 });
    }

    const validEvents = ['page_view', 'link_click', 'product_click', 'social_click'];
    if (!validEvents.includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
    }

    const db = createServiceClient();

    // Extract metadata from request
    const referrer = req.headers.get('referer') || req.headers.get('referrer') || null;
    const userAgent = req.headers.get('user-agent') || null;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    const ipHash = createHash('sha256').update(ip).digest('hex').substring(0, 16);

    // Simple rate limiting: skip duplicate events from same IP + link within 30 seconds
    if (link_id) {
      const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
      const { data: recent } = await db
        .from('linkinbio_analytics')
        .select('id')
        .eq('site_id', site_id)
        .eq('link_id', link_id)
        .eq('ip_hash', ipHash)
        .gte('created_at', thirtySecondsAgo)
        .limit(1);

      if (recent && recent.length > 0) {
        return NextResponse.json({ ok: true, deduplicated: true });
      }
    }

    // Insert analytics event
    await db.from('linkinbio_analytics').insert({
      site_id,
      link_id: link_id || null,
      event_type,
      referrer_url: referrer,
      user_agent: userAgent,
      ip_hash: ipHash,
    });

    // Increment click_count on link if applicable
    if (link_id && (event_type === 'link_click' || event_type === 'product_click')) {
      await db.rpc('increment_link_click_count', { p_link_id: link_id });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[linkinbio/track]', err);
    // Don't fail — tracking should be best-effort
    return NextResponse.json({ ok: true });
  }
}
