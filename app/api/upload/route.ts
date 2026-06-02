import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isUuid, sanitizeFilename } from '@/lib/upload-validators';
import crypto from 'crypto';

type Bucket = 'public-asset' | 'creator-public' | 'creator-content' | 'creator-private';

const VALID_BUCKETS: ReadonlySet<Bucket> = new Set([
  'public-asset',
  'creator-public',
  'creator-content',
  'creator-private',
]);

const PUBLIC_KINDS = new Set(['cover', 'linkinbio', 'avatar', 'banner', 'other']);
const PRIVATE_CATEGORIES = new Set(['kyc', 'contracts', 'other']);

type LogLevel = 'warn' | 'error';

function log(level: LogLevel, reqId: string, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ reqId, ts: new Date().toISOString(), event, ...(data ?? {}) });
  if (level === 'error') console.error('[api/upload]', line);
  else console.warn('[api/upload]', line);
}

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'X-Request-ID': reqId },
  });
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    // AuthN: session required before any business logic.
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) {
      return json(reqId, { error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => null) as {
      filename?: unknown;
      bucket?: unknown;
      productId?: unknown;
      kind?: unknown;
      category?: unknown;
    } | null;
    if (!body) {
      return json(reqId, { error: 'Invalid JSON body' }, 400);
    }

    const { filename: rawFilename, bucket = 'creator-public', productId, kind = 'other', category } = body;

    if (typeof rawFilename !== 'string') {
      return json(reqId, { error: 'Filename required' }, 400);
    }
    const safeName = sanitizeFilename(rawFilename);
    if (!safeName) {
      return json(reqId, { error: 'Filename invalid (allowed: letters, digits, . _ -, max 200 chars)' }, 400);
    }

    if (typeof bucket !== 'string' || !VALID_BUCKETS.has(bucket as Bucket)) {
      return json(reqId, { error: 'Invalid bucket' }, 400);
    }
    const typedBucket = bucket as Bucket;

    // public-asset and creator-public both use the {kind} subfolder taxonomy.
    if (
      (typedBucket === 'creator-public' || typedBucket === 'public-asset')
      && (typeof kind !== 'string' || !PUBLIC_KINDS.has(kind))
    ) {
      return json(reqId, { error: 'kind must be one of: cover, linkinbio, avatar, banner, other' }, 400);
    }
    if (typedBucket === 'creator-private' && (typeof category !== 'string' || !PRIVATE_CATEGORIES.has(category))) {
      return json(reqId, { error: 'category required (kyc | contracts | other) for creator-private' }, 400);
    }
    if (productId !== undefined && !isUuid(productId)) {
      return json(reqId, { error: 'productId must be a UUID' }, 400);
    }

    // AuthZ: derive creatorId server-side. 3-hop resolve.
    const serviceDb = createServiceClient();
    const { data: publicUser } = await serviceDb
      .from('users')
      .select('id')
      .eq('auth_provider_id', user.id)
      .maybeSingle();
    if (!publicUser) {
      log('warn', reqId, 'profile_lookup_failed', { stage: 'users', authId: user.id });
      return json(reqId, { error: 'User profile not found' }, 403);
    }
    const { data: profile } = await serviceDb
      .from('profiles')
      .select('id')
      .eq('user_id', publicUser.id)
      .maybeSingle();
    if (!profile) {
      log('warn', reqId, 'profile_lookup_failed', { stage: 'profiles', userId: publicUser.id });
      return json(reqId, { error: 'Creator profile not found' }, 403);
    }
    const creatorId = profile.id;

    // TODO(quota): when creator_subscriptions wiring is ready, look up the calling
    // creator's plan from subscription_plans.features.storage_gb, sum existing
    // creator-content usage for creatorId, and reject if this upload would exceed.

    const ts = Date.now();
    const filePath = buildPath(typedBucket, {
      safeName,
      ts,
      creatorId,
      productId: typeof productId === 'string' ? productId : undefined,
      kind: typeof kind === 'string' ? kind : 'other',
      category: typeof category === 'string' ? category : undefined,
    });

    const { data, error } = await serviceDb.storage
      .from(typedBucket)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      // Log Supabase internals server-side; do not leak to client.
      log('error', reqId, 'storage_signed_url_failed', {
        bucket: typedBucket,
        code: error?.name,
        message: error?.message,
      });
      return json(reqId, { error: 'Failed to create upload URL' }, 502);
    }

    const isPublicBucket = typedBucket === 'public-asset' || typedBucket === 'creator-public';
    return json(reqId, {
      signedUrl: data.signedUrl,
      path: data.path,
      publicUrl: isPublicBucket
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${typedBucket}/${data.path}`
        : null,
    }, 200);
  } catch (err) {
    // Catch-all. Never reveal err.message to the client.
    log('error', reqId, 'unhandled', { message: err instanceof Error ? err.message : String(err) });
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}

function buildPath(
  bucket: Bucket,
  args: { safeName: string; ts: number; creatorId: string; productId?: string; kind: string; category?: string }
): string {
  const { safeName, ts, creatorId, productId, kind, category } = args;
  switch (bucket) {
    case 'public-asset':
      return `digione/${kind}/${ts}_${safeName}`;
    case 'creator-public':
      return `${creatorId}/${kind}/${ts}_${safeName}`;
    case 'creator-content':
      return productId
        ? `${creatorId}/${productId}/${ts}_${safeName}`
        : `${creatorId}/unassigned/${ts}_${safeName}`;
    case 'creator-private':
      return `${creatorId}/${category}/${ts}_${safeName}`;
  }
}
