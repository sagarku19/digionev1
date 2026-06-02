// GET /api/deliverables/[productId]
// Buyer-facing endpoint: returns short-TTL signed download URLs for every file
// the creator has uploaded under creator-content/{creator_id}/{productId}/.
// Access-gated by user_product_access: the calling user must own the product.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isUuid } from '@/lib/upload-validators';
import crypto from 'crypto';

const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes
const MAX_FILES_RETURNED = 50;

type LogLevel = 'warn' | 'error';

function log(level: LogLevel, reqId: string, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ reqId, ts: new Date().toISOString(), event, ...(data ?? {}) });
  if (level === 'error') console.error('[api/deliverables]', line);
  else console.warn('[api/deliverables]', line);
}

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const { productId } = await params;
    if (!isUuid(productId)) {
      return json(reqId, { error: 'Invalid productId' }, 400);
    }

    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) {
      return json(reqId, { error: 'Unauthorized' }, 401);
    }

    const serviceDb = createServiceClient();

    // Access check: does the calling user actually own this product?
    // user_product_access keys off auth.users.id (the user column), not profiles.id.
    const { data: access } = await serviceDb
      .from('user_product_access')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();
    if (!access) {
      log('warn', reqId, 'access_denied', { userId: user.id, productId });
      return json(reqId, { error: 'You do not have access to this product' }, 403);
    }

    // Resolve the product's creator to find the storage folder.
    const { data: product } = await serviceDb
      .from('products')
      .select('creator_id, name')
      .eq('id', productId)
      .maybeSingle();
    if (!product) {
      log('warn', reqId, 'product_not_found', { productId });
      return json(reqId, { error: 'Product not found' }, 404);
    }

    const folder = `${product.creator_id}/${productId}`;
    const { data: objects, error: listError } = await serviceDb.storage
      .from('creator-content')
      .list(folder, { limit: MAX_FILES_RETURNED });
    if (listError) {
      log('error', reqId, 'storage_list_failed', { folder, message: listError.message });
      return json(reqId, { error: 'Failed to list deliverables' }, 502);
    }

    const files = await Promise.all(
      (objects ?? [])
        .filter((o) => o.name && !o.name.endsWith('/'))
        .map(async (o) => {
          const fullPath = `${folder}/${o.name}`;
          const { data: signed, error: signError } = await serviceDb.storage
            .from('creator-content')
            .createSignedUrl(fullPath, SIGNED_URL_TTL_SECONDS);
          if (signError || !signed) {
            log('error', reqId, 'storage_sign_failed', { path: fullPath, message: signError?.message });
            return null;
          }
          return {
            name: o.name,
            path: fullPath,
            signedUrl: signed.signedUrl,
            bytes: (o.metadata as { size?: number } | null)?.size ?? null,
            mimeType: (o.metadata as { mimetype?: string } | null)?.mimetype ?? null,
            createdAt: o.created_at,
          };
        })
    );

    return json(reqId, {
      productId,
      productName: product.name,
      ttlSeconds: SIGNED_URL_TTL_SECONDS,
      files: files.filter((f) => f !== null),
    }, 200);
  } catch (err) {
    log('error', reqId, 'unhandled', { message: err instanceof Error ? err.message : String(err) });
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
