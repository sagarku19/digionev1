import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

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
    const supabase = createServiceClient();
    const { filename, bucket = 'creator-public', creatorId, productId, kind = 'other', category } = await req.json() as {
      filename?: string;
      bucket?: Bucket;
      creatorId?: string;
      productId?: string;
      kind?: string;
      category?: string;
    };

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }
    if (!bucket || !VALID_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    }
    const needsCreator = bucket !== 'public-asset';
    if (needsCreator && !creatorId) {
      return NextResponse.json({ error: 'creatorId required for this bucket' }, { status: 400 });
    }
    if (bucket === 'creator-public' && !PUBLIC_KINDS.has(kind)) {
      return NextResponse.json({ error: 'kind must be one of: cover, linkinbio, avatar, banner, other' }, { status: 400 });
    }
    if (bucket === 'creator-private' && (!category || !PRIVATE_CATEGORIES.has(category))) {
      return NextResponse.json({ error: 'category required (kyc | contracts | other) for creator-private' }, { status: 400 });
    }

    // TODO(quota): when creator_subscriptions wiring is ready, look up the calling
    // creator's plan from subscription_plans.features.storage_gb, sum existing
    // creator-content usage for creatorId, and reject if this upload would exceed.
    // Until then, only the bucket-level file_size_limit (500 MB) applies.

    const safeName = filename.replace(/\s+/g, '_');
    const ts = Date.now();
    const filePath = buildPath(bucket, { safeName, ts, creatorId, productId, kind, category });

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      publicUrl:
        bucket === 'public-asset' || bucket === 'creator-public'
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${data.path}`
          : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function buildPath(
  bucket: Bucket,
  args: { safeName: string; ts: number; creatorId?: string; productId?: string; kind: string; category?: string }
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
