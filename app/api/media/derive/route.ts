// POST /api/media/derive — produce a non-destructive cropped derivative from a
// source (an owned original via sourceFileId, OR a stock/library public-asset
// URL via sourceUrl). sharp crops+converts; a new storage_files row records
// parent_file_id + crop. Optionally soft-deletes a replaced derivative.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { sanitizeFilename } from '@/lib/upload-validators';
import { resolveBucket, buildObjectKey, publicUrlFor, storage, parseCrop, cropToWebp, probe } from '@/lib/storage';
import { insertFile, softDelete } from '@/lib/storage/files';
import crypto from 'crypto';

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId } });
}

async function fetchSource(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`source fetch failed ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as {
      sourceFileId?: unknown; sourceUrl?: unknown; crop?: unknown; kind?: unknown; replacesFileId?: unknown;
    } | null;
    if (!body) return json(reqId, { error: 'Invalid JSON body' }, 400);
    const kind = typeof body.kind === 'string' ? body.kind : 'other';

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, user.id);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);

    // Resolve the source bytes + a pointer for re-crop.
    let sourceBuf: Buffer;
    let parentFileId: string | null = null;
    let sourceUrl: string | null = null;
    if (typeof body.sourceFileId === 'string') {
      const { data: parent } = await serviceDb.from('storage_files').select('*').eq('id', body.sourceFileId).is('deleted_at', null).maybeSingle();
      if (!parent || parent.owner_id !== creatorId) return json(reqId, { error: 'Source not found' }, 404);
      parentFileId = parent.id;
      const pub = parent.visibility === 'public'
        ? publicUrlFor('creator-public', parent.object_key)
        : await storage.createDownloadUrl({ bucket: parent.bucket, objectKey: parent.object_key });
      sourceBuf = await fetchSource(pub!);
    } else if (typeof body.sourceUrl === 'string' && /^https?:\/\//.test(body.sourceUrl)) {
      sourceUrl = body.sourceUrl;
      sourceBuf = await fetchSource(body.sourceUrl);
    } else {
      return json(reqId, { error: 'sourceFileId or sourceUrl required' }, 400);
    }

    const dim = await probe(sourceBuf);
    const crop = parseCrop(body.crop, dim);
    const webp = await cropToWebp(sourceBuf, crop);

    const ts = Date.now();
    const safeName = sanitizeFilename(`crop_${ts}.webp`)!;
    const objectKey = buildObjectKey('creator-public', { ts, safeName, creatorId, kind, derived: true });
    const cfg = resolveBucket('creator-public');
    await storage.putObject({ bucket: cfg.name, objectKey, body: webp.data, contentType: webp.contentType });

    const row = await insertFile(serviceDb, {
      owner_id: creatorId, bucket: cfg.name, object_key: objectKey, file_name: safeName,
      mime_type: webp.contentType, size: webp.size, visibility: 'public', kind,
      product_id: null, parent_file_id: parentFileId,
      crop: { ...crop, sourceUrl },
    });

    // Replace/re-crop: soft-delete the old derivative (orphan cleanup).
    if (typeof body.replacesFileId === 'string') {
      const { data: old } = await serviceDb.from('storage_files').select('id, owner_id').eq('id', body.replacesFileId).maybeSingle();
      if (old && old.owner_id === creatorId) await softDelete(serviceDb, old.id);
    }

    return json(reqId, { fileId: row.id, publicUrl: publicUrlFor('creator-public', objectKey), objectKey }, 200);
  } catch {
    return json(reqId, { error: 'Failed to crop image' }, 500);
  }
}
