-- ============================================================
-- Marketing tables: community posts, reactions, services
-- Run this in your Supabase SQL editor
-- ============================================================

-- Community posts
CREATE TABLE IF NOT EXISTS public.community_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  category    text NOT NULL DEFAULT 'General',   -- Tip | Milestone | Feedback | Event | General
  is_pinned   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Community reactions (likes per user per post)
CREATE TABLE IF NOT EXISTS public.community_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  creator_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction    text NOT NULL DEFAULT 'like',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, creator_id, reaction)
);

-- Services (1:1 calls, retainers, audits)
CREATE TABLE IF NOT EXISTS public.services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  service_type     text NOT NULL DEFAULT '1on1',   -- 1on1 | retainer | audit
  price            numeric(12,2) NOT NULL DEFAULT 0,
  duration_minutes integer,                         -- for 1:1 calls
  is_active        boolean NOT NULL DEFAULT true,
  metadata         jsonb,                           -- e.g. calendly_url, max_clients, deliverables
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Service bookings
CREATE TABLE IF NOT EXISTS public.service_bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id     uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  creator_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name  text,
  customer_email text,
  customer_phone text,
  status         text NOT NULL DEFAULT 'pending',   -- pending | confirmed | completed | cancelled
  booked_at      timestamptz,
  notes          text,
  amount_paid    numeric(12,2) DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.community_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings    ENABLE ROW LEVEL SECURITY;

-- Community posts: everyone can read, creator can write own
CREATE POLICY "community_posts_select" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "community_posts_insert" ON public.community_posts FOR INSERT WITH CHECK (creator_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "community_posts_delete" ON public.community_posts FOR DELETE USING (creator_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

-- Reactions: read all, write own
CREATE POLICY "community_reactions_select" ON public.community_reactions FOR SELECT USING (true);
CREATE POLICY "community_reactions_insert" ON public.community_reactions FOR INSERT WITH CHECK (creator_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "community_reactions_delete" ON public.community_reactions FOR DELETE USING (creator_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

-- Services: creator owns their own
CREATE POLICY "services_select" ON public.services FOR SELECT USING (creator_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "services_insert" ON public.services FOR INSERT WITH CHECK (creator_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "services_update" ON public.services FOR UPDATE USING (creator_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "services_delete" ON public.services FOR DELETE USING (creator_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

-- Bookings: creator owns their own
CREATE POLICY "service_bookings_select" ON public.service_bookings FOR SELECT USING (creator_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "service_bookings_update" ON public.service_bookings FOR UPDATE USING (creator_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
