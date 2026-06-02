-- Two private creator buckets.
-- public: false → blocks anonymous /object/public/... reads. Service role bypasses
--   RLS for /api/upload writes. Reads happen via signed URLs minted by future
--   /api/deliverables/* (creator-content) and dashboard-only routes (creator-private).
-- RLS policies intentionally deferred — service_role works without them.
-- TODO when auth gate lands: add per-creator INSERT/UPDATE/DELETE policies scoped to
--   (storage.foldername(name))[1] = profiles.id; SELECT stays default-deny.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'creator-content',
    'creator-content',
    false,
    524288000,  -- 500 MB per-file ceiling. Per-creator total quota enforced at API layer from subscription_plans.features.
    array[
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/epub+zip',
      'application/octet-stream',
      'video/mp4','video/quicktime','video/webm',
      'audio/mpeg','audio/mp4','audio/wav',
      'image/png','image/jpeg','image/webp',
      'text/plain','text/csv'
    ]
  ),
  (
    'creator-private',
    'creator-private',
    false,
    10485760,  -- 10 MB per-file. KYC docs, contracts — small.
    array['application/pdf','image/png','image/jpeg','image/webp']
  )
on conflict (id) do nothing;
