-- Phase 1 — Payouts wiring (2026-07-01)
-- Spec: docs/superpowers/specs/2026-06-30-phase1-cashfree-payouts-design.md
-- 1. Fix creator_payouts.status default (was 'initiated', invalid under the Phase 0 CHECK
--    status in ('pending','processing','success','failed')).
-- 2. Add creator_payout_methods.account_last4 (non-secret display; the full account number
--    stays encrypted in creator_kyc and is decrypted server-side only at beneficiary creation).
-- Idempotent + non-destructive: safe to re-run.
alter table public.creator_payouts alter column status set default 'pending';
alter table public.creator_payout_methods add column if not exists account_last4 text;
