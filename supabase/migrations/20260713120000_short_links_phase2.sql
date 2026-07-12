-- Short Links Phase 2: password protection, device/geo targeting,
-- custom OG cards, max-click limits. All additive nullable columns.
alter table public.linksh_links
  add column if not exists password_hash text,
  add column if not exists ios_url text,
  add column if not exists android_url text,
  add column if not exists geo jsonb,
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists og_image text,
  add column if not exists max_clicks bigint;
