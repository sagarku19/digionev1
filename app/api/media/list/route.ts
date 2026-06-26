// GET /api/media/list — the creator's ORIGINAL media assets (digione-media,
// parent_file_id IS NULL), newest first. Derivatives are excluded (per-placement).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { resolveBucket, publicUrlFor } from '@/lib/storage';
import crypto from 'crypto';

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

export async function GET(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, user.id);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);

    const cfg = resolveBucket('creator-public');
    const { data: rows } = await serviceDb.from('storage_files')
      .select('id, object_key, file_name, mime_type, size, kind, created_at')
      .eq('owner_id', creatorId).eq('bucket', cfg.name).is('parent_file_id', null).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(500);

    const files = (rows ?? []).map((r) => ({
      id: r.id, name: r.file_name, kind: r.kind, size: Number(r.size ?? 0),
      url: publicUrlFor('creator-public', r.object_key), createdAt: r.created_at,
    }));
    return json(reqId, { files }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
