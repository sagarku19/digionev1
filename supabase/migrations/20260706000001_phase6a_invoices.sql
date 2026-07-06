-- Phase 6a — invoice engine (2026-07-06)
-- Spec: docs/superpowers/specs/2026-07-06-phase6a-invoices-design.md
-- Idempotent. Apply live via the Supabase MCP, then regenerate types.

-- ── 1. invoice_counters (atomic per-series numbering) ───────────────────────
create table if not exists public.invoice_counters (
  id          uuid primary key default gen_random_uuid(),
  series_key  text not null,
  fy          text not null,
  last_number bigint not null default 0,
  unique (series_key, fy)
);
alter table public.invoice_counters enable row level security;
-- no policies: service-role only.

-- ── 2. invoices (issued-invoice registry) ───────────────────────────────────
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('sale','commission')),
  issuer          text not null check (issuer in ('creator','digione')),
  creator_id      uuid not null references public.profiles(id),
  order_id        uuid references public.orders(id),
  period_month    text,                          -- 'YYYY-MM' for commission
  fy              text not null,
  invoice_number  text not null unique,
  invoice_date    date not null,
  is_tax_invoice  boolean not null,
  subtotal        numeric not null,
  tax_amount      numeric not null default 0,
  total           numeric not null,
  currency        text not null default 'INR',
  storage_file_id uuid references public.storage_files(id),
  metadata        jsonb,
  created_at      timestamptz not null default now()
);
create unique index if not exists uq_invoices_sale_order       on public.invoices (order_id)                where type = 'sale' and order_id is not null;
create unique index if not exists uq_invoices_commission_month on public.invoices (creator_id, period_month) where type = 'commission' and period_month is not null;
create index if not exists idx_invoices_creator on public.invoices (creator_id, type, invoice_date desc);

alter table public.invoices enable row level security;
drop policy if exists invoices_select_own on public.invoices;
create policy invoices_select_own on public.invoices for select to authenticated
  using (creator_id = (select public.current_profile_id()) or (select public.is_super_admin()));
-- writes service-role only; buyer access is via the API route (service-role).

-- ── 3. issue_invoice() — atomic, idempotent number allocation + row insert ──
create or replace function public.issue_invoice(
  p_type text, p_issuer text, p_creator_id uuid, p_order_id uuid, p_period_month text,
  p_fy text, p_is_tax_invoice boolean, p_subtotal numeric, p_tax_amount numeric, p_total numeric,
  p_series_key text, p_prefix text, p_invoice_date date, p_metadata jsonb
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invoices;
  v_seq bigint;
  v_number text;
begin
  -- idempotent: return the existing invoice for this order (sale) / creator-month (commission)
  if p_type = 'sale' then
    select * into v_inv from public.invoices where type = 'sale' and order_id = p_order_id;
  elsif p_type = 'commission' then
    select * into v_inv from public.invoices where type = 'commission' and creator_id = p_creator_id and period_month = p_period_month;
  end if;
  if v_inv.id is not null then return v_inv; end if;

  insert into public.invoice_counters (series_key, fy, last_number)
  values (p_series_key, p_fy, 1)
  on conflict (series_key, fy) do update set last_number = invoice_counters.last_number + 1
  returning last_number into v_seq;

  v_number := p_prefix || '/' || p_fy || '/' || lpad(v_seq::text, 6, '0');

  insert into public.invoices
    (type, issuer, creator_id, order_id, period_month, fy, invoice_number, invoice_date,
     is_tax_invoice, subtotal, tax_amount, total, metadata)
  values
    (p_type, p_issuer, p_creator_id, p_order_id, p_period_month, p_fy, v_number, p_invoice_date,
     p_is_tax_invoice, p_subtotal, p_tax_amount, p_total, p_metadata)
  on conflict do nothing
  returning * into v_inv;

  if v_inv.id is null then
    -- lost a concurrent first-issue race — re-select the winner
    if p_type = 'sale' then
      select * into v_inv from public.invoices where type = 'sale' and order_id = p_order_id;
    else
      select * into v_inv from public.invoices where type = 'commission' and creator_id = p_creator_id and period_month = p_period_month;
    end if;
  end if;

  return v_inv;
end;
$$;
revoke execute on function public.issue_invoice(text, text, uuid, uuid, text, text, boolean, numeric, numeric, numeric, text, text, date, jsonb) from public, anon, authenticated;
