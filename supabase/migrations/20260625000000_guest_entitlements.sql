-- guest_entitlements: email-keyed purchase records for buyers who checked out
-- WITHOUT an account. On later signup/login the matching rows are claimed into
-- user_product_access (see src/lib/server/entitlements.ts). Email is the join key.
--
-- Writes are service-role only (fulfillment + claim). RLS exposes a buyer their
-- own unclaimed/claimed rows by matching the VERIFIED JWT email claim — never a
-- client-supplied string. Idempotent: safe to re-run.

create table if not exists public.guest_entitlements (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null,
  order_id            uuid not null references public.orders(id) on delete cascade,
  product_id          uuid not null,
  product_name        text not null,
  product_price       numeric not null default 0,
  product_link        text not null default '',
  claimed_by_user_id  uuid,
  claimed_at          timestamptz,
  created_at          timestamptz not null default now(),
  constraint guest_entitlements_email_is_lower check (email = lower(email)),
  constraint guest_entitlements_order_product_key unique (order_id, product_id)
);

create index if not exists idx_guest_entitlements_email on public.guest_entitlements using btree (email);
create index if not exists idx_guest_entitlements_claimed_by on public.guest_entitlements using btree (claimed_by_user_id);

alter table public.guest_entitlements enable row level security;

-- Read own rows only, gated on the verified JWT email claim + an authenticated uid.
drop policy if exists guest_entitlements_select_own on public.guest_entitlements;
create policy guest_entitlements_select_own on public.guest_entitlements
  for select to authenticated
  using (
    auth.uid() is not null
    and lower(email) = lower(auth.jwt() ->> 'email')
  );

-- No insert/update/delete policies: all writes go through the service-role key,
-- which bypasses RLS (fulfillment inserts, claim stamps claimed_by_user_id).
