// POST /api/instaauto/account/disconnect — owner flips their account to revoked and pauses
// its automations. (Real revoke-with-Meta is out of Phase 1 scope; this stops processing.)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { accountId?: string };
  const db = createServiceClient();
  const q = db.from('instaauto_accounts').update({ status: 'revoked' }).eq('creator_id', creatorId);
  const { error } = body.accountId ? await q.eq('id', body.accountId) : await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from('instaauto_automations').update({ status: 'paused' })
    .eq('creator_id', creatorId).eq('status', 'active');
  return NextResponse.json({ disconnected: true });
}
