import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getTransfer } from '@/lib/server/cashfree-payouts';
import type { Json } from '@/types/database.types';

const STALE_MINUTES = 15;

export async function POST(req: Request) {
  try {
    const db = createServiceClient();
    // Dual-auth: cron secret header OR a super_admin session.
    const cronSecret = req.headers.get('x-cron-secret');
    let authed = !!cronSecret && cronSecret === process.env.CRON_SECRET;
    if (!authed) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: actor } = await db.from('users').select('role').eq('auth_provider_id', user.id).maybeSingle();
        authed = actor?.role === 'super_admin';
      }
    }
    if (!authed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
    const { data: stuck } = await db.from('creator_payouts')
      .select('id').eq('status', 'processing').lt('initiated_at', cutoff).limit(50);

    let settled = 0;
    for (const p of stuck ?? []) {
      const { status, httpStatus } = await getTransfer(p.id);
      const s = (status ?? '').toUpperCase();
      if (['SUCCESS', 'COMPLETED', 'PAID'].includes(s)) {
        await db.rpc('settle_payout', { p_payout_id: p.id, p_terminal: 'success', p_gateway_metadata: { synced: true, status: s } as Json });
        settled++;
      } else if (['FAILED', 'REJECTED', 'REVERSED', 'CANCELLED'].includes(s)) {
        await db.rpc('settle_payout', { p_payout_id: p.id, p_terminal: 'failed', p_gateway_metadata: { synced: true, status: s } as Json, p_failure_reason: `synced_${s}` });
        settled++;
      } else if (httpStatus === 404) {
        // Cashfree has no record of transfer_id (= our payout.id): the transfer never reached the
        // gateway (e.g. approve threw after the pending→processing claim). No money moved → release
        // the hold so the stuck payout can be re-requested. Safe because transfer_id is our idempotency key.
        await db.rpc('settle_payout', { p_payout_id: p.id, p_terminal: 'failed', p_gateway_metadata: { synced: true, not_found: true } as Json, p_failure_reason: 'transfer_not_found' });
        settled++;
      }
      // else still in-flight → leave processing.
    }
    return NextResponse.json({ checked: stuck?.length ?? 0, settled });
  } catch (e) {
    console.error('[admin/payouts/sync]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
