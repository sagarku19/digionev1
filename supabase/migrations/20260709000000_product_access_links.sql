-- Multiple labelled post-purchase access links per product.
-- Independent of post_purchase_url (single primary link) and product_link
-- (pre-purchase demo link). Shape: [{ "label": text, "url": text }].
alter table public.products
  add column if not exists access_links jsonb not null default '[]'::jsonb;

comment on column public.products.access_links is
  'Post-purchase labelled access links: [{ "label": text, "url": text }]. Independent of post_purchase_url (primary link) and product_link (pre-purchase demo).';
