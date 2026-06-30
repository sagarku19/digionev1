-- Phase 1 fix — settle_payout: atomic expected-status guard + processed_at (2026-07-01)
-- Closes the reject double-pay race (final review CRITICAL): reject did a non-atomic
-- check-then-act, and settle_payout claims WHERE status IN ('pending','processing') — so a
-- concurrent approve (pending→processing→transfer) could let reject settle a now-PROCESSING
-- row as 'failed', releasing the hold while money was leaving. The new p_expect_status lets a
-- caller demand the current status atomically; reject passes 'pending' so it can NEVER fail an
-- in-flight payout. Also stamps processed_at on terminal transition (review LOW).
-- Drop the old 5-arg signature first to avoid an overloaded/ambiguous function.
drop function if exists public.settle_payout(uuid, text, text, jsonb, text);

create or replace function public.settle_payout(
  p_payout_id uuid,
  p_terminal text,                       -- 'success' | 'failed'
  p_gateway_payout_id text default null,
  p_gateway_metadata jsonb default null,
  p_failure_reason text default null,
  p_expect_status text default null      -- when set, only transition if current status equals it
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator_id uuid;
  v_amount numeric;
begin
  if p_terminal not in ('success','failed') then
    raise exception 'settle_payout: invalid terminal status %', p_terminal;
  end if;

  update public.creator_payouts
     set status            = p_terminal,
         gateway_payout_id = coalesce(p_gateway_payout_id, gateway_payout_id),
         gateway_metadata  = coalesce(p_gateway_metadata, gateway_metadata),
         failure_reason    = case when p_terminal = 'failed' then p_failure_reason else failure_reason end,
         processed_at      = now()
   where id = p_payout_id
     and status in ('pending','processing')
     and (p_expect_status is null or status = p_expect_status)
   returning creator_id, amount into v_creator_id, v_amount;

  if v_creator_id is null then
    return false;  -- not claimable (already settled, or status != p_expect_status) → no-op
  end if;

  if p_terminal = 'success' then
    update public.creator_balances
       set total_paid_out = total_paid_out + v_amount,
           pending_payout = greatest(pending_payout - v_amount, 0)
     where creator_id = v_creator_id;

    insert into public.transaction_ledger
      (creator_id, payout_id, amount, direction, tx_type, currency, record_hash, meta)
    values
      (v_creator_id, p_payout_id, v_amount, 'debit', 'payout', 'INR',
       convert_to(encode(sha256(convert_to('payout:' || p_payout_id::text, 'UTF8')), 'hex'), 'UTF8'),
       jsonb_build_object('payout_id', p_payout_id, 'gateway_payout_id', p_gateway_payout_id))
    on conflict (record_hash) do nothing;
  else
    update public.creator_balances
       set pending_payout = greatest(pending_payout - v_amount, 0)
     where creator_id = v_creator_id;
  end if;

  return true;
end;
$$;
revoke execute on function public.settle_payout(uuid, text, text, jsonb, text, text) from public, anon, authenticated;
