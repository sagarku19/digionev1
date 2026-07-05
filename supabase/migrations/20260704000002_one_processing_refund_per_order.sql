-- Phase 4 follow-up — double-submit dedupe (Task 1 quality review):
-- at most ONE in-flight ('processing') refund per order. Sequential partials still
-- work (wait for the previous to settle). A concurrent second begin_refund insert
-- fails with a unique violation naming this index; src/lib/server/refunds.ts maps
-- it to a friendly 'already processing' error.
create unique index if not exists uq_refunds_one_processing_per_order
  on public.refunds (order_id) where status = 'processing';
