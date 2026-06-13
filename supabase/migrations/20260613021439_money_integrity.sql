-- Backfill orders.creator_id from metadata (finding #14)
update public.orders
set creator_id = (metadata->>'creator_profile_id')::uuid
where creator_id is null
  and metadata->>'creator_profile_id' is not null;

-- One Cashfree order id maps to at most one order
create unique index if not exists uq_orders_gateway_order_id
  on public.orders (gateway_order_id)
  where gateway_order_id is not null;

-- Deterministic record_hash becomes replay-detecting (fulfillment relies on this)
alter table public.transaction_ledger
  add constraint uq_transaction_ledger_record_hash unique (record_hash);

-- Idempotent access grants (finding #2)
alter table public.user_product_access
  add constraint uq_user_product_access_order_product unique (order_id, product_id);
