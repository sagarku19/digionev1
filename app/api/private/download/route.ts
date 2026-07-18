// POST /api/private/download
// Creator-facing endpoint: mints a short-TTL signed download URL for a file in
// creator-private or creator-content that the calling creator owns. Used by
// dashboard surfaces (KYC review, own-deliverable preview).
//
// Ownership check: the path must start with the calling creator's profile.id.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedIdentity } from '@/lib/server/auth-claims';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { resolveBucket, storage } from '@/lib/storage';
import crypto from 'crypto';

type PrivateBucket = 'creator-content';
const VALID_BUCKETS: ReadonlySet<PrivateBucket> = new Set(['creator-content']);
const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes

type LogLevel = 'warn' | 'error';

function log(level: LogLevel, reqId: string, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ reqId, ts: new Date().toISOString(), event, ...(data ?? {}) });
  if (level === 'error') console.error('[api/private/download]', line);
  else console.warn('[api/private/download]', line);
}

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const cookieClient = await createClient();
    const identity = await getVerifiedIdentity(cookieClient);
    if (!identity) {
      return json(reqId, { error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => null) as {
      bucket?: unknown;
      path?: unknown;
    } | null;
    if (!body) {
      return json(reqId, { error: 'Invalid JSON body' }, 400);
    }

    const { bucket, path } = body;
    if (typeof bucket !== 'string' || !VALID_BUCKETS.has(bucket as PrivateBucket)) {
      return json(reqId, { error: 'Invalid bucket (must be creator-content)' }, 400);
    }
    if (typeof path !== 'string' || path.length === 0) {
      return json(reqId, { error: 'path required' }, 400);
    }
    // Defense in depth: reject any path containing parent refs even though
    // the ownership check below would also catch most of these.
    if (path.includes('..') || path.startsWith('/') || path.includes('\\')) {
      return json(reqId, { error: 'Invalid path' }, 400);
    }

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, identity.userId);
    if (!creatorId) {
      log('warn', reqId, 'profile_lookup_failed', { authId: identity.userId });
      return json(reqId, { error: 'Creator profile not found' }, 403);
    }

    // Ownership: path must start with {creatorId}/. Strict prefix match.
    const expectedPrefix = `${creatorId}/`;
    if (!path.startsWith(expectedPrefix)) {
      log('warn', reqId, 'ownership_violation', { creatorId, requestedPath: path });
      return json(reqId, { error: 'You do not own this file' }, 403);
    }

    const cfg = resolveBucket(bucket as PrivateBucket);
    try {
      const signedUrl = await storage.createDownloadUrl({ bucket: cfg.name, objectKey: path, ttlSeconds: SIGNED_URL_TTL_SECONDS });
      return json(reqId, { bucket, path, signedUrl, ttlSeconds: SIGNED_URL_TTL_SECONDS }, 200);
    } catch (e) {
      log('error', reqId, 'storage_sign_failed', { bucket, path, message: e instanceof Error ? e.message : String(e) });
      return json(reqId, { error: 'Failed to create download URL' }, 502);
    }
  } catch (err) {
    log('error', reqId, 'unhandled', { message: err instanceof Error ? err.message : String(err) });
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
