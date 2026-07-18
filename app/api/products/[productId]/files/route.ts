// GET  /api/products/[productId]/files  — list THIS creator's deliverable files
//                                          for the product (+ quota usage).
// DELETE same path, body { fileId }      — archive one file: soft-delete the row;
//                                          keep the R2 object when the product has
//                                          buyers (so their download survives).
// Both verify the caller owns the product; DELETE additionally verifies the file
// is bound to (this creator, this product, the products bucket) — never fileId alone.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedIdentity } from '@/lib/server/auth-claims';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { isUuid } from '@/lib/upload-validators';
import { resolveBucket, storage } from '@/lib/storage';
import { sumOwnerBytes, softDelete } from '@/lib/storage/files';
import { CREATOR_CONTENT_QUOTA_BYTES } from '@/lib/storage/quota';
import crypto from 'crypto';

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

async function resolveOwnedProduct(
  serviceDb: ReturnType<typeof createServiceClient>,
  authUserId: string,
  productId: string,
): Promise<{ creatorId: string } | { error: string; status: number }> {
  const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, authUserId);
  if (!creatorId) return { error: 'Creator profile not found', status: 403 };
  const { data: product } = await serviceDb.from('products').select('creator_id').eq('id', productId).maybeSingle();
  if (!product) return { error: 'Product not found', status: 404 };
  if (product.creator_id !== creatorId) return { error: 'You do not own this product', status: 403 };
  return { creatorId };
}

export async function GET(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const { productId } = await params;
    if (!isUuid(productId)) return json(reqId, { error: 'Invalid productId' }, 400);

    const cookieClient = await createClient();
    const identity = await getVerifiedIdentity(cookieClient);
    if (!identity) return json(reqId, { error: 'Unauthorized' }, 401);

    const serviceDb = createServiceClient();
    const owned = await resolveOwnedProduct(serviceDb, identity.userId, productId);
    if ('error' in owned) return json(reqId, { error: owned.error }, owned.status);

    const cfg = resolveBucket('creator-content');
    const { data: rows } = await serviceDb.from('storage_files')
      .select('id, file_name, size, mime_type, created_at')
      .eq('owner_id', owned.creatorId).eq('bucket', cfg.name).eq('product_id', productId).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(200);

    const files = (rows ?? []).map((r) => ({
      id: r.id, name: r.file_name, size: Number(r.size ?? 0), mimeType: r.mime_type, createdAt: r.created_at,
    }));
    const usedBytes = await sumOwnerBytes(serviceDb, owned.creatorId, cfg.name);
    return json(reqId, { files, usedBytes, quotaBytes: CREATOR_CONTENT_QUOTA_BYTES }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const { productId } = await params;
    if (!isUuid(productId)) return json(reqId, { error: 'Invalid productId' }, 400);

    const cookieClient = await createClient();
    const identity = await getVerifiedIdentity(cookieClient);
    if (!identity) return json(reqId, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as { fileId?: unknown } | null;
    if (!body || !isUuid(body.fileId)) return json(reqId, { error: 'fileId required' }, 400);

    const serviceDb = createServiceClient();
    const owned = await resolveOwnedProduct(serviceDb, identity.userId, productId);
    if ('error' in owned) return json(reqId, { error: owned.error }, owned.status);

    const cfg = resolveBucket('creator-content');
    // Triple-binding: the row must belong to this creator, this product, this bucket.
    const { data: row } = await serviceDb.from('storage_files')
      .select('id, object_key, owner_id, product_id, bucket')
      .eq('id', body.fileId).is('deleted_at', null).maybeSingle();
    if (!row || row.owner_id !== owned.creatorId || row.product_id !== productId || row.bucket !== cfg.name) {
      return json(reqId, { error: 'Not found' }, 404);
    }

    // Archive-instead-of-delete: if any buyer holds this product, keep the R2
    // object so their download survives (served to pre-deletion buyers by
    // /api/deliverables via the purchase-date filter). Never-purchased files are
    // hard-deleted to avoid orphan storage. The row is soft-deleted either way
    // (removed from the creator's view + frees their quota).
    const [{ data: upa }, { data: ge }] = await Promise.all([
      serviceDb.from('user_product_access').select('id').eq('product_id', productId).limit(1).maybeSingle(),
      serviceDb.from('guest_entitlements').select('id').eq('product_id', productId).limit(1).maybeSingle(),
    ]);
    const purchased = Boolean(upa) || Boolean(ge);
    if (!purchased) {
      try { await storage.delete({ bucket: cfg.name, objectKey: row.object_key }); } catch { /* already gone */ }
    }
    await softDelete(serviceDb, row.id, owned.creatorId);
    return json(reqId, { ok: true, archived: purchased }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
