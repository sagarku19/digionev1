// Terminal admin for creator subscriptions (interim until billing + the admin app exist). Service-role.
//   npx tsx --env-file=.env.local scripts/subscription-admin.ts view    <creatorId>
//   npx tsx --env-file=.env.local scripts/subscription-admin.ts activate <creatorId> <free|plus|pro> [--cycle monthly|yearly]
//   npx tsx --env-file=.env.local scripts/subscription-admin.ts cancel  <creatorId>
import { createServiceClient } from '../lib/supabase/service';
import { activateSubscription, cancelSubscription, type PlanType, type Cycle } from '../src/lib/server/subscription';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const [cmd, creatorId, planArg] = process.argv.slice(2);
  if (!cmd || !creatorId) throw new Error('usage: subscription-admin <view|activate|cancel> <creatorId> [plan] [--cycle monthly|yearly]');
  const db = createServiceClient();

  if (cmd === 'view') {
    const { data } = await db.from('subscriptions')
      .select('status, billing_cycle, current_price, current_platform_fee_percent, renewal_date, subscription_plans(plan_type, plan_name)')
      .eq('creator_id', creatorId).eq('status', 'active').order('created_at', { ascending: false }).limit(1);
    console.log(data && data[0] ? { ...data[0] } : '(no active subscription — Free 10%)');
  } else if (cmd === 'activate') {
    if (!planArg || !['free', 'plus', 'pro'].includes(planArg)) throw new Error('plan must be free|plus|pro');
    const cycleArg = arg('--cycle');
    const cycle: Cycle = cycleArg === 'yearly' ? 'yearly' : 'monthly';
    const ok = await activateSubscription(db, creatorId, planArg as PlanType, cycle);
    console.log(ok ? `activated ${creatorId} -> ${planArg} (${cycle})` : `plan ${planArg} not found/active`);
  } else if (cmd === 'cancel') {
    const ok = await cancelSubscription(db, creatorId);
    console.log(ok ? `cancelled active sub for ${creatorId} (now Free 10%)` : `no active sub for ${creatorId}`);
  } else {
    throw new Error(`unknown command: ${cmd}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('subscription-admin FAILED:', e.message); process.exit(1); });
