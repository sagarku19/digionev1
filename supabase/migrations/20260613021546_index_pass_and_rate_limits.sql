-- FK indexes that were missing
create index if not exists idx_order_items_product_id      on public.order_items (product_id);
create index if not exists idx_lead_form_site_id           on public.lead_form (site_id);
create index if not exists idx_lead_form_form_id           on public.lead_form (form_id);
create index if not exists idx_payment_submissions_request on public.payment_submissions (payment_request_id);
create index if not exists idx_site_singlepage_product_id  on public.site_singlepage (product_id);
create index if not exists idx_forms_site_id               on public.forms (site_id);
create index if not exists idx_site_design_tokens_creator  on public.site_design_tokens (creator_id);

-- Duplicate indexes (each shadows an identical one)
drop index if exists public.idx_order_items_order;
drop index if exists public.idx_profiles_user_id;
drop index if exists public.idx_sites_type;
drop index if exists public.idx_users_auth_provider;

-- Rate limiting: fixed-window counters, service-role only
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
-- no policies: service-role access only

create or replace function public.check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  -- clear this key's expired windows
  delete from rate_limits
  where key = p_key
    and window_start < now() - make_interval(secs => p_window_seconds * 2);

  insert into rate_limits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
