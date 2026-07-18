// POST /api/media/upload (multipart/form-data) — accepts an ORIGINAL image,
// converts to WebP via sharp, stores it in digione-media (logical creator-public
// or public-asset), writes a storage_files row, returns the public URL + fileId.
// Images are small (<= ~10MB) so streaming through the route is fine; large
// files use the presigned path (/api/upload).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedIdentity } from '@/lib/server/auth-claims';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { sanitizeFilename } from '@/lib/upload-validators';
import { resolveBucket, buildObjectKey, publicUrlFor, storage, toWebp, probe } from '@/lib/storage';
import { insertFile } from '@/lib/storage/files';
import type { LogicalBucket } from '@/lib/storage';
import crypto from 'crypto';

const IMAGE_BUCKETS: ReadonlySet<LogicalBucket> = new Set(['creator-public', 'public-asset']);
const PUBLIC_KINDS = new Set(['cover', 'avatar', 'banner', 'linkinbio', 'gallery', 'other']);
const MAX_BYTES = 15 * 1024 * 1024;

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId } });
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const identity = await getVerifiedIdentity(cookieClient);
    if (!identity) return json(reqId, { error: 'Unauthorized' }, 401);

    const form = await req.formData().catch(() => null);
    if (!form) return json(reqId, { error: 'Expected multipart/form-data' }, 400);
    const file = form.get('file');
    const bucket = String(form.get('bucket') ?? 'creator-public') as LogicalBucket;
    const kind = String(form.get('kind') ?? 'other');
    if (!(file instanceof File)) return json(reqId, { error: 'file required' }, 400);
    if (!IMAGE_BUCKETS.has(bucket)) return json(reqId, { error: 'Invalid image bucket' }, 400);
    if (!PUBLIC_KINDS.has(kind)) return json(reqId, { error: 'Invalid kind' }, 400);
    if (file.size > MAX_BYTES) return json(reqId, { error: 'Image too large' }, 413);

    const safeName = sanitizeFilename((file.name || 'image').replace(/\.[^.]+$/, '') + '.webp');
    if (!safeName) return json(reqId, { error: 'Filename invalid' }, 400);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, identity.userId);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);

    const input = Buffer.from(await file.arrayBuffer());
    await probe(input); // rejects non-images
    const webp = await toWebp(input);

    const ts = Date.now();
    const objectKey = buildObjectKey(bucket, { ts, safeName, creatorId, kind });
    const cfg = resolveBucket(bucket);
    await storage.putObject({ bucket: cfg.name, objectKey, body: webp.data, contentType: webp.contentType });

    const row = await insertFile(serviceDb, {
      owner_id: creatorId, bucket: cfg.name, object_key: objectKey, file_name: safeName,
      mime_type: webp.contentType, size: webp.size, visibility: 'public', kind, product_id: null,
    });

    return json(reqId, { fileId: row.id, publicUrl: publicUrlFor(bucket, objectKey), objectKey }, 200);
  } catch {
    return json(reqId, { error: 'Failed to upload image' }, 500);
  }
}
