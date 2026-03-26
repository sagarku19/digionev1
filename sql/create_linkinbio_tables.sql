-- ============================================================
-- Link in Bio — Database Migration
-- Tables: site_linkinbio, linkinbio_links, linkinbio_analytics
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)
-- ============================================================

-- ── STEP 1: Allow 'linkinbio' in sites.site_type ─────────────
-- Drop existing tables first if re-running (safe to skip on first run)
DROP TABLE IF EXISTS linkinbio_analytics CASCADE;
DROP TABLE IF EXISTS linkinbio_links CASCADE;
DROP TABLE IF EXISTS site_linkinbio CASCADE;

-- Find and update the CHECK constraint on sites.site_type
DO $$
DECLARE
  constraint_name TEXT;
  constraint_def  TEXT;
BEGIN
  -- Find CHECK constraint on sites table that involves site_type
  SELECT c.conname, pg_get_constraintdef(c.oid)
  INTO constraint_name, constraint_def
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid
  WHERE c.conrelid = 'sites'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%site_type%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    -- Drop the old constraint
    EXECUTE format('ALTER TABLE sites DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;

    -- Re-create with linkinbio added
    EXECUTE format(
      'ALTER TABLE sites ADD CONSTRAINT %I CHECK (site_type IS NULL OR site_type IN (''main'',''single'',''payment'',''blog'',''builder'',''linkinbio''))',
      constraint_name
    );
    RAISE NOTICE 'Re-created constraint with linkinbio: %', constraint_name;
  ELSE
    RAISE NOTICE 'No CHECK constraint found on sites.site_type — skipping';
  END IF;
END $$;

-- If site_type is an ENUM type, add the new value
DO $$
DECLARE
  type_name TEXT;
BEGIN
  SELECT t.typname INTO type_name
  FROM pg_attribute a
  JOIN pg_type t ON t.oid = a.atttypid
  WHERE a.attrelid = 'sites'::regclass
    AND a.attname = 'site_type'
    AND t.typtype = 'e';  -- 'e' = enum

  IF type_name IS NOT NULL THEN
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''linkinbio''', type_name);
    RAISE NOTICE 'Added linkinbio to enum: %', type_name;
  ELSE
    RAISE NOTICE 'site_type is not an enum — skipping';
  END IF;
END $$;


-- ── STEP 2: Create site_linkinbio ────────────────────────────
-- 1:1 with sites (same pattern as site_main, site_blog, site_singlepage)
CREATE TABLE site_linkinbio (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id           UUID NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  bio_text          TEXT,
  avatar_url        TEXT,
  cover_image_url   TEXT,
  layout_style      TEXT NOT NULL DEFAULT 'classic',
  button_style      TEXT NOT NULL DEFAULT 'rounded',
  background_type   TEXT NOT NULL DEFAULT 'solid',
  background_value  TEXT,
  social_links      JSONB DEFAULT '[]'::jsonb,
  show_watermark    BOOLEAN NOT NULL DEFAULT true,
  show_share_button BOOLEAN NOT NULL DEFAULT true,
  meta_description  TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Named FK matching existing pattern: fk_site_<type>_site
  CONSTRAINT fk_site_linkinbio_site
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- ── STEP 3: Create linkinbio_links ───────────────────────────
-- Individual link blocks (many:1 with sites)
CREATE TABLE linkinbio_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id           UUID NOT NULL,
  link_type         TEXT NOT NULL,
  title             TEXT,
  description       TEXT,
  url               TEXT,
  thumbnail_url     TEXT,
  product_id        UUID,
  icon_type         TEXT,
  style_variant     TEXT NOT NULL DEFAULT 'default',
  is_visible        BOOLEAN NOT NULL DEFAULT true,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  click_count       BIGINT NOT NULL DEFAULT 0,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_linkinbio_links_site
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkinbio_links_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ── STEP 4: Create linkinbio_analytics ───────────────────────
CREATE TABLE linkinbio_analytics (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id           UUID,
  site_id           UUID NOT NULL,
  event_type        TEXT NOT NULL,
  referrer_url      TEXT,
  user_agent        TEXT,
  country_code      TEXT,
  ip_hash           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_linkinbio_analytics_site
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkinbio_analytics_link
    FOREIGN KEY (link_id) REFERENCES linkinbio_links(id) ON DELETE SET NULL
);

-- ── STEP 5: Indexes ──────────────────────────────────────────
CREATE INDEX idx_linkinbio_links_site_order
  ON linkinbio_links(site_id, sort_order);

CREATE INDEX idx_linkinbio_analytics_site_created
  ON linkinbio_analytics(site_id, created_at DESC);

CREATE INDEX idx_linkinbio_analytics_link_id
  ON linkinbio_analytics(link_id)
  WHERE link_id IS NOT NULL;

-- ── STEP 6: Updated_at triggers ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_site_linkinbio_updated_at
  BEFORE UPDATE ON site_linkinbio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_linkinbio_links_updated_at
  BEFORE UPDATE ON linkinbio_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── STEP 7: RLS ──────────────────────────────────────────────
-- ALTER TABLE site_linkinbio ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE linkinbio_links ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE linkinbio_analytics ENABLE ROW LEVEL SECURITY;

-- -- Service role bypass (API routes use service client)
-- CREATE POLICY "Service role full access site_linkinbio"
--   ON site_linkinbio FOR ALL USING (auth.role() = 'service_role');

-- CREATE POLICY "Service role full access linkinbio_links"
--   ON linkinbio_links FOR ALL USING (auth.role() = 'service_role');

-- CREATE POLICY "Service role full access linkinbio_analytics"
--   ON linkinbio_analytics FOR ALL USING (auth.role() = 'service_role');

-- -- Public read (active sites only)
-- CREATE POLICY "Public can read active linkinbio"
--   ON site_linkinbio FOR SELECT
--   USING (EXISTS (
--     SELECT 1 FROM sites WHERE sites.id = site_linkinbio.site_id AND sites.is_active = true
--   ));

-- CREATE POLICY "Public can read visible links"
--   ON linkinbio_links FOR SELECT
--   USING (is_visible = true AND EXISTS (
--     SELECT 1 FROM sites WHERE sites.id = linkinbio_links.site_id AND sites.is_active = true
--   ));

-- -- Creator CRUD (via sites → profiles → users → auth)
-- CREATE POLICY "Creators can manage own linkinbio"
--   ON site_linkinbio FOR ALL
--   USING (EXISTS (
--     SELECT 1 FROM sites
--     JOIN profiles ON profiles.id = sites.creator_id
--     JOIN users ON users.id = profiles.user_id
--     WHERE sites.id = site_linkinbio.site_id
--       AND users.auth_provider_id = auth.uid()::text
--   ));

-- CREATE POLICY "Creators can manage own links"
--   ON linkinbio_links FOR ALL
--   USING (EXISTS (
--     SELECT 1 FROM sites
--     JOIN profiles ON profiles.id = sites.creator_id
--     JOIN users ON users.id = profiles.user_id
--     WHERE sites.id = linkinbio_links.site_id
--       AND users.auth_provider_id = auth.uid()::text
--   ));

-- CREATE POLICY "Anyone can insert analytics"
--   ON linkinbio_analytics FOR INSERT WITH CHECK (true);

-- CREATE POLICY "Creators can read own analytics"
--   ON linkinbio_analytics FOR SELECT
--   USING (EXISTS (
--     SELECT 1 FROM sites
--     JOIN profiles ON profiles.id = sites.creator_id
--     JOIN users ON users.id = profiles.user_id
--     WHERE sites.id = linkinbio_analytics.site_id
--       AND users.auth_provider_id = auth.uid()::text
--   ));

-- -- ── Done ─────────────────────────────────────────────────────
-- -- After running this, regenerate types: supabase gen types typescript
