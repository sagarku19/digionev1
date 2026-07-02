'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export function hasFeature(features: unknown, key: string): boolean {
  return Array.isArray(features) && (features as unknown[]).includes(key);
}

export function useSubscriptionPlans() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, plan_type, plan_name, platform_fee_percent, monthly_price, yearly_price, description, features')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  return { plans: data, isLoading };
}

export function useSubscription() {
  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', 'current'],
    queryFn: async () => {
      const creatorId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, status, billing_cycle, current_price, current_platform_fee_percent, renewal_date, subscription_plan_id, subscription_plans(plan_type, plan_name, features)')
        .eq('creator_id', creatorId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
  return { subscription: data, plan: data?.subscription_plans ?? null, isActive: !!data, isLoading };
}
