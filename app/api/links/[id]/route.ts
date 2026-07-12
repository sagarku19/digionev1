// PATCH /api/links/[id] — edit a link (re-validates destination + code).
// DELETE /api/links/[id] — permanently delete. Both enforce ownership.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { isValidCode, normalizeCode } from '@/lib/server/shortlinks/code';
import { validateDestinationUrl } from '@/lib/server/shortlinks/url-safety';
import { getShortlinkDomain } from '@/lib/shared/shortlink';

interface PatchBody {
  destination_url?: string;
  code?: string;
  title?: string | null;
  tags?: string[];
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  expires_at?: string | null;
  expired_redirect_url?: string | null;
  is_active?: boolean;
  archived_at?: string | null;
}

function appHostOf(appUrl?: string): string | undefined {
  if (!appUrl) return undefined;
  try { return new URL(appUrl).host; } catch { return undefined; }
}

async function authCreator(): Promise<{ creatorId: string } | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });
  return { creatorId };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authCreator();
    if (auth instanceof NextResponse) return auth;

    const body = (await req.json().catch(() => null)) as PatchBody | null;
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const db = createServiceClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.destination_url !== undefined) {
      const check = validateDestinationUrl(body.destination_url, {
        shortDomain: getShortlinkDomain(),
        appHost: appHostOf(process.env.NEXT_PUBLIC_APP_URL),
      });
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
      patch.destination_url = check.url;
    }

    if (body.code !== undefined) {
      const code = normalizeCode(body.code);
      if (!isValidCode(code)) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
      const { data: taken } = await db
        .from('linksh_links').select('id').eq('code', code).neq('id', id).maybeSingle();
      if (taken) return NextResponse.json({ error: 'That code is already taken' }, { status: 409 });
      patch.code = code;
    }

    for (const key of ['title', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
      'utm_content', 'expires_at', 'expired_redirect_url', 'is_active', 'archived_at'] as const) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    if (body.tags !== undefined) patch.tags = Array.isArray(body.tags) ? body.tags.slice(0, 20) : [];

    const { data, error } = await db
      .from('linksh_links')
      .update(patch)
      .eq('id', id)
      .eq('creator_id', auth.creatorId)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ link: data });
  } catch (err) {
    console.error('[api/links PATCH]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authCreator();
    if (auth instanceof NextResponse) return auth;

    const db = createServiceClient();
    const { data, error } = await db
      .from('linksh_links')
      .delete()
      .eq('id', id)
      .eq('creator_id', auth.creatorId)
      .select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[api/links DELETE]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
