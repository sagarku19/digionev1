-- Enforce "one in-flight payout per creator" atomically.
--
-- /api/payouts/request guards on a SELECT for existing pending/processing payouts,
-- but that check is a TOCTOU window: two concurrent requests both pass it (before
-- either inserts) and create two pending payouts. The optimistic pending_payout
-- guard still prevents OVER-withdrawal (money stays consistent), but the documented
-- "one payout at a time" risk control was not actually atomic.
--
-- This partial unique index closes the race at the DB — a concurrent second insert
-- raises 23505, which the route maps to 409 (and releases its reservation). Mirrors
-- uq_refunds_one_processing_per_order.
--
-- Idempotent.

create unique index if not exists uq_creator_payouts_one_inflight_per_creator
  on public.creator_payouts (creator_id)
  where status in ('pending', 'processing');
