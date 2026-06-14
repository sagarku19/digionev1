-- Add a JSONB metadata column to profiles for extended creator fields
-- (tagline, location, category, website, and social links) edited on
-- /dashboard/settings/profile. Previously the editor wrote to a non-existent
-- column, so those fields never persisted and profile saves failed.
-- Idempotent + additive/nullable; inherits the profiles table's existing RLS.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata jsonb;
