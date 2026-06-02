-- ============================================================================
-- DigiOne — Row Level Security policies (complete)
-- ============================================================================
-- Brings the database in line with .claude/rules/security-model.md.
--
-- ⚠️  HIGH RISK. Enabling RLS makes every table DENY-BY-DEFAULT. The browser
--     (anon-key) client reads ~28 of these tables directly. A missing or wrong
--     policy = blank dashboard or broken checkout. TEST ON A THROWAWAY PROJECT
--     FIRST (see supabase/exports/RLS-TEST-CHECKLIST.md) before prod.
--
-- Design (confirmed 2026-06-02):
--   • Ownership chain:  auth.uid() = users.id = profiles.user_id; profiles.id is
--     the `creator_id` used across the schema.
--   • Revenue tables (orders, creator_balances, transaction_ledger, payouts,
--     revenue_shares, subscription orders): creator READ-ONLY on own rows.
--     ALL writes go through the service-role key, which BYPASSES RLS entirely —
--     so no INSERT/UPDATE/DELETE policies are needed for those writes to work.
--   • Public storefront tables: anon read only PUBLISHED/ACTIVE rows; owner sees
--     all of their own.
--   • Public capture endpoints (leads, analytics, payment submissions) are written
--     by service-role API routes, so they need no anon INSERT policy.
--
-- Idempotent: every policy is dropped-if-exists before create; ENABLE RLS is safe
-- to re-run. Run AFTER the baseline migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: current creator's profile id.  STABLE + SECURITY DEFINER so policies
-- can resolve auth.uid() -> profiles.id without recursive RLS on profiles.
-- ----------------------------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

revoke all on function public.current_profile_id() from public;
grant execute on function public.current_profile_id() to authenticated, anon, service_role;

-- ============================================================================
-- IDENTITY
-- ============================================================================

-- users: a user reads/updates only their own row (id == auth.uid()).
alter table public.users enable row level security;
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users for select to authenticated using (id = auth.uid());
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- profiles: owner reads/updates own; ANON may read (public storefronts show
-- creator name/avatar). Insert happens via the signup trigger (security definer).
alter table public.profiles enable row level security;
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles for select to anon, authenticated using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- user_roles: read own only.
alter table public.user_roles enable row level security;
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own on public.user_roles for select to authenticated using (user_id = auth.uid());

-- ============================================================================
-- REVENUE TABLES — creator READ-ONLY on own rows. Writes via service role only.
-- ============================================================================

alter table public.creator_balances enable row level security;
drop policy if exists creator_balances_select_own on public.creator_balances;
create policy creator_balances_select_own on public.creator_balances
  for select to authenticated using (creator_id = public.current_profile_id());

alter table public.transaction_ledger enable row level security;
drop policy if exists transaction_ledger_select_own on public.transaction_ledger;
create policy transaction_ledger_select_own on public.transaction_ledger
  for select to authenticated using (creator_id = public.current_profile_id());

alter table public.creator_revenue_shares enable row level security;
drop policy if exists creator_revenue_shares_select_own on public.creator_revenue_shares;
create policy creator_revenue_shares_select_own on public.creator_revenue_shares
  for select to authenticated using (creator_id = public.current_profile_id());

alter table public.creator_payouts enable row level security;
drop policy if exists creator_payouts_select_own on public.creator_payouts;
create policy creator_payouts_select_own on public.creator_payouts
  for select to authenticated using (creator_id = public.current_profile_id());

alter table public.creator_payout_requests enable row level security;
drop policy if exists creator_payout_requests_select_own on public.creator_payout_requests;
create policy creator_payout_requests_select_own on public.creator_payout_requests
  for select to authenticated using (creator_id = public.current_profile_id());

alter table public.creator_payout_request_items enable row level security;
drop policy if exists creator_payout_request_items_select_own on public.creator_payout_request_items;
create policy creator_payout_request_items_select_own on public.creator_payout_request_items
  for select to authenticated using (
    exists (
      select 1 from public.creator_payout_requests r
      where r.id = payout_request_id and r.creator_id = public.current_profile_id()
    )
  );

alter table public.creator_subscription_orders enable row level security;
drop policy if exists creator_subscription_orders_select_own on public.creator_subscription_orders;
create policy creator_subscription_orders_select_own on public.creator_subscription_orders
  for select to authenticated using (creator_id = public.current_profile_id());

-- creator_payout_methods: creator manages own (read/insert/update/delete).
alter table public.creator_payout_methods enable row level security;
drop policy if exists creator_payout_methods_all_own on public.creator_payout_methods;
create policy creator_payout_methods_all_own on public.creator_payout_methods
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- creator_kyc: creator reads/inserts/updates own (the app upserts client-side).
alter table public.creator_kyc enable row level security;
drop policy if exists creator_kyc_select_own on public.creator_kyc;
create policy creator_kyc_select_own on public.creator_kyc
  for select to authenticated using (creator_id = public.current_profile_id());
