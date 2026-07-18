// POST /api/upload/confirm — after a client completes a presigned PUT, HEAD the
// object for its authoritative size and write the storage_files row. Idempotent
// on the partial-unique (bucket, object_key) live index.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedIdentity } from '@/lib/server/auth-claims';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { isUuid } from '@/lib/upload-validators';
import { resolveBucket, storage } from '@/lib/storage';
import { findLiveByKey, insertFile } from '@/lib/storage/files';
import crypto from 'crypto';

type PrivateBucket = 'creator-content' | 'creator-private';
const VALID_BUCKETS: ReadonlySet<PrivateBucket> = new Set(['creator-content', 'creator-private']);

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const identity = await getVerifiedIdentity(cookieClient);
    if (!identity) return json(reqId, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as {
      bucket?: unknown; objectKey?: unknown; productId?: unknown; kind?: unknown; mimeType?: unknown; fileName?: unknown;
    } | null;
    if (!body) return json(reqId, { error: 'Invalid JSON body' }, 400);

    const { bucket, objectKey, productId, kind, mimeType, fileName } = body;
    const resolvedMime = typeof mimeType === 'string' && mimeType.length > 0 && mimeType.length <= 255
      ? mimeType
      : null;
    // Original (display) filename from the client — the object key keeps its
    // {ts}_ prefix for uniqueness, but file_name should read cleanly.
    const resolvedFileName = typeof fileName === 'string' && fileName.length > 0 && fileName.length <= 200
      ? fileName
      : null;
    if (typeof bucket !== 'string' || !VALID_BUCKETS.has(bucket as PrivateBucket)) return json(reqId, { error: 'Invalid bucket' }, 400);
    if (typeof objectKey !== 'string' || objectKey.includes('..') || objectKey.startsWith('/') || objectKey.includes('\\')) {
      return json(reqId, { error: 'Invalid objectKey' }, 400);
    }
    if (productId !== undefined && !isUuid(productId)) return json(reqId, { error: 'productId must be a UUID' }, 400);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, identity.userId);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);
    if (!objectKey.startsWith(`${creatorId}/`)) return json(reqId, { error: 'You do not own this object' }, 403);

    const cfg = resolveBucket(bucket as PrivateBucket);

    const existing = await findLiveByKey(serviceDb, cfg.name, objectKey);
    if (existing) return json(reqId, { fileId: existing.id, alreadyConfirmed: true }, 200);

    const head = await storage.headObject({ bucket: cfg.name, objectKey });
    const derivedName = objectKey.split('/').pop() ?? objectKey;
    const row = await insertFile(serviceDb, {
      owner_id: creatorId,
      bucket: cfg.name,
      object_key: objectKey,
      file_name: resolvedFileName ?? derivedName,
      mime_type: resolvedMime ?? head.contentType,
      size: head.size,
      visibility: 'private',
      kind: typeof kind === 'string' ? kind : (bucket === 'creator-content' ? 'deliverable' : 'other'),
      product_id: typeof productId === 'string' ? productId : null,
    });
    return json(reqId, { fileId: row.id, size: row.size }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
