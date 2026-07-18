// GET /api/media/resolve?url=<derivative publicUrl> — for re-crop. Maps a
// placement's current derivative URL back to its storage_files row -> the
// original source URL + saved crop params so the picker can reload that crop.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedIdentity } from '@/lib/server/auth-claims';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { resolveBucket, publicUrlFor, storage } from '@/lib/storage';
import crypto from 'crypto';

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

export async function GET(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const identity = await getVerifiedIdentity(cookieClient);
    if (!identity) return json(reqId, { error: 'Unauthorized' }, 401);

    const url = new URL(req.url).searchParams.get('url');
    if (!url) return json(reqId, { error: 'url required' }, 400);

    const mediaBase = resolveBucket('creator-public').publicBaseUrl!;
    if (!url.startsWith(`${mediaBase}/`)) return json(reqId, { notDerivative: true }, 200);
    const objectKey = url.slice(mediaBase.length + 1);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, identity.userId);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);

    const cfg = resolveBucket('creator-public');
    const { data: row } = await serviceDb.from('storage_files').select('*')
      .eq('bucket', cfg.name).eq('object_key', objectKey).is('deleted_at', null).maybeSingle();
    if (!row || row.owner_id !== creatorId) return json(reqId, { error: 'Not found' }, 404);
    if (!row.parent_file_id && !(row.crop as { sourceUrl?: string } | null)?.sourceUrl) {
      return json(reqId, { notDerivative: true, derivativeFileId: row.id }, 200);
    }

    let originalUrl: string | null = (row.crop as { sourceUrl?: string } | null)?.sourceUrl ?? null;
    if (!originalUrl && row.parent_file_id) {
      const { data: parent } = await serviceDb.from('storage_files').select('*').eq('id', row.parent_file_id).maybeSingle();
      if (parent) {
        originalUrl = parent.visibility === 'public'
          ? publicUrlFor('creator-public', parent.object_key)
          : await storage.createDownloadUrl({ bucket: parent.bucket, objectKey: parent.object_key });
      }
    }
    return json(reqId, { derivativeFileId: row.id, originalFileId: row.parent_file_id, originalUrl, crop: row.crop }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