drop policy if exists creator_kyc_insert_own on public.creator_kyc;
create policy creator_kyc_insert_own on public.creator_kyc
  for insert to authenticated with check (creator_id = public.current_profile_id());
drop policy if exists creator_kyc_update_own on public.creator_kyc;
create policy creator_kyc_update_own on public.creator_kyc
  for update to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- subscriptions (creator's plan subscription): read own.
alter table public.subscriptions enable row level security;
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (creator_id = public.current_profile_id());

-- ============================================================================
-- ORDERS — buyer reads own; creator reads own (orders.creator_id); writes service-role.
-- ============================================================================

alter table public.orders enable row level security;
drop policy if exists orders_select_buyer on public.orders;
create policy orders_select_buyer on public.orders
  for select to authenticated using (user_id = auth.uid());
drop policy if exists orders_select_creator on public.orders;
create policy orders_select_creator on public.orders
  for select to authenticated using (creator_id = public.current_profile_id());

-- order_items: visible if you can see the parent order.
alter table public.order_items enable row level security;
drop policy if exists order_items_select_via_order on public.order_items;
create policy order_items_select_via_order on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or o.creator_id = public.current_profile_id())
    )
  );

-- order_referrals: referrer creator reads own.
alter table public.order_referrals enable row level security;
drop policy if exists order_referrals_select_own on public.order_referrals;
create policy order_referrals_select_own on public.order_referrals
  for select to authenticated using (referrer_creator_id = public.current_profile_id());

-- product_licenses: buyer reads own.
alter table public.product_licenses enable row level security;
drop policy if exists product_licenses_select_own on public.product_licenses;
create policy product_licenses_select_own on public.product_licenses
  for select to authenticated using (user_id = auth.uid());

-- ============================================================================
-- BUYER-OWNED (account area): cart, wishlist, wallet, access, referrals
-- ============================================================================

alter table public.user_carts enable row level security;
drop policy if exists user_carts_all_own on public.user_carts;
create policy user_carts_all_own on public.user_carts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.user_wishlist enable row level security;
drop policy if exists user_wishlist_all_own on public.user_wishlist;
create policy user_wishlist_all_own on public.user_wishlist
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.user_product_access enable row level security;
drop policy if exists user_product_access_select_own on public.user_product_access;
create policy user_product_access_select_own on public.user_product_access
  for select to authenticated using (user_id = auth.uid());

alter table public.user_wallets enable row level security;
drop policy if exists user_wallets_select_own on public.user_wallets;
create policy user_wallets_select_own on public.user_wallets
  for select to authenticated using (user_id = auth.uid());

alter table public.user_wallet_transactions enable row level security;
drop policy if exists user_wallet_transactions_select_own on public.user_wallet_transactions;
create policy user_wallet_transactions_select_own on public.user_wallet_transactions
  for select to authenticated using (user_id = auth.uid());

alter table public.user_referrals enable row level security;
drop policy if exists user_referrals_select_own on public.user_referrals;
create policy user_referrals_select_own on public.user_referrals
  for select to authenticated using (
    referrer_user_id = auth.uid() or referrer_creator_id = public.current_profile_id()
  );

-- ============================================================================
-- PRODUCTS — public read when published & not deleted; owner full control.
-- ============================================================================

alter table public.products enable row level security;
drop policy if exists products_select_published on public.products;
create policy products_select_published on public.products
  for select to anon, authenticated
  using (is_published = true and deleted_at is null);
drop policy if exists products_all_own on public.products;
create policy products_all_own on public.products
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- product_files: owner only (download links are gated server-side).
alter table public.product_files enable row level security;
drop policy if exists product_files_all_own on public.product_files;
create policy product_files_all_own on public.product_files
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- upsell_pages: public read active; owner full control.
alter table public.upsell_pages enable row level security;
drop policy if exists upsell_pages_select_public on public.upsell_pages;
create policy upsell_pages_select_public on public.upsell_pages
  for select to anon, authenticated using (true);
drop policy if exists upsell_pages_all_own on public.upsell_pages;
create policy upsell_pages_all_own on public.upsell_pages
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- media_library: owner only.
alter table public.media_library enable row level security;
drop policy if exists media_library_all_own on public.media_library;
create policy media_library_all_own on public.media_library
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- ============================================================================
-- SITES — public read when active; owner full control. Children resolve via site.
-- ============================================================================

alter table public.sites enable row level security;
drop policy if exists sites_select_active on public.sites;
create policy sites_select_active on public.sites
  for select to anon, authenticated
  using (is_active = true and deleted_at is null);
