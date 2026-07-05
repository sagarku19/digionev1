// Terminal admin for refunds + balance freezes (interim until the admin app). Service-role.
//   npx tsx --env-file=.env.local scripts/refund-admin.ts view     <orderId|creatorId>
//   npx tsx --env-file=.env.local scripts/refund-admin.ts refund   <orderId> [amount] [--reason "..."]
//   npx tsx --env-file=.env.local scripts/refund-admin.ts sync
//   npx tsx --env-file=.env.local scripts/refund-admin.ts freeze   <creatorId> <amount> --reason "..." [--source dispute|manual]
//   npx tsx --env-file=.env.local scripts/refund-admin.ts unfreeze <logId> [--note "..."]
import { createServiceClient } from '../lib/supabase/service';
import { initiateRefund, syncProcessingRefunds, RefundError } from '../src/lib/server/refunds';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const [cmd, target, third] = process.argv.slice(2);
  const db = createServiceClient();

  if (cmd === 'view') {
    if (!target) throw new Error('usage: refund-admin view <orderId|creatorId>');
    const { data: byOrder } = await db.from('refunds')
      .select('id, order_id, amount, fee_reversed, net_clawback, status, initiated_by, failure_reason, created_at, processed_at')
      .eq('order_id', target).order('created_at', { ascending: false });
    const { data: byCreator } = await db.from('refunds')
      .select('id, order_id, amount, fee_reversed, net_clawback, status, initiated_by, failure_reason, created_at, processed_at')
      .eq('creator_id', target).order('created_at', { ascending: false }).limit(20);
    const refunds = (byOrder?.length ? byOrder : byCreator) ?? [];
    console.log('refunds:', refunds.length ? refunds : '(none)');
    const { data: logs } = await db.from('wallet_frozen_logs')
      .select('id, amount, reason, status, source, refund_id, created_at, released_at')
      .eq('creator_id', target).order('created_at', { ascending: false }).limit(20);
    if (logs?.length) console.log('frozen logs:', logs);
    const { data: bal } = await db.from('creator_balances')
      .select('total_earnings, total_platform_fees, total_paid_out, pending_payout, frozen_balance')
      .eq('creator_id', target).maybeSingle();
    if (bal) console.log('balance:', bal);
  } else if (cmd === 'refund') {
    if (!target) throw new Error('usage: refund-admin refund <orderId> [amount] [--reason "..."]');
    const amount = third && !third.startsWith('--') ? Number(third) : null;
    const refund = await initiateRefund(db, {
      orderId: target, amount, reason: arg('--reason') ?? null,
      initiatedBy: 'admin', initiatorId: null,
    });
    console.log('refund initiated (processing):', refund);
  } else if (cmd === 'sync') {
    const res = await syncProcessingRefunds(db);
    console.log(`checked ${res.checked} processing refunds, settled ${res.settled}`);
  } else if (cmd === 'freeze') {
    const amount = Number(third);
    const reason = arg('--reason');
    if (!target || !Number.isFinite(amount) || amount <= 0 || !reason) {
      throw new Error('usage: refund-admin freeze <creatorId> <amount> --reason "..." [--source dispute|manual]');
    }
    const source = arg('--source') === 'dispute' ? 'dispute' : 'manual';
    const { data, error } = await db.rpc('freeze_creator_funds', {
      p_creator_id: target, p_amount: amount, p_reason: reason, p_source: source,
    });
    if (error) throw new Error(error.message);
    console.log(`froze ₹${amount} for ${target} (log ${data})`);
  } else if (cmd === 'unfreeze') {
    if (!target) throw new Error('usage: refund-admin unfreeze <logId> [--note "..."]');
    const { data, error } = await db.rpc('release_frozen_funds', {
      p_log_id: target, p_note: arg('--note') ?? undefined,
    });
    if (error) throw new Error(error.message);
    console.log(data === true ? `released log ${target}` : `log ${target} not frozen (already released?)`);
  } else {
    throw new Error('usage: refund-admin <view|refund|sync|freeze|unfreeze> ...');
  }
}

main().then(() => process.exit(0)).catch((e) => {
  const msg = e instanceof RefundError ? `${e.code}: ${e.message}` : e.message;
  console.error('refund-admin FAILED:', msg);
  process.exit(1);
});
