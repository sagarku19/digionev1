-- Phase 2 follow-up — creator_kyc.preferred_payout_method (2026-07-01)
-- Lets a creator choose their primary payout destination (bank transfer vs UPI). The payout approve
-- route reads this to pick the Cashfree transfer_mode. Default 'bank'.
alter table public.creator_kyc
  add column if not exists preferred_payout_method text not null default 'bank';
alter table public.creator_kyc drop constraint if exists chk_creator_kyc_preferred_payout;
alter table public.creator_kyc add constraint chk_creator_kyc_preferred_payout
  check (preferred_payout_method in ('bank','upi'));
