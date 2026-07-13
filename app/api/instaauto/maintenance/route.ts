// POST /api/instaauto/maintenance — CRON_SECRET. (1) Refresh long-lived tokens expiring
// within 7 days. (2) Re-queue messages stuck in 'processing' > 15 min (crash recovery).
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { refreshLongLivedToken } from '@/lib/server/instaauto/graph';
import { encryptToken, decryptToken } from '@/lib/server/instaauto/token-crypto';

function authorized(req: Request): boolean {
  const h = req.headers.get('authorization') ?? '';
  return !!process.env.CRON_SECRET && h === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = createServiceClient();

  // Stuck sweep — back to queued for the drainer.
  const stuckBefore = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: stuck } = await db.from('instaauto_messages')
    .update({ status: 'queued' }).eq('status', 'processing').lt('last_attempt_at', stuckBefore).select('id');

  // Token refresh — real accounts expiring within 7 days.
  const soon = new Date(Date.now() + 7 * 86400_000).toISOString();
  const { data: accounts } = await db.from('instaauto_accounts')
    .select('*').eq('is_simulated', false).eq('status', 'active').lt('token_expires_at', soon);
  let refreshed = 0;
  for (const acc of accounts ?? []) {
    try {
      const next = await refreshLongLivedToken(decryptToken(acc.access_token_enc ?? ''));
      await db.from('instaauto_accounts').update({
        access_token_enc: encryptToken(next.token),
        token_expires_at: new Date(Date.now() + next.expiresIn * 1000).toISOString(),
        last_refreshed_at: new Date().toISOString(),
      }).eq('id', acc.id);
      refreshed++;
    } catch (e) {
      console.error('[instaauto/maintenance] refresh failed', acc.id, e);
      await db.from('instaauto_accounts').update({ status: 'expired' }).eq('id', acc.id);
    }
  }
  return NextResponse.json({ requeued: stuck?.length ?? 0, refreshed });
}
