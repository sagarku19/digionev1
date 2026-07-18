// POST /api/links — creator creates a short link (validated: destination URL
// safety + code validity/uniqueness + per-creator rate limit).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedIdentity } from '@/lib/server/auth-claims';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { rateLimitKey } from '@/lib/server/rate-limit';
import { generateCode, isValidCode, normalizeCode } from '@/lib/server/shortlinks/code';
import { validateDestinationUrl } from '@/lib/server/shortlinks/url-safety';
import { getShortlinkDomain } from '@/lib/shared/shortlink';
import { hashPassword } from '@/lib/server/shortlinks/password';
import { sanitizePhase2Fields } from '@/lib/server/shortlinks/link-input';

interface CreateBody {
  destination_url?: string;
  code?: string;
  title?: string;
  tags?: string[];
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  expires_at?: string | null;
  expired_redirect_url?: string | null;
  password?: string;
  ios_url?: string;
  android_url?: string;
  geo?: Record<string, string>;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  max_clicks?: number | null;
}

function appHostOf(appUrl?: string): string | undefined {
  if (!appUrl) return undefined;
  try { return new URL(appUrl).host; } catch { return undefined; }
}

async function generateUniqueCode(
  db: ReturnType<typeof createServiceClient>
): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const candidate = generateCode(7);
    const { data } = await db.from('linksh_links').select('id').eq('code', candidate).maybeSingle();
    if (!data) return candidate;
  }
  return generateCode(9); // widen on repeated collisions
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const identity = await getVerifiedIdentity(supabase);
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const creatorId = await resolveProfileId(identity.userId, identity.email);
    if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

    if (!(await rateLimitKey(`links-create:${creatorId}`, { max: 30, windowSeconds: 60 }))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = (await req.json().catch(() => null)) as CreateBody | null;
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const urlCheck = validateDestinationUrl(body.destination_url ?? '', {
      shortDomain: getShortlinkDomain(),
      appHost: appHostOf(process.env.NEXT_PUBLIC_APP_URL),
    });
    if (!urlCheck.ok) return NextResponse.json({ error: urlCheck.error }, { status: 400 });

    const phase2 = sanitizePhase2Fields(body, {
      shortDomain: getShortlinkDomain(),
      appHost: appHostOf(process.env.NEXT_PUBLIC_APP_URL),
    });
    if (!phase2.ok) return NextResponse.json({ error: phase2.error }, { status: 400 });

    const db = createServiceClient();

    let code: string;
    if (body.code && body.code.trim()) {
      code = normalizeCode(body.code);
      if (!isValidCode(code)) {
        return NextResponse.json({ error: 'Code must be 3–50 chars: letters, numbers, - or _' }, { status: 400 });
      }
      const { data: taken } = await db.from('linksh_links').select('id').eq('code', code).maybeSingle();
      if (taken) return NextResponse.json({ error: 'That code is already taken' }, { status: 409 });
    } else {
      code = await generateUniqueCode(db);
    }

    const { data, error } = await db.from('linksh_links').insert({
      creator_id: creatorId,
      code,
      destination_url: urlCheck.url!,
      title: body.title?.trim() || null,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 20) : [],
      utm_source: body.utm_source?.trim() || null,
      utm_medium: body.utm_medium?.trim() || null,
      utm_campaign: body.utm_campaign?.trim() || null,
      utm_term: body.utm_term?.trim() || null,
      utm_content: body.utm_content?.trim() || null,
      expires_at: body.expires_at || null,
      expired_redirect_url: body.expired_redirect_url?.trim() || null,
      password_hash: body.password && body.password.trim() ? hashPassword(body.password) : null,
      ios_url: phase2.fields.ios_url ?? null,
      android_url: phase2.fields.android_url ?? null,
      geo: phase2.fields.geo ?? null,
      og_title: phase2.fields.og_title ?? null,
      og_description: phase2.fields.og_description ?? null,
      og_image: phase2.fields.og_image ?? null,
      max_clicks: phase2.fields.max_clicks ?? null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data }, { status: 201 });
  } catch (err) {
    console.error('[api/links POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
