-- Premium community profile: short bio, avatar display toggle, and a small
-- ordered list of social links ([{ "platform": "...", "url": "..." }], max 4 in UI).
alter table public.communities
  add column if not exists bio text,
  add column if not exists show_avatar boolean not null default true,
  add column if not exists socials jsonb not null default '[]'::jsonb;
