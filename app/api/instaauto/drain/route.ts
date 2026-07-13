// POST /api/instaauto/drain — CRON_SECRET-guarded queue drainer. Drains every account
// with queued, due messages. Pace via CRON_DRAIN_BATCH per account per run.
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { drainAccount } from '@/lib/server/instaauto/drain';
import { CRON_DRAIN_BATCH } from '@/lib/server/instaauto/constants';

function authorized(req: Request): boolean {
  const h = req.headers.get('authorization') ?? '';
  return !!process.env.CRON_SECRET && h === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = createServiceClient();

  const { data: due } = await db.from('instaauto_messages')
    .select('account_id').eq('status', 'queued').lte('send_after', new Date().toISOString()).limit(500);
  const accountIds = [...new Set((due ?? []).map((r) => r.account_id))];

  let sent = 0, failed = 0;
  for (const accountId of accountIds) {
    const { data: account } = await db.from('instaauto_accounts').select('*').eq('id', accountId).maybeSingle();
    if (!account || account.status !== 'active') continue;
    const r = await drainAccount(db, account, CRON_DRAIN_BATCH);
    sent += r.sent; failed += r.failed;
  }
  return NextResponse.json({ accounts: accountIds.length, sent, failed });
}
