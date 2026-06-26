// POST /api/media/delete — hard cascade: removes the original + ALL its
// derivatives (R2 objects + rows). Caller is warned in the UI that placements
// referencing the derivatives will break.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { isUuid } from '@/lib/upload-validators';
import { hardDeleteCascade } from '@/lib/storage/files';
import crypto from 'crypto';

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as { fileId?: unknown } | null;
    if (!body || !isUuid(body.fileId)) return json(reqId, { error: 'fileId required' }, 400);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, user.id);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);

    const { data: row } = await serviceDb.from('storage_files').select('id, owner_id').eq('id', body.fileId).maybeSingle();
    if (!row || row.owner_id !== creatorId) return json(reqId, { error: 'Not found' }, 404);

    const { removed } = await hardDeleteCascade(serviceDb, body.fileId);
    return json(reqId, { removed }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
