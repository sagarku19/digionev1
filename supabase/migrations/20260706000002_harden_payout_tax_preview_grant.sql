-- Security hardening (Supabase advisor 0028/0029 follow-up, 2026-07-06).
-- get_payout_tax_preview() is a creator-facing read RPC used only by the authenticated
-- earnings page and is NOT referenced by any RLS policy. Remove the default PUBLIC/anon
-- EXECUTE so only signed-in users can call it; the explicit `authenticated` grant remains.
--
-- NOTE: current_profile_id() is deliberately NOT changed — it is referenced by a
-- public-facing RLS policy (55 policies use it, 1 is TO public), so revoking anon EXECUTE
-- would break anonymous storefront reads for no security benefit (it returns only the
-- caller's own profile id, null for anon).
revoke execute on function public.get_payout_tax_preview() from public, anon;
