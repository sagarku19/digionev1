// GET /api/media/list — the creator's own assets for the Media Library:
//   images: ORIGINAL media images (digione-media, parent_file_id IS NULL) -> public URL
//   files:  deliverable files (digione-products, private) -> short-TTL signed URL + product name
// Derivatives are excluded (per-placement). Both arrays are newest-first.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { resolveBucket, publicUrlFor, storage } from '@/lib/storage';
import { sumOwnerBytes } from '@/lib/storage/files';
import { CREATOR_CONTENT_QUOTA_BYTES } from '@/lib/storage/quota';
import crypto from 'crypto';

const SIGNED_TTL = 600;

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

export async function GET(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, user.id);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);

    // ── Images: own media originals (public) ──
    const mediaCfg = resolveBucket('creator-public');
    const { data: imgRows } = await serviceDb.from('storage_files')
      .select('id, object_key, file_name, mime_type, size, kind, created_at')
      .eq('owner_id', creatorId).eq('bucket', mediaCfg.name).is('parent_file_id', null).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(500);

    const images = (imgRows ?? []).map((r) => ({
      id: r.id, name: r.file_name, kind: r.kind, size: Number(r.size ?? 0),
      mimeType: r.mime_type, url: publicUrlFor('creator-public', r.object_key),
      createdAt: r.created_at, source: 'own' as const,
    }));

    // ── Files: own deliverables (private -> signed) ──
    const prodCfg = resolveBucket('creator-content');
    const { data: fileRows } = await serviceDb.from('storage_files')
      .select('id, object_key, file_name, mime_type, size, product_id, created_at')
      .eq('owner_id', creatorId).eq('bucket', prodCfg.name).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(500);

    const productIds = [...new Set((fileRows ?? []).map((r) => r.product_id).filter((x): x is string => Boolean(x)))];
    const nameById = new Map<string, string>();
    if (productIds.length) {
      const { data: prods } = await serviceDb.from('products').select('id, name').in('id', productIds);
      (prods ?? []).forEach((p) => nameById.set(p.id, p.name));
    }

    const files = await Promise.all((fileRows ?? []).map(async (r) => {
      let signedUrl: string | null = null;
      try { signedUrl = await storage.createDownloadUrl({ bucket: prodCfg.name, objectKey: r.object_key, ttlSeconds: SIGNED_TTL }); } catch { signedUrl = null; }
      return {
        id: r.id, name: r.file_name, size: Number(r.size ?? 0), mimeType: r.mime_type,
        signedUrl, productName: r.product_id ? (nameById.get(r.product_id) ?? null) : null,
        createdAt: r.created_at, source: 'own' as const,
      };
    }));

    // Files storage usage (deliverables / creator-content) — the quota'd bucket.
    // quotaBytes will vary per subscription once per-plan quotas land.
    const usedBytes = await sumOwnerBytes(serviceDb, creatorId, prodCfg.name);

    return json(reqId, { images, files, storage: { usedBytes, quotaBytes: CREATOR_CONTENT_QUOTA_BYTES } }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
