-- ============================================================================
-- DigiOne — Seed data (reference / lookup tables only)
-- ============================================================================
-- Run AFTER the baseline migration. Safe to re-run (ON CONFLICT DO NOTHING).
-- Contains ONLY reference data that must exist on a fresh DB.
-- Does NOT contain user, order, revenue, or KYC data.
--
-- Source: live DB (project qcendfisvyjnwmefruba) as of 2026-06-02.
--   subscription_plans : 3 rows (free / plus / pro tiers + platform fee %)
--   public_images      : 10 rows (stock image picker in the site builder)
--   site_templates     : 0 rows live — none to seed
-- ============================================================================

-- ----------------------------------------------------------------------------
-- subscription_plans  (drives platform fee % per creator tier)
-- ----------------------------------------------------------------------------
insert into public.subscription_plans
  (id, plan_type, plan_name, platform_fee_percent, monthly_price, yearly_price, description, features, is_active, created_at, updated_at)
values
  ('a24ba048-b093-4777-a1c3-9029defb9413', 'free', 'Free Plan', 10.0, 0, 0, 'Perfect for getting started', '["basic_analytics", "up_to_10_products"]', true, '2026-03-19 15:38:21.163051+00', '2026-03-19 15:38:21.163051+00'),
  ('0793b170-8d18-4e2d-8d99-436c14949200', 'plus', 'Plus Plan', 7.0, 500, 5500, 'Great for growing creators', '["advanced_analytics", "up_to_100_products", "email_support", "custom_domain"]', true, '2026-03-19 15:38:21.163051+00', '2026-03-19 15:38:21.163051+00'),
  ('cd355c26-6381-418a-87d6-3fdf964cf4a1', 'pro', 'Pro Plan', 5.0, 1000, 10000, 'Best for professionals', '["full_analytics", "unlimited_products", "priority_support", "custom_domain", "api_access", "advanced_marketing"]', true, '2026-03-19 15:38:21.163051+00', '2026-03-19 15:38:21.163051+00')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- public_images  (stock image library shown in the storefront builder)
-- ----------------------------------------------------------------------------
insert into public.public_images (id, url, name, category, tags, width, height, created_at) values
  ('da68a051-83e9-4f6e-bb08-5c6d4adfd4ae', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c', 'Team Collaboration', 'business', '{team,startup,office}', 1600, 1000, '2026-03-27 22:27:00.850695+00'),
  ('f85044a5-449e-4e9d-a213-462fd2005669', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee', 'Nature Landscape', 'nature', '{mountain,sky,travel}', 1600, 1000, '2026-03-27 22:27:00.850695+00'),
  ('8b3198a2-7600-461f-b926-96c6fd47b2ea', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c', 'Startup Office', 'business', '{startup,people,meeting}', 1600, 1000, '2026-03-27 22:27:00.850695+00'),
  ('ccd1a289-12d6-4998-aac8-7b0f030726d9', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb', 'Forest Path', 'nature', '{forest,green,calm}', 1600, 1000, '2026-03-27 22:27:00.850695+00'),
  ('c59bb03a-13bc-439d-89e0-ef687978aae2', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085', 'Coding Setup', 'tech', '{coding,developer,laptop}', 1600, 1000, '2026-03-27 22:27:00.850695+00'),
  ('76e98ab0-8a06-4d70-9d2f-1c7b2b9a9977', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f', 'Creative Team', 'business', '{teamwork,creative,agency}', 1600, 1000, '2026-03-27 22:27:00.850695+00'),
  ('9a6a200b-9a5a-4b98-bf23-90dcab531e14', 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e', 'Beach Sunset', 'travel', '{beach,sunset,vacation}', 1600, 1000, '2026-03-27 22:27:00.850695+00'),
  ('84e6ff76-6842-4eb5-9437-83eebadd992c', 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4', 'Dark Coding Desk', 'tech', '{dark,code,workspace}', 1600, 1000, '2026-03-27 22:27:00.850695+00'),
  ('cb5aacb9-f307-4438-9eb2-9c9049dada50', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', 'Ocean View', 'travel', '{ocean,blue,relax}', 1600, 1000, '2026-03-27 22:27:00.850695+00'),
  ('10706c48-ecc0-4f5f-b1a6-78840c8174c6', 'https://qcendfisvyjnwmefruba.supabase.co/storage/v1/object/public/public-asset/supaimg-1.jpeg', 'Workspace Setup', 'workspace', '{desk,laptop,minimal}', 1600, 1000, '2026-03-27 22:27:00.850695+00')
on conflict (id) do nothing;