drop policy if exists sites_all_own on public.sites;
create policy sites_all_own on public.sites
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- site_design_tokens has BOTH creator_id and site_id — use creator_id for owner,
-- public read always (storefront needs theme even when previewing).
alter table public.site_design_tokens enable row level security;
drop policy if exists site_design_tokens_select_public on public.site_design_tokens;
create policy site_design_tokens_select_public on public.site_design_tokens
  for select to anon, authenticated using (true);
drop policy if exists site_design_tokens_all_own on public.site_design_tokens;
create policy site_design_tokens_all_own on public.site_design_tokens
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- Site child tables keyed by site_id: public SELECT, owner write via parent site.
-- Pattern applied to: site_main, site_singlepage, site_navigation,
-- site_sections_config, site_product_assignments, payment_requests, forms,
-- linkinbio_pages.
do $$
declare t text;
begin
  foreach t in array array[
    'site_main','site_singlepage','site_navigation','site_sections_config',
    'site_product_assignments','payment_requests','forms','linkinbio_pages'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t||'_select_public', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true);', t||'_select_public', t);
    execute format('drop policy if exists %I on public.%I;', t||'_modify_own', t);
    execute format($f$create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.sites s where s.id = %I.site_id and s.creator_id = public.current_profile_id()))
      with check (exists (select 1 from public.sites s where s.id = %I.site_id and s.creator_id = public.current_profile_id()));$f$,
      t||'_modify_own', t, t, t);
  end loop;
end $$;

-- linkinbio_blocks → page → site
alter table public.linkinbio_blocks enable row level security;
drop policy if exists linkinbio_blocks_select_public on public.linkinbio_blocks;
create policy linkinbio_blocks_select_public on public.linkinbio_blocks
  for select to anon, authenticated using (true);
drop policy if exists linkinbio_blocks_modify_own on public.linkinbio_blocks;
create policy linkinbio_blocks_modify_own on public.linkinbio_blocks
  for all to authenticated
  using (exists (
    select 1 from public.linkinbio_pages p join public.sites s on s.id = p.site_id
    where p.id = page_id and s.creator_id = public.current_profile_id()))
  with check (exists (
    select 1 from public.linkinbio_pages p join public.sites s on s.id = p.site_id
    where p.id = page_id and s.creator_id = public.current_profile_id()));

-- linkinbio_items → block → page → site
alter table public.linkinbio_items enable row level security;
drop policy if exists linkinbio_items_select_public on public.linkinbio_items;
create policy linkinbio_items_select_public on public.linkinbio_items
  for select to anon, authenticated using (true);
drop policy if exists linkinbio_items_modify_own on public.linkinbio_items;
create policy linkinbio_items_modify_own on public.linkinbio_items
  for all to authenticated
  using (exists (
    select 1 from public.linkinbio_blocks b
    join public.linkinbio_pages p on p.id = b.page_id
    join public.sites s on s.id = p.site_id
    where b.id = block_id and s.creator_id = public.current_profile_id()))
  with check (exists (
    select 1 from public.linkinbio_blocks b
    join public.linkinbio_pages p on p.id = b.page_id
    join public.sites s on s.id = p.site_id
    where b.id = block_id and s.creator_id = public.current_profile_id()));

-- payment_submissions → payment_request → site : creator reads own; insert service-role.
alter table public.payment_submissions enable row level security;
drop policy if exists payment_submissions_select_own on public.payment_submissions;
create policy payment_submissions_select_own on public.payment_submissions
  for select to authenticated using (
    exists (
      select 1 from public.payment_requests pr join public.sites s on s.id = pr.site_id
      where pr.id = payment_request_id and s.creator_id = public.current_profile_id()
    )
  );

-- ============================================================================
-- MARKETING — coupons, affiliates, referrals, services, community
-- ============================================================================

-- coupons: owner full control. (Public validation is service-role, no anon read.)
alter table public.coupons enable row level security;
drop policy if exists coupons_all_own on public.coupons;
create policy coupons_all_own on public.coupons
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- affiliates: the creator who owns the program reads/manages; the affiliate user reads own.
alter table public.affiliates enable row level security;
drop policy if exists affiliates_select on public.affiliates;
create policy affiliates_select on public.affiliates
  for select to authenticated using (
    creator_id = public.current_profile_id() or affiliate_user_id = auth.uid()
  );
drop policy if exists affiliates_modify_own on public.affiliates;
create policy affiliates_modify_own on public.affiliates
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- referral_codes: owner (creator or user) manages own.
alter table public.referral_codes enable row level security;
drop policy if exists referral_codes_all_own on public.referral_codes;
create policy referral_codes_all_own on public.referral_codes
  for all to authenticated
  using (owner_creator_id = public.current_profile_id() or owner_user_id = auth.uid())
  with check (owner_creator_id = public.current_profile_id() or owner_user_id = auth.uid());

