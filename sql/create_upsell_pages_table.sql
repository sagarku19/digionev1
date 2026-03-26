-- Upsell Pages: standalone checkout pages with primary product + 0-2 upsell add-ons.
-- Creator-level (not tied to sites). Public URL: /upsells/{slug}

CREATE TABLE IF NOT EXISTS public.upsell_pages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug                TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  primary_product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  upsell_product_ids  UUID[] DEFAULT '{}',
  config              JSONB DEFAULT '{
    "logo_url": "",
    "buy_now_label": "Buy Now",
    "contact_fields": { "show_email": true, "show_phone": false, "show_name": true },
    "theme": { "primary_color": "#6366F1", "bg_color": "#FFFFFF", "text_color": "#0F172A" },
    "meta_title": "",
    "meta_description": "",
    "show_guarantee_badge": true
  }'::jsonb,
  is_published        BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Fast lookup by creator
CREATE INDEX IF NOT EXISTS idx_upsell_pages_creator ON public.upsell_pages(creator_id);

-- Disable RLS (application-level auth, matching rest of schema)
ALTER TABLE public.upsell_pages DISABLE ROW LEVEL SECURITY;
