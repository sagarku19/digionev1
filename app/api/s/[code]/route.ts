// GET /api/s/[code] — resolves a short code and 302-redirects to its
// destination. proxy.ts rewrites {shortdomain}/{code} → here. Click tracking
// runs post-response via after() and never blocks the redirect.

import { NextResponse, after } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { normalizeCode } from '@/lib/server/shortlinks/code';
import { appendUtmParams } from '@/lib/server/shortlinks/redirect-url';
import { parseUserAgent, isBot } from '@/lib/server/shortlinks/ua';
import { dedupHash, hashIp } from '@/lib/server/shortlinks/dedup';
import { TtlCache } from '@/lib/server/shortlinks/cache';
import type { Database } from '@/types/database.types';

type LinkRow = Database['public']['Tables']['linksh_links']['Row'];

const resolveCache = new TtlCache<LinkRow | null>(30_000);
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://digione.ai';

function redirect(to: string) {
  return NextResponse.redirect(to, { status: 302, headers: { 'Cache-Control': 'no-store' } });
}

async function resolve(code: string): Promise<LinkRow | null> {
  const cached = resolveCache.get(code);
  if (cached !== undefined) return cached;
  const db = createServiceClient();
  const { data } = await db.from('linksh_links').select('*').eq('code', code).maybeSingle();
  const row = (data as LinkRow | null) ?? null;
  resolveCache.set(code, row);
  return row;
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);

  const link = await resolve(code);
  if (!link) return redirect(appUrl());

  const now = Date.now();
  const expired = link.expires_at ? new Date(link.expires_at).getTime() < now : false;
  if (!link.is_active || link.archived_at || expired) {
    return redirect(link.expired_redirect_url || appUrl());
  }

  const finalUrl = appendUtmParams(link.destination_url, link);

  const ua = req.headers.get('user-agent');
  const referrer = req.headers.get('referer') || req.headers.get('referrer') || null;
  const country = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || null;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || 'unknown';

  after(async () => {
    try {
      if (isBot(ua)) return;
      const ipH = hashIp(ip);
      const { deviceType, browser, os } = parseUserAgent(ua);
      const db = createServiceClient();
      await db.rpc('linksh_record_click', {
        p_link_id: link.id,
        p_creator_id: link.creator_id,
        p_ip_hash: ipH,
        p_country: country ?? '',
        p_device_type: deviceType,
        p_browser: browser,
        p_os: os,
        p_referrer_url: referrer ?? '',
        p_user_agent: ua ?? '',
        p_resolved_destination_url: finalUrl,
        p_dedup_hash: dedupHash(link.id, ipH, now),
      });
    } catch (err) {
      console.error('[api/s] tracking failed', err);
    }
  });

  return redirect(finalUrl);
}
