-- Track the purchase-confirmation ("access link") email outcome on each order.
-- Previously the Resend send result was logged-and-swallowed with no persistence,
-- so a creator (or support) could not tell whether the buyer ever received their
-- access links. These columns record the outcome so the Orders drawer can surface
-- it and a resend action can update it. Idempotent.

alter table public.orders
  add column if not exists confirmation_email_status  text,        -- 'sent' | 'failed' | 'skipped' | null (never attempted)
  add column if not exists confirmation_email_to       text,        -- address the email was actually sent to
  add column if not exists confirmation_email_sent_at  timestamptz, -- when a 'sent' result was recorded
  add column if not exists confirmation_email_error    text;        -- failure/skip reason (null on success)

comment on column public.orders.confirmation_email_status is
  'Outcome of the purchase-confirmation email: sent | failed | skipped | null (never attempted).';
