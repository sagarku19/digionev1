-- Production-readiness fixes (2026-06-14)
-- Source: docs/superpowers/specs/2026-06-13-db-production-fixes-design.md
-- Idempotent: safe to re-run. Applied live via MCP; this file registers the migration.
--   Layer A: missing FK constraints + covering indexes + CHECKs + gateway UNIQUE + payout status fix
--   Layer B: function search_path pinning + drop dead function + RLS initplan rewrite
--   Layer C: is_super_admin() + admin read-only SELECT policies
-- Note: a one-off data fix (repointing a coupon whose creator_id was a users.id to its
--   profiles.id, and deleting orphaned site_navigation/site_sections_config rows) was applied
--   live before adding the FKs; it is environment-specific and intentionally not part of this file.

-- ── Layer A.1: FK constraints ──────────────────────────────────────────────
alter table creator_payouts drop constraint if exists fk_creator_payouts_creator;
alter table creator_payouts add constraint fk_creator_payouts_creator foreign key (creator_id) references profiles(id) on delete set null;
alter table coupons drop constraint if exists fk_coupons_creator;
alter table coupons add constraint fk_coupons_creator foreign key (creator_id) references profiles(id) on delete cascade;
alter table referral_codes drop constraint if exists fk_referral_codes_owner_creator;
alter table referral_codes add constraint fk_referral_codes_owner_creator foreign key (owner_creator_id) references profiles(id) on delete cascade;
alter table referral_codes drop constraint if exists fk_referral_codes_owner_user;
alter table referral_codes add constraint fk_referral_codes_owner_user foreign key (owner_user_id) references users(id) on delete set null;
alter table site_navigation drop constraint if exists fk_site_navigation_site;
alter table site_navigation add constraint fk_site_navigation_site foreign key (site_id) references sites(id) on delete cascade;
alter table site_sections_config drop constraint if exists fk_site_sections_config_site;
alter table site_sections_config add constraint fk_site_sections_config_site foreign key (site_id) references sites(id) on delete cascade;
alter table site_product_assignments drop constraint if exists fk_spa_site;
alter table site_product_assignments add constraint fk_spa_site foreign key (site_id) references sites(id) on delete cascade;
alter table site_product_assignments drop constraint if exists fk_spa_product;
alter table site_product_assignments add constraint fk_spa_product foreign key (product_id) references products(id) on delete cascade;
alter table user_product_access drop constraint if exists fk_upa_order;
alter table user_product_access add constraint fk_upa_order foreign key (order_id) references orders(id) on delete cascade;
alter table user_product_access drop constraint if exists fk_upa_product;
alter table user_product_access add constraint fk_upa_product foreign key (product_id) references products(id) on delete cascade;
alter table user_product_access drop constraint if exists fk_upa_user;
alter table user_product_access add constraint fk_upa_user foreign key (user_id) references users(id) on delete cascade;
alter table order_referrals drop constraint if exists fk_order_referrals_code;
alter table order_referrals add constraint fk_order_referrals_code foreign key (referral_code_id) references referral_codes(id) on delete cascade;

-- ── Layer A.1: covering indexes (plain; tables are tiny) ───────────────────
create index if not exists idx_creator_payouts_creator on creator_payouts(creator_id);
create index if not exists idx_coupons_creator on coupons(creator_id);
create index if not exists idx_referral_codes_owner_creator on referral_codes(owner_creator_id);
create index if not exists idx_site_navigation_site on site_navigation(site_id);
create index if not exists idx_site_sections_config_site on site_sections_config(site_id);
create index if not exists idx_spa_site on site_product_assignments(site_id);
create index if not exists idx_spa_product on site_product_assignments(product_id);
create index if not exists idx_upa_order on user_product_access(order_id);
create index if not exists idx_upa_product on user_product_access(product_id);
create index if not exists idx_upa_user on user_product_access(user_id);
create index if not exists idx_order_referrals_code on order_referrals(referral_code_id);

-- ── Layer A.2: CHECK constraints + gateway UNIQUE + payout status fix ───────
alter table creator_payouts drop constraint if exists creator_payouts_status_check;
alter table creator_payouts add constraint creator_payouts_status_check check (status in ('pending','initiated','processed','failed'));
alter table orders drop constraint if exists chk_orders_total_nonneg;
alter table orders add constraint chk_orders_total_nonneg check (total_amount >= 0);
alter table creator_balances drop constraint if exists chk_creator_balances_nonneg;
alter table creator_balances add constraint chk_creator_balances_nonneg check (total_earnings >= 0 and total_platform_fees >= 0 and total_paid_out >= 0 and pending_payout >= 0);
alter table creator_payouts drop constraint if exists chk_creator_payouts_amount_pos;
alter table creator_payouts add constraint chk_creator_payouts_amount_pos check (amount > 0);
create unique index if not exists uq_orders_gateway_order_id on orders(gateway_order_id) where gateway_order_id is not null;

-- ── Layer B: function search_path + drop dead function ─────────────────────
alter function public.update_updated_at_column() set search_path = pg_catalog, public;
alter function public.update_product_search_vector() set search_path = pg_catalog, public;
alter function public.update_blog_post_search_vector() set search_path = pg_catalog, public;
drop function if exists public.update_projects_updated_at_column() cascade;

-- ── Layer C: admin read-everything via RLS ─────────────────────────────────
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin';
$$;
revoke execute on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['orders','creator_balances','transaction_ledger','creator_payouts','creator_kyc',
                           'profiles','users','products','sites','coupons','order_referrals','referral_codes']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_admin_select', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.is_super_admin()))', t||'_admin_select', t);
  end loop;
end $$;

-- ── Layer B: RLS initplan rewrite — wrap current_profile_id()/auth.uid() in (select …) ──
-- Idempotent: skips policies already wrapped (case-insensitive 'select <fn>()' guard).
do $$
declare r record; nu text; nc text; ddl text; expr text;
begin
  for r in
    select tablename, policyname, cmd, roles, qual, with_check
    from pg_policies p
    where schemaname='public'
    and policyname not like '%_admin_select'
  loop
    expr := lower(coalesce(r.qual,'')||' '||coalesce(r.with_check,''));
    if not (
         (position('current_profile_id()' in expr) > 0 and position('select current_profile_id()' in expr) = 0)
      or (position('auth.uid()' in expr) > 0 and position('select auth.uid()' in expr) = 0)
    ) then
      continue;
    end if;
    nu := r.qual; nc := r.with_check;
    if nu is not null then
      nu := replace(nu, 'current_profile_id()', '(select current_profile_id())');
      nu := replace(nu, 'auth.uid()', '(select auth.uid())');
    end if;
    if nc is not null then
      nc := replace(nc, 'current_profile_id()', '(select current_profile_id())');
      nc := replace(nc, 'auth.uid()', '(select auth.uid())');
    end if;
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
    ddl := format('create policy %I on public.%I for %s to %s',
            r.policyname, r.tablename,
            case r.cmd when 'ALL' then 'all' when 'SELECT' then 'select' when 'INSERT' then 'insert'
                       when 'UPDATE' then 'update' when 'DELETE' then 'delete' end,
            array_to_string(r.roles, ', '));
    if nu is not null then ddl := ddl || format(' using (%s)', nu); end if;
    if nc is not null then ddl := ddl || format(' with check (%s)', nc); end if;
    execute ddl;
  end loop;
end $$;
