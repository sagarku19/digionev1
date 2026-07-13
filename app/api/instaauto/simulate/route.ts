// POST /api/instaauto/simulate — inject a synthetic inbound event into the REAL pipeline.
// Owner-scoped; only allowed for the creator's own simulated account. Powers the demo.
import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { processInboundEvent, drainFastPath } from '@/lib/server/instaauto/pipeline';
import type { InboundEvent, InboundEventType } from '@/lib/server/instaauto/types';

interface Body { eventType?: InboundEventType; text?: string; igUsername?: string; mediaId?: string; payloadRef?: string; }

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const db = createServiceClient();
  const { data: account } = await db.from('instaauto_accounts').select('*')
    .eq('creator_id', creatorId).eq('is_simulated', true).maybeSingle();
  if (!account) return NextResponse.json({ error: 'No demo account' }, { status: 404 });

  const igUserId = `sim_user_${Math.random().toString(36).slice(2, 8)}`;
  const ev: InboundEvent = {
    eventType: body.eventType ?? 'comment', igUserId, igUsername: body.igUsername || 'sim_follower',
    text: body.text ?? '', commentId: body.eventType === 'comment' ? `sim_c_${Date.now()}` : undefined,
    mediaId: body.mediaId, payloadRef: body.payloadRef, raw: { simulated: true, ...body },
  };

  after(async () => {
    try { await processInboundEvent(db, account, ev); await drainFastPath(db, account); }
    catch (e) { console.error('[instaauto/simulate]', e); }
  });
  return NextResponse.json({ accepted: true });
}
