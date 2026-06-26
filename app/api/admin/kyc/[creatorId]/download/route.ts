// GET /api/admin/kyc/[creatorId]/download — the ONLY path that mints a KYC
// signed URL. super_admin only. Writes a kyc_access_log row on every mint.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isUuid } from '@/lib/upload-validators';
import { resolveBucket, storage } from '@/lib/storage';
import crypto from 'crypto';

const TTL = 600;
function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

export async function GET(req: Request, { params }: { params: Promise<{ creatorId: string }> }) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const { creatorId } = await params;
    if (!isUuid(creatorId)) return json(reqId, { error: 'Invalid creatorId' }, 400);

    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const serviceDb = createServiceClient();
    // Re-read the role from the DB (do not trust JWT metadata for an identity-doc action).
    const { data: pubUser } = await serviceDb.from('users').select('role').eq('auth_provider_id', user.id).maybeSingle();
    const isAdmin = pubUser?.role === 'super_admin' || user.app_metadata?.role === 'super_admin';
    if (!isAdmin) return json(reqId, { error: 'Forbidden' }, 403);

    const cfg = resolveBucket('creator-private');
    const { data: rows } = await serviceDb.from('storage_files').select('id, object_key, file_name, mime_type, created_at')
      .eq('owner_id', creatorId).eq('bucket', cfg.name).eq('kind', 'kyc').is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(50);
    if (!rows || rows.length === 0) return json(reqId, { error: 'No KYC documents found' }, 404);

    const files = await Promise.all(rows.map(async (r) => {
      const signedUrl = await storage.createDownloadUrl({ bucket: cfg.name, objectKey: r.object_key, ttlSeconds: TTL });
      await serviceDb.from('kyc_access_log').insert({
        admin_id: user.id, creator_id: creatorId, file_id: r.id, object_key: r.object_key,
      });
      return { name: r.file_name, signedUrl, mimeType: r.mime_type, createdAt: r.created_at };
    }));

    return json(reqId, { creatorId, ttlSeconds: TTL, files }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
