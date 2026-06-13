-- Atomic balance credit — kills the read-modify-write race in the webhook (finding #9)
create or replace function public.credit_creator_balance(
  p_creator_id uuid,
  p_earnings_delta numeric,
  p_fees_delta numeric
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.creator_balances (creator_id, total_earnings, total_platform_fees, total_paid_out, pending_payout)
  values (p_creator_id, p_earnings_delta, p_fees_delta, 0, 0)
  on conflict (creator_id) do update set
    total_earnings      = creator_balances.total_earnings      + excluded.total_earnings,
    total_platform_fees = creator_balances.total_platform_fees + excluded.total_platform_fees;
$$;
revoke execute on function public.credit_creator_balance(uuid, numeric, numeric) from public, anon, authenticated;

-- Atomic coupon redemption counter (finding #4)
create or replace function public.increment_coupon_uses(p_coupon_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coupons
  set current_uses = coalesce(current_uses, 0) + 1
  where id = p_coupon_id;
$$;
revoke execute on function public.increment_coupon_uses(uuid) from public, anon, authenticated;
