-- Phase 5 follow-up — read-only pending-tax preview for the payout guard (2026-07-06).
-- Same netting as begin_payout_tax but WITHOUT reserving (no settling_payout_id write),
-- so the payout route can reject a withdrawal that would be smaller than accrued tax
-- before mutating any state. Service-role only.
create or replace function public.preview_payout_tax(p_creator_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_tds numeric; v_tcs numeric;
begin
  with unsettled as (
    select id, tds_amount, tcs_amount from public.tax_transactions
     where creator_id = p_creator_id and status = 'posted' and not settled
  ),
  revs as (
    select reverses_id, coalesce(sum(tds_amount), 0) as rt, coalesce(sum(tcs_amount), 0) as rc
      from public.tax_transactions
     where status = 'reversed' and reverses_id in (select id from unsettled)
     group by reverses_id
  )
  select coalesce(sum(greatest(u.tds_amount - coalesce(v.rt, 0), 0)), 0),
         coalesce(sum(greatest(u.tcs_amount - coalesce(v.rc, 0), 0)), 0)
    into v_tds, v_tcs
    from unsettled u left join revs v on v.reverses_id = u.id;
  return jsonb_build_object('tds', coalesce(v_tds, 0), 'tcs', coalesce(v_tcs, 0));
end;
$$;
revoke execute on function public.preview_payout_tax(uuid) from public, anon, authenticated;
