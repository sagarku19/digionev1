-- Phase 1 fix — tighten creator_payout_methods RLS to SELECT-own (2026-07-01)
-- Rows are written server-side only (service role, in the approve route); creators just need to READ
-- their own. The prior `*_all_own` (ALL) policy let a creator client-write arbitrary fields —
-- including status='verified' / account_last4 — an unnecessary + misleading write surface. Drop it,
-- keep SELECT-own. (Owner check via current_profile_id(): profiles.id = the creator_id used here.)
drop policy if exists creator_payout_methods_all_own on public.creator_payout_methods;
drop policy if exists creator_payout_methods_select_own on public.creator_payout_methods;
create policy creator_payout_methods_select_own on public.creator_payout_methods
  for select to authenticated using (creator_id = public.current_profile_id());