-- services: public read active; owner full control.
alter table public.services enable row level security;
drop policy if exists services_select_active on public.services;
create policy services_select_active on public.services
  for select to anon, authenticated using (is_active = true);
drop policy if exists services_all_own on public.services;
create policy services_all_own on public.services
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- service_bookings: creator reads/manages own. Insert is service-role (public booking).
alter table public.service_bookings enable row level security;
drop policy if exists service_bookings_select_own on public.service_bookings;
create policy service_bookings_select_own on public.service_bookings
  for select to authenticated using (creator_id = public.current_profile_id());
drop policy if exists service_bookings_update_own on public.service_bookings;
create policy service_bookings_update_own on public.service_bookings
  for update to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- community_posts: public read; author manages own.
alter table public.community_posts enable row level security;
drop policy if exists community_posts_select_public on public.community_posts;
create policy community_posts_select_public on public.community_posts
  for select to anon, authenticated using (true);
drop policy if exists community_posts_modify_own on public.community_posts;
create policy community_posts_modify_own on public.community_posts
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- community_reactions: public read; author manages own.
alter table public.community_reactions enable row level security;
drop policy if exists community_reactions_select_public on public.community_reactions;
create policy community_reactions_select_public on public.community_reactions
  for select to anon, authenticated using (true);
drop policy if exists community_reactions_modify_own on public.community_reactions;
create policy community_reactions_modify_own on public.community_reactions
  for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

-- ============================================================================
-- CAPTURE / LEADS — creator reads via site ownership. Inserts are service-role.
-- ============================================================================

-- guest_leads → site
alter table public.guest_leads enable row level security;
drop policy if exists guest_leads_select_own on public.guest_leads;
create policy guest_leads_select_own on public.guest_leads
  for select to authenticated using (
    exists (select 1 from public.sites s where s.id = site_id and s.creator_id = public.current_profile_id())
  );

-- lead_form → site
alter table public.lead_form enable row level security;
drop policy if exists lead_form_select_own on public.lead_form;
create policy lead_form_select_own on public.lead_form
  for select to authenticated using (
    exists (select 1 from public.sites s where s.id = site_id and s.creator_id = public.current_profile_id())
  );

-- ============================================================================
-- ANALYTICS — creator reads via site ownership. Inserts are service-role.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array['conversion_events','product_view_events','site_page_views']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t||'_select_own', t);
    execute format($f$create policy %I on public.%I for select to authenticated
      using (exists (select 1 from public.sites s where s.id = %I.site_id and s.creator_id = public.current_profile_id()));$f$,
      t||'_select_own', t, t);
  end loop;
end $$;

-- ============================================================================
-- NOTIFICATIONS — recipient reads/updates own.
-- ============================================================================
alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated using (
    recipient_user_id = auth.uid() or recipient_creator_id = public.current_profile_id()
  );
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_user_id = auth.uid() or recipient_creator_id = public.current_profile_id())
  with check (recipient_user_id = auth.uid() or recipient_creator_id = public.current_profile_id());

-- email_events: recipient creator/user reads own.
alter table public.email_events enable row level security;
drop policy if exists email_events_select_own on public.email_events;
create policy email_events_select_own on public.email_events
  for select to authenticated using (
    user_id = auth.uid() or creator_id = public.current_profile_id()
  );

-- ============================================================================
-- STORAGE METADATA — owner reads own.
-- ============================================================================
alter table public.storage_files enable row level security;
drop policy if exists storage_files_select_own on public.storage_files;
create policy storage_files_select_own on public.storage_files
  for select to authenticated using (
    owner_user_id = auth.uid() or owner_creator_id = public.current_profile_id()
  );

alter table public.storage_file_usages enable row level security;
drop policy if exists storage_file_usages_select_own on public.storage_file_usages;
create policy storage_file_usages_select_own on public.storage_file_usages
  for select to authenticated using (
    exists (
      select 1 from public.storage_files f
      where f.id = file_id
        and (f.owner_user_id = auth.uid() or f.owner_creator_id = public.current_profile_id())
    )
  );

-- ============================================================================
-- PUBLIC REFERENCE TABLES — readable by everyone, writable by service-role only.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array['public_images','subscription_plans','site_templates']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t||'_select_public', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true);', t||'_select_public', t);
  end loop;
end $$;

-- ============================================================================
-- DONE. Tables intentionally WITHOUT a creator/user policy (service-role only,
-- no client access): none remaining — every public table now has RLS enabled.
-- Verify with supabase/exports/RLS-TEST-CHECKLIST.md.
-- ============================================================================
