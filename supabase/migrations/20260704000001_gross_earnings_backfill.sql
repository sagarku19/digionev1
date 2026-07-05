-- Phase 4 — one-time net→gross conversion of creator_balances.total_earnings (2026-07-04)
-- Spec §2/§4.4: docs/superpowers/specs/2026-07-04-phase4-refunds-risk-design.md
-- Ledger-derived and shape-matched: converts ONLY rows still in the old net shape
-- (earnings == ledger_gross − ledger_fees). Idempotent — a converted row no longer
-- matches, so re-runs are no-ops. Rows matching neither shape are logged for manual
-- review, never guessed (money never silently rewrites itself).
-- Run AFTER the fulfillment gross-credit code change is deployed.

with ledger_sums as (
  select creator_id,
         coalesce(sum(amount), 0) as gross,
         coalesce(sum((meta->>'platform_fee')::numeric), 0) as fees
    from public.transaction_ledger
   where direction = 'credit'
     and tx_type in ('sale','payment_link','referral_commission')
     and creator_id is not null
   group by creator_id
)
update public.creator_balances cb
   set total_earnings = ls.gross
  from ledger_sums ls
 where cb.creator_id = ls.creator_id
   and cb.total_earnings = ls.gross - ls.fees   -- old net shape only
   and cb.total_earnings <> ls.gross;           -- skip when fees are 0 (already correct)

-- Log anything still not in gross shape (neither net nor gross → pre-existing drift).
with ledger_sums as (
  select creator_id,
         coalesce(sum(amount), 0) as gross
    from public.transaction_ledger
   where direction = 'credit'
     and tx_type in ('sale','payment_link','referral_commission')
     and creator_id is not null
   group by creator_id
)
insert into public.balance_reconciliation_log (creator_id, field, cached_value, expected_value, drift)
select cb.creator_id, 'total_earnings', cb.total_earnings,
       coalesce(ls.gross, 0), cb.total_earnings - coalesce(ls.gross, 0)
  from public.creator_balances cb
  left join ledger_sums ls on ls.creator_id = cb.creator_id
 where cb.total_earnings <> coalesce(ls.gross, 0);
