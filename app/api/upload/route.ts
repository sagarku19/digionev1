import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isUuid, sanitizeFilename } from '@/lib/upload-validators';

type Bucket = 'public-asset' | 'creator-public' | 'creator-content' | 'creator-private';

const VALID_BUCKETS: ReadonlySet<Bucket> = new Set([
  'public-asset',
  'creator-public',
  'creator-content',
  'creator-private',
]);

const PUBLIC_KINDS = new Set(['cover', 'linkinbio', 'avatar', 'banner', 'other']);
const PRIVATE_CATEGORIES = new Set(['kyc', 'contracts', 'other']);

export async function POST(req: Request) {
  try {
    // AuthN: session required before any business logic.
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null) as {
      filename?: unknown;
      bucket?: unknown;
      productId?: unknown;
      kind?: unknown;
      category?: unknown;
    } | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { filename: rawFilename, bucket = 'creator-public', productId, kind = 'other', category } = body;

    // Filename: sanitize against path-traversal and abuse.
    if (typeof rawFilename !== 'string') {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }
    const safeName = sanitizeFilename(rawFilename);
    if (!safeName) {
      return NextResponse.json({ error: 'Filename invalid (allowed: letters, digits, . _ -, max 200 chars)' }, { status: 400 });
    }

    if (typeof bucket !== 'string' || !VALID_BUCKETS.has(bucket as Bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    }
    const typedBucket = bucket as Bucket;

    if (typedBucket === 'creator-public' && (typeof kind !== 'string' || !PUBLIC_KINDS.has(kind))) {
      return NextResponse.json({ error: 'kind must be one of: cover, linkinbio, avatar, banner, other' }, { status: 400 });
    }
    if (typedBucket === 'creator-private' && (typeof category !== 'string' || !PRIVATE_CATEGORIES.has(category))) {
      return NextResponse.json({ error: 'category required (kyc | contracts | other) for creator-private' }, { status: 400 });
    }
    // productId is user-supplied and interpolated into the storage path for creator-content.
    // Without UUID format check, '../another' escapes the creator folder.
    if (productId !== undefined && !isUuid(productId)) {
      return NextResponse.json({ error: 'productId must be a UUID' }, { status: 400 });
    }

    // AuthZ: derive creatorId server-side from the authenticated session.
    // 3-hop resolve: auth.users -> public.users -> public.profiles.
    const serviceDb = createServiceClient();
    const { data: publicUser } = await serviceDb
      .from('users')
      .select('id')
      .eq('auth_provider_id', user.id)
      .maybeSingle();
    if (!publicUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }
    const { data: profile } = await serviceDb
      .from('profiles')
      .select('id')
      .eq('user_id', publicUser.id)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 403 });
    }
    const creatorId = profile.id;

    // TODO(quota): when creator_subscriptions wiring is ready, look up the calling
    // creator's plan from subscription_plans.features.storage_gb, sum existing
    // creator-content usage for creatorId, and reject if this upload would exceed.
    // Until then, only the bucket-level file_size_limit (500 MB) applies.

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

    if (error) throw error;

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      publicUrl:
        typedBucket === 'public-asset' || typedBucket === 'creator-public'
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${typedBucket}/${data.path}`
          : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function buildPath(
  bucket: Bucket,
  args: { safeName: string; ts: number; creatorId: string; productId?: string; kind: string; category?: string }
): string {
  const { safeName, ts, creatorId, productId, kind, category } = args;
  switch (bucket) {
    case 'public-asset':
      return `linkinbio/${ts}_${safeName}`;
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
