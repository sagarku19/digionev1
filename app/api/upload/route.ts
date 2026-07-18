import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedIdentity } from '@/lib/server/auth-claims';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { isUuid, sanitizeFilename } from '@/lib/upload-validators';
import { resolveBucket, buildObjectKey, storage } from '@/lib/storage';
import { sumOwnerBytes } from '@/lib/storage/files';
import { CREATOR_CONTENT_QUOTA_BYTES } from '@/lib/storage/quota';
import crypto from 'crypto';

type PrivateBucket = 'creator-content' | 'creator-private';
const VALID_BUCKETS: ReadonlySet<PrivateBucket> = new Set(['creator-content', 'creator-private']);
const PRIVATE_CATEGORIES = new Set(['kyc', 'contracts', 'other']);

type LogLevel = 'warn' | 'error';
function log(level: LogLevel, reqId: string, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ reqId, ts: new Date().toISOString(), event, ...(data ?? {}) });
  if (level === 'error') console.error('[api/upload]', line); else console.warn('[api/upload]', line);
}
function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId } });
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const identity = await getVerifiedIdentity(cookieClient);
    if (!identity) return json(reqId, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as {
      filename?: unknown; bucket?: unknown; productId?: unknown; category?: unknown;
    } | null;
    if (!body) return json(reqId, { error: 'Invalid JSON body' }, 400);

    const { filename: rawFilename, bucket, productId, category } = body;
    if (typeof rawFilename !== 'string') return json(reqId, { error: 'Filename required' }, 400);
    const safeName = sanitizeFilename(rawFilename);
    if (!safeName) return json(reqId, { error: 'Filename invalid (allowed: letters, digits, . _ -, max 200 chars)' }, 400);

    if (typeof bucket !== 'string' || !VALID_BUCKETS.has(bucket as PrivateBucket)) {
      return json(reqId, { error: 'Invalid bucket (images use /api/media/upload)' }, 400);
    }
    const typedBucket = bucket as PrivateBucket;
    if (typedBucket === 'creator-private' && (typeof category !== 'string' || !PRIVATE_CATEGORIES.has(category))) {
      return json(reqId, { error: 'category required (kyc | contracts | other) for creator-private' }, 400);
    }
    if (productId !== undefined && !isUuid(productId)) return json(reqId, { error: 'productId must be a UUID' }, 400);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, identity.userId);
    if (!creatorId) { log('warn', reqId, 'profile_lookup_failed', { authId: identity.userId }); return json(reqId, { error: 'Creator profile not found' }, 403); }

    const cfg = resolveBucket(typedBucket);

    if (typedBucket === 'creator-content') {
      const usedBytes = await sumOwnerBytes(serviceDb, creatorId, cfg.name);
      if (usedBytes >= CREATOR_CONTENT_QUOTA_BYTES) {
        log('warn', reqId, 'quota_exceeded', { creatorId, usedBytes });
        return json(reqId, { error: 'Storage quota exceeded', usedBytes, quotaBytes: CREATOR_CONTENT_QUOTA_BYTES }, 413);
      }
    }

    const ts = Date.now();
    const objectKey = buildObjectKey(typedBucket, {
      ts, safeName, creatorId,
      productId: typeof productId === 'string' ? productId : undefined,
      category: typeof category === 'string' ? category : undefined,
    });

    const uploadUrl = await storage.createUploadUrl({
      bucket: cfg.name,
      objectKey,
      contentType: 'application/octet-stream',
    });

    return json(reqId, { uploadUrl, bucket: typedBucket, objectKey }, 200);
  } catch (err) {
    log('error', reqId, 'unhandled', { message: err instanceof Error ? err.message : String(err) });
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
