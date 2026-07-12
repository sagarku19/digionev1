// GET /api/s/[code] — resolves a short code and 302-redirects. proxy.ts rewrites
// {shortdomain}/{code} → here. Handles (in order): disabled/expired/max-clicks,
// social-crawler OG shell, password gate, geo/device targeting. POST verifies a
// password from the interstitial form. Tracking runs post-response via after().

import { NextResponse, after } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { normalizeCode } from '@/lib/server/shortlinks/code';
import { appendUtmParams } from '@/lib/server/shortlinks/redirect-url';
import { parseUserAgent, isBot } from '@/lib/server/shortlinks/ua';
import { dedupHash, hashIp } from '@/lib/server/shortlinks/dedup';
import { TtlCache } from '@/lib/server/shortlinks/cache';
import { pickDestination } from '@/lib/server/shortlinks/targeting';
import { isSocialCrawler } from '@/lib/server/shortlinks/crawler';
import { renderOgHtml, renderUnlockHtml } from '@/lib/server/shortlinks/html';
import { verifyPassword, unlockToken } from '@/lib/server/shortlinks/password';
import type { Database } from '@/types/database.types';

type LinkRow = Database['public']['Tables']['linksh_links']['Row'];

const resolveCache = new TtlCache<LinkRow | null>(30_000);
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://digione.ai';

function redirect(to: string) {
  return NextResponse.redirect(to, { status: 302, headers: { 'Cache-Control': 'no-store' } });
}
function html(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
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

// Approximate cap: click_count is denormalized + cache-lagged, so max_clicks may
// overshoot slightly. Acceptable for a soft limit.
function isDisabled(link: LinkRow, now: number): boolean {
  const expired = link.expires_at ? new Date(link.expires_at).getTime() < now : false;
  const capped = link.max_clicks != null && Number(link.click_count) >= Number(link.max_clicks);
  return !link.is_active || !!link.archived_at || expired || capped;
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function ctxFromReq(req: Request) {
  const ua = req.headers.get('user-agent');
  const referrer = req.headers.get('referer') || req.headers.get('referrer') || null;
  const country = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || null;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return { ua, referrer, country, ip };
}

function trackClick(link: LinkRow, finalUrl: string, now: number, ctx: ReturnType<typeof ctxFromReq>) {
  after(async () => {
    try {
      if (isBot(ctx.ua)) return;
      const ipH = hashIp(ctx.ip);
      const { deviceType, browser, os } = parseUserAgent(ctx.ua);
      const db = createServiceClient();
      await db.rpc('linksh_record_click', {
        p_link_id: link.id, p_creator_id: link.creator_id, p_ip_hash: ipH,
        p_country: ctx.country ?? '', p_device_type: deviceType, p_browser: browser, p_os: os,
        p_referrer_url: ctx.referrer ?? '', p_user_agent: ctx.ua ?? '',
        p_resolved_destination_url: finalUrl, p_dedup_hash: dedupHash(link.id, ipH, now),
      });
    } catch (err) {
      console.error('[api/s] tracking failed', err);
    }
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);
  const link = await resolve(code);
  if (!link) return redirect(appUrl());

  const now = Date.now();
  if (isDisabled(link, now)) return redirect(link.expired_redirect_url || appUrl());

  const ctx = ctxFromReq(req);
  const { os } = parseUserAgent(ctx.ua);

  // Social crawler → OG meta shell (public preview; no tracking, no gate).
  if (isSocialCrawler(ctx.ua) && (link.og_title || link.og_description || link.og_image)) {
    const preview = appendUtmParams(pickDestination(link, { country: ctx.country, os }), link);
    return html(renderOgHtml({ title: link.og_title, description: link.og_description, image: link.og_image, url: preview }));
  }

  // Password gate.
  if (link.password_hash) {
    const expected = unlockToken(code, link.password_hash);
    if (readCookie(req, `du_${code}`) !== expected) {
      return html(renderUnlockHtml({ action: `/api/s/${encodeURIComponent(code)}` }));
    }
  }

  const finalUrl = appendUtmParams(pickDestination(link, { country: ctx.country, os }), link);
  trackClick(link, finalUrl, now, ctx);
  return redirect(finalUrl);
}

// POST — the password interstitial form submits here.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);
  const link = await resolve(code);
  if (!link) return redirect(appUrl());

  const now = Date.now();
  if (isDisabled(link, now)) return redirect(link.expired_redirect_url || appUrl());
  if (!link.password_hash) return redirect(appUrl());

  const action = `/api/s/${encodeURIComponent(code)}`;
  const form = await req.formData().catch(() => null);
  const password = form?.get('password');
  if (typeof password !== 'string' || !verifyPassword(password, link.password_hash)) {
    return html(renderUnlockHtml({ action, error: true }), 401);
  }

  const ctx = ctxFromReq(req);
  const { os } = parseUserAgent(ctx.ua);
  const finalUrl = appendUtmParams(pickDestination(link, { country: ctx.country, os }), link);
  trackClick(link, finalUrl, now, ctx);

  const res = redirect(finalUrl);
  res.cookies.set(`du_${code}`, unlockToken(code, link.password_hash), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 2,
  });
  return res;
}
