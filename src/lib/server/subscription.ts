// Server-only subscription activation. subscriptionRowFromPlan is pure + tested; activate/cancel apply it
// via the service client. One active sub per creator (activation supersedes any prior active row). This is
// the seam a future billing webhook reuses to activate a paid sub after a confirmed charge.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;
export type PlanType = 'free' | 'plus' | 'pro';
export type Cycle = 'monthly' | 'yearly';

export interface PlanRow {
  id: string;
  plan_type: string;
  platform_fee_percent: number | string;
  monthly_price: number | string;
  yearly_price: number | string;
}

export function subscriptionRowFromPlan(creatorId: string, plan: PlanRow, cycle: Cycle, now: Date) {
  const renewal = new Date(now);
  if (cycle === 'yearly') renewal.setFullYear(renewal.getFullYear() + 1);
  else renewal.setMonth(renewal.getMonth() + 1);
  return {
    creator_id: creatorId,
    subscription_plan_id: plan.id,
    status: 'active',
    billing_cycle: cycle,
    current_price: Number(cycle === 'yearly' ? plan.yearly_price : plan.monthly_price),
    current_platform_fee_percent: Number(plan.platform_fee_percent),
    start_date: now.toISOString(),
    renewal_date: renewal.toISOString(),
    auto_renew: false,
  };
}

export async function activateSubscription(db: Db, creatorId: string, planType: PlanType, cycle: Cycle): Promise<boolean> {
  const { data: plan } = await db.from('subscription_plans')
    .select('id, plan_type, platform_fee_percent, monthly_price, yearly_price')
    .eq('plan_type', planType).eq('is_active', true).maybeSingle();
  if (!plan) return false;
  // one active sub per creator — supersede any current active row
  await db.from('subscriptions').update({ status: 'cancelled' }).eq('creator_id', creatorId).eq('status', 'active');
  const { error } = await db.from('subscriptions').insert(subscriptionRowFromPlan(creatorId, plan as PlanRow, cycle, new Date()) as Database['public']['Tables']['subscriptions']['Insert']);
  if (error) throw error;
  return true;
}

export async function cancelSubscription(db: Db, creatorId: string): Promise<boolean> {
  const { data, error } = await db.from('subscriptions')
    .update({ status: 'cancelled' }).eq('creator_id', creatorId).eq('status', 'active').select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
