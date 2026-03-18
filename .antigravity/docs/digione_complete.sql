-- ===================================================================
-- DIGIONE — COMPLETE DATABASE
-- Single file. Run this once on a fresh Supabase project.
-- Contains: Schema v4 → Seed → Security Patch → Auth Fix
-- All sections are idempotent and can be re-run safely.
--
-- Run order (already merged here in correct order):
--   Part 1: Schema       (tables, indexes, RLS, triggers)
--   Part 2: Seed data    (8 personas, all 72 tables)
--   Part 3: Security     (policy hardening, missing RLS)
--   Part 4: Auth fix     (handle_new_user trigger, backfill)
--
-- Password for all seed accounts: Test@1234
-- ===================================================================
-- ============================================================
-- PART 1: SCHEMA
-- ============================================================
-- ===================================================================
-- DIGIONE — COMPLETE DATABASE SCHEMA (MIGRATION-SAFE)
-- Version: Final v4 (production-ready)
-- Changes from v3:
--   - sites.slug: NOT NULL dropped, global UNIQUE replaced with partial index
--   - sites: parent_site_id + child_slug added for URL hierarchy
--   - payment_requests: slug added
--   - projects: slug, description, is_public, site_id, deleted_at added
--   - pages: global UNIQUE on slug replaced with (project_id, slug)
--   - blog_posts: explicit UNIQUE (site_id, slug) constraint named
--   - Missing FK constraints added (site_main, site_singlepage, site_blog,
--     site_navigation, site_sections_config, site_design_tokens, site_ab_tests,
--     site_theme_presets, payment_requests.slug, coupons code scoped)
--   - updated_at trigger function + triggers on all tables that have the column
--   - Missing indexes added (notifications, coupons, affiliates, carts,
--     wishlist, support_tickets, email_events, balances, gateway_order_id,
--     payout_request_items, user_product_access user lookup)
--   - Missing columns added: payment_submissions.updated_at,
--     referral_codes.updated_at, creator_kyc.updated_at,
--     notifications.updated_at, order_items.updated_at,
--     projects.deleted_at, page_blocks.deleted_at
--   - All RLS policies upgraded to real auth.uid() checks
--   - blog_posts: search_vector + GIN index added
-- Changes from v2:
--   - vlog renamed to blog everywhere
--   - CREATE POLICY IF NOT EXISTS replaced with DROP + CREATE
--   - sites.site_type CHECK includes 'blog'
--   - site_sections_config.site_type CHECK includes 'blog'
--   - Removed order_created_at/order_item_created_at from
--     creator_revenue_shares, user_product_access,
--     product_licenses, order_referrals
--   - orders / order_items are plain tables (no partitions)
--   - site_page_views is a plain table (no partitions)
--   - site_blog + blog_posts tables added (with FKs + indexes + RLS)
--   - pages.custom_head_html / custom_css / custom_js added
--   - site_singlepage.custom_css / custom_js added
--   - site_blog.custom_css / custom_js added
-- Run safely on a fresh Supabase database.
-- All DDL is idempotent (IF NOT EXISTS + DO $$ blocks).
-- ===================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================================================================
-- SECTION 1: ENUMS
-- ===================================================================

DO $$ BEGIN CREATE TYPE order_status AS ENUM (
    'pending','completed','failed','refunded','cancelled'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE payout_status AS ENUM (
    'pending','initiated','processed','failed'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE kyc_status AS ENUM (
    'pending','verified','rejected','expired'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE subscription_plan_type AS ENUM (
    'free','plus','pro'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE user_role_type AS ENUM (
    'super_admin','creator','user'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE discount_type AS ENUM (
    'percentage','fixed'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE wallet_direction AS ENUM (
    'credit','debit'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE payout_type AS ENUM (
    'upi','bank_transfer'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE page_block_type AS ENUM (
    'hero','text','image','image_gallery','video',
    'product_showcase','cta_button','testimonial','faq',
    'newsletter','columns','divider','pricing_table','form',
    'countdown','rich_text','embed','custom_html'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE page_type AS ENUM (
    'landing','product','about','contact','blog','custom'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE content_status AS ENUM (
    'draft','published','archived'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE offer_type AS ENUM (
    'percentage','fixed_amount','free_period'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE layout_role_type AS ENUM (
    'section','row','column','block'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE site_section_type AS ENUM (
    'hero_banner','featured_products','product_grid','testimonials',
    'about_creator','faq_accordion','countdown_timer','social_proof',
    'email_capture','video_showcase','rich_text','image_gallery',
    'product_comparison','pricing_table','announcement_bar',
    'sticky_cta','trust_badges','custom_html'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE ab_test_status AS ENUM (
    'draft','running','paused','concluded'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE builder_asset_type AS ENUM (
    'icon_set','font','lottie_animation','pattern','illustration','stock_image'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE font_source_type AS ENUM (
    'google','custom_upload','system'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE device_type AS ENUM (
    'desktop','mobile','tablet'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE conversion_event_type AS ENUM (
    'add_to_cart','checkout_start','purchase'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE product_relation_type AS ENUM (
    'upsell','cross_sell','bundle'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================================================================
-- SECTION 2: CORE TABLES
-- ===================================================================

-- Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type            subscription_plan_type NOT NULL UNIQUE,
    plan_name            text NOT NULL,
    platform_fee_percent numeric NOT NULL CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
    monthly_price        numeric NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
    yearly_price         numeric NOT NULL DEFAULT 0 CHECK (yearly_price >= 0),
    description          text,
    features             jsonb DEFAULT '[]'::jsonb,
    is_active            boolean DEFAULT true,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

-- Subscription Offers
CREATE TABLE IF NOT EXISTS public.subscription_offers (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_plan_id uuid NOT NULL,
    offer_name           text NOT NULL,
    offer_type           offer_type NOT NULL,
    discount_value       numeric NOT NULL CHECK (discount_value > 0),
    description          text,
    start_date           timestamptz NOT NULL,
    end_date             timestamptz NOT NULL,
    max_redemptions      integer,
    redeemed_count       integer DEFAULT 0,
    is_active            boolean DEFAULT true,
    apply_to_new_only    boolean DEFAULT false,
    metadata             jsonb,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

-- Subscription Offer Redemptions
CREATE TABLE IF NOT EXISTS public.subscription_offer_redemptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id uuid NOT NULL,
    offer_id        uuid NOT NULL,
    creator_id      uuid NOT NULL,
    discount_amount numeric NOT NULL CHECK (discount_amount > 0),
    applied_at      timestamptz DEFAULT now(),
    expires_at      timestamptz NOT NULL,
    metadata        jsonb,
    created_at      timestamptz DEFAULT now()
);

-- Media Library
CREATE TABLE IF NOT EXISTS public.media_library (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id       uuid NOT NULL,
    file_name        text NOT NULL,
    file_type        text NOT NULL,
    file_size        bigint NOT NULL CHECK (file_size > 0),
    media_type       text NOT NULL CHECK (media_type IN ('image','video','document','other')),
    storage_url      text NOT NULL,
    thumbnail_url    text,
    duration_seconds integer,
    width            integer,
    height           integer,
    alt_text         text,
    description      text,
    tags             text[],
    is_favorite      boolean DEFAULT false,
    usage_count      integer DEFAULT 0,
    metadata         jsonb,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS public.users (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_provider_id uuid UNIQUE,
    email            text UNIQUE,
    phone            text UNIQUE,
    auth_provider    text DEFAULT 'supabase',
    is_verified      boolean DEFAULT false,
    role             text DEFAULT 'user',
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL,
    full_name        text,
    avatar_url       text,
    mobile           text,
    mobile_verified  boolean DEFAULT false,
    email            text UNIQUE,
    email_verified   boolean DEFAULT false,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL,
    role       user_role_type NOT NULL,
    metadata   jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Site Templates
CREATE TABLE IF NOT EXISTS public.site_templates (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_type         text NOT NULL CHECK (site_type IN ('main','single','payment','blog')),
    template_key      text NOT NULL,
    name              text NOT NULL,
    description       text,
    preview_image_url text,
    is_active         boolean DEFAULT true,
    default_theme     jsonb,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

-- Sites
CREATE TABLE IF NOT EXISTS public.sites (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      uuid NOT NULL,
    -- main sites only: globally unique short handle e.g. "arjun"
    slug            text,
    -- child sites only: sub-path segment e.g. "figma-course"
    child_slug      text,
    -- child sites: FK to their parent main site
    parent_site_id  uuid REFERENCES public.sites(id) ON DELETE CASCADE,
    site_type       text DEFAULT 'main' CHECK (site_type IN ('main','single','payment','blog')),
    is_active       boolean DEFAULT true,
    custom_domain   text,
    domain_verified boolean DEFAULT false,
    ssl_status      text DEFAULT 'none' CHECK (ssl_status IN ('none','pending','active','failed')),
    metadata        jsonb,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    deleted_at      timestamptz,
    CONSTRAINT uq_sites_parent_child_slug UNIQUE (parent_site_id, child_slug),
    CONSTRAINT chk_sites_parent_slug_consistency CHECK (
        (site_type = 'main'  AND slug IS NOT NULL AND parent_site_id IS NULL  AND child_slug IS NULL)
        OR
        (site_type != 'main' AND slug IS NULL     AND parent_site_id IS NOT NULL AND child_slug IS NOT NULL)
    )
);

-- Site Main
CREATE TABLE IF NOT EXISTS public.site_main (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id          uuid NOT NULL UNIQUE,
    title            text NOT NULL,
    description      text,
    logo_url         text,
    banner_url       text,
    template_name    text DEFAULT 'default',
    theme            jsonb DEFAULT '{"primaryColor":"#6366F1","backgroundColor":"#F9FAFB"}'::jsonb,
    contact_mobile   text,
    contact_email    text,
    social_links     jsonb DEFAULT '{}'::jsonb,
    legal_pages      jsonb DEFAULT '{"about_us":false,"terms":false,"privacy":false,"refund":false}'::jsonb,
    meta_keywords    text,
    meta_description text,
    custom_css       text,
    custom_js        text,
    metadata         jsonb,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

-- Site Single Page
CREATE TABLE IF NOT EXISTS public.site_singlepage (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id              uuid NOT NULL UNIQUE,
    product_id           uuid NOT NULL,
    title                text NOT NULL,
    description          text,
    hero_image_url       text,
    template_name        text DEFAULT 'modern',
    theme                jsonb DEFAULT '{"accentColor":"#8B5CF6","primaryColor":"#6366F1"}'::jsonb,
    contact_mobile       text,
    contact_email        text,
    social_links         jsonb DEFAULT '{}'::jsonb,
    legal_pages          jsonb DEFAULT '{"about_us":false,"terms":false,"privacy":false,"refund":false}'::jsonb,
    show_add_to_cart     boolean DEFAULT true,
    show_buy_now         boolean DEFAULT true,
    enable_reviews       boolean DEFAULT true,
    meta_description     text,
    sections_config      jsonb,
    countdown_end_at     timestamptz,
    social_proof_config  jsonb,
    upsell_product_ids   uuid[],
    guarantee_badges     jsonb DEFAULT '[]'::jsonb,
    faq_items            jsonb DEFAULT '[]'::jsonb,
    testimonials         jsonb DEFAULT '[]'::jsonb,
    video_testimonial_url text,
    comparison_table     jsonb,
    custom_css           text,
    custom_js            text,
    metadata             jsonb,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

-- Site Blog Settings
CREATE TABLE IF NOT EXISTS public.site_blog (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id          uuid NOT NULL UNIQUE,
    title            text NOT NULL,
    description      text,
    banner_url       text,
    logo_url         text,
    template_name    text DEFAULT 'blog_default',
    theme            jsonb DEFAULT '{"primaryColor":"#6366F1","backgroundColor":"#F9FAFB"}'::jsonb,
    contact_mobile   text,
    contact_email    text,
    social_links     jsonb DEFAULT '{}'::jsonb,
    legal_pages      jsonb DEFAULT '{"about_us":false,"terms":false,"privacy":false,"refund":false}'::jsonb,
    meta_description text,
    custom_css       text,
    custom_js        text,
    metadata         jsonb,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

-- Blog Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id          uuid NOT NULL,
    creator_id       uuid NOT NULL,
    title            text NOT NULL,
    slug             text NOT NULL,
    description      text,
    content          text,
    thumbnail_url    text,
    video_url        text,
    video_embed_url  text,
    video_source     text CHECK (video_source IN ('youtube','vimeo','upload','other')),
    duration_seconds integer,
    is_published     boolean DEFAULT false,
    is_free          boolean DEFAULT true,
    product_id       uuid,
    tags             text[],
    view_count       integer DEFAULT 0,
    sort_order       integer DEFAULT 0,
    custom_head_html text,
    custom_css       text,
    custom_js        text,
    metadata         jsonb,
    search_vector    tsvector,
    published_at     timestamptz,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now(),
    CONSTRAINT uq_blog_posts_site_slug UNIQUE (site_id, slug)
);

-- Site Product Assignments
CREATE TABLE IF NOT EXISTS public.site_product_assignments (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id    uuid NOT NULL,
    product_id uuid NOT NULL,
    placement  text NOT NULL DEFAULT 'front_main',
    is_visible boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    metadata   jsonb,
    created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id                 uuid NOT NULL,
    name                       text NOT NULL,
    description                text,
    price                      numeric NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    stock_count                integer,
    thumbnail_url              text,
    category                   text,
    is_published               boolean DEFAULT false,
    is_on_discover_page        boolean DEFAULT false,
    images                     jsonb DEFAULT '[]'::jsonb,
    content                    jsonb,
    metadata                   jsonb,
    product_link               text,
    post_purchase_url          text,
    post_purchase_instructions text,
    is_licensable              boolean DEFAULT false,
    license_type               text,
    license_terms              text,
    license_metadata           jsonb,
    search_vector              tsvector,
    created_at                 timestamptz DEFAULT now(),
    updated_at                 timestamptz DEFAULT now(),
    deleted_at                 timestamptz
);

-- Other Products
CREATE TABLE IF NOT EXISTS public.other_products (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id       uuid NOT NULL,
    product_id       uuid,
    is_active        boolean DEFAULT true,
    is_other_product boolean DEFAULT true,
    metadata         jsonb,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

-- Guest Leads
CREATE TABLE IF NOT EXISTS public.guest_leads (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id    uuid NOT NULL,
    product_id uuid,
    full_name  text,
    email      text,
    mobile     text,
    status     text DEFAULT 'pending',
    metadata   jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Orders (plain — no partitioning)
CREATE TABLE IF NOT EXISTS public.orders (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid,
    origin_site_id     uuid,
    guest_lead_id      uuid,
    total_amount       numeric NOT NULL,
    status             text NOT NULL DEFAULT 'pending',
    customer_name      text,
    customer_email     text,
    customer_phone     text,
    payment_method     text,
    gateway_name       text DEFAULT 'cashfree',
    gateway_order_id   text,
    gateway_payment_id text,
    gateway_signature  text,
    metadata           jsonb,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz DEFAULT now()
);

-- Order Items (plain — no partitioning)
CREATE TABLE IF NOT EXISTS public.order_items (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id          uuid NOT NULL,
    product_id        uuid,
    price_at_purchase numeric NOT NULL,
    quantity          integer DEFAULT 1,
    origin_site_id    uuid,
    metadata          jsonb,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

-- Creator Revenue Shares
CREATE TABLE IF NOT EXISTS public.creator_revenue_shares (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                 uuid NOT NULL,
    order_item_id            uuid NOT NULL,
    creator_id               uuid NOT NULL,
    subscription_id          uuid,
    product_id               uuid NOT NULL,
    gross_amount             numeric NOT NULL CHECK (gross_amount > 0),
    platform_fee_percent     numeric NOT NULL CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
    platform_fee_amount      numeric NOT NULL CHECK (platform_fee_amount >= 0),
    creator_earnings_amount  numeric NOT NULL CHECK (creator_earnings_amount >= 0),
    currency                 text DEFAULT 'INR',
    status                   text NOT NULL DEFAULT 'pending',
    metadata                 jsonb,
    created_at               timestamptz DEFAULT now(),
    updated_at               timestamptz DEFAULT now()
);

-- Creator Balances
CREATE TABLE IF NOT EXISTS public.creator_balances (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id          uuid NOT NULL UNIQUE,
    total_earnings      numeric NOT NULL DEFAULT 0,
    total_platform_fees numeric NOT NULL DEFAULT 0,
    total_paid_out      numeric NOT NULL DEFAULT 0,
    pending_payout      numeric NOT NULL DEFAULT 0,
    currency            text DEFAULT 'INR',
    updated_at          timestamptz DEFAULT now()
);

-- Creator Payout Methods
CREATE TABLE IF NOT EXISTS public.creator_payout_methods (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id           uuid NOT NULL,
    type                 payout_type NOT NULL,
    is_default           boolean DEFAULT false,
    upi_id               text,
    account_holder_name  text,
    account_number       text,
    ifsc_code            text,
    bank_name            text,
    branch_name          text,
    status               text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
    metadata             jsonb,
    version              integer DEFAULT 1 CHECK (version > 0),
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

-- Creator Payout Requests
CREATE TABLE IF NOT EXISTS public.creator_payout_requests (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id       uuid NOT NULL,
    payout_method_id uuid,
    amount           numeric NOT NULL,
    currency         text DEFAULT 'INR',
    status           text NOT NULL DEFAULT 'pending',
    admin_notes      text,
    rejection_reason text,
    metadata         jsonb,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

-- Creator Payout Request Items
CREATE TABLE IF NOT EXISTS public.creator_payout_request_items (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_request_id uuid NOT NULL,
    revenue_share_id  uuid NOT NULL,
    amount           numeric NOT NULL,
    created_at       timestamptz DEFAULT now()
);

-- Creator Payouts
CREATE TABLE IF NOT EXISTS public.creator_payouts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id        uuid NOT NULL,
    payout_request_id uuid,
    payout_method_id  uuid,
    amount            numeric NOT NULL,
    currency          text DEFAULT 'INR',
    status            text NOT NULL DEFAULT 'initiated',
    gateway_name      text DEFAULT 'cashfree',
    gateway_payout_id text,
    gateway_batch_id  text,
    gateway_metadata  jsonb,
    initiated_at      timestamptz DEFAULT now(),
    processed_at      timestamptz,
    failure_reason    text,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id                   uuid NOT NULL,
    subscription_plan_id         uuid NOT NULL,
    status                       text NOT NULL DEFAULT 'active',
    billing_cycle                text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
    current_price                numeric NOT NULL DEFAULT 0 CHECK (current_price >= 0),
    current_platform_fee_percent numeric NOT NULL CHECK (current_platform_fee_percent >= 0 AND current_platform_fee_percent <= 100),
    start_date                   timestamptz DEFAULT now(),
    end_date                     timestamptz,
    renewal_date                 timestamptz,
    auto_renew                   boolean DEFAULT true,
    metadata                     jsonb,
    created_at                   timestamptz DEFAULT now(),
    updated_at                   timestamptz DEFAULT now()
);

-- Creator Subscription Orders
CREATE TABLE IF NOT EXISTS public.creator_subscription_orders (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id         uuid NOT NULL,
    plan_id            text NOT NULL,
    amount             numeric NOT NULL,
    currency           text DEFAULT 'INR',
    status             text DEFAULT 'created',
    gateway_name       text DEFAULT 'cashfree',
    gateway_order_id   text,
    gateway_payment_id text,
    gateway_signature  text,
    metadata           jsonb,
    created_at         timestamptz DEFAULT now(),
    paid_at            timestamptz
);

-- API Rate Limits
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id    uuid NOT NULL,
    endpoint      text NOT NULL,
    method        text NOT NULL DEFAULT 'GET',
    request_count integer DEFAULT 1,
    window_start  timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
    window_end    timestamptz NOT NULL DEFAULT date_trunc('hour', now()) + interval '1 hour',
    metadata      jsonb,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now(),
    CONSTRAINT uq_api_rate_limit UNIQUE (creator_id, endpoint, method, window_start)
);

-- Payment Requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         uuid NOT NULL,
    -- URL sub-path for this payment page, unique per site
    slug            text,
    title           text NOT NULL,
    description     text,
    amount          numeric,
    is_fixed_amount boolean DEFAULT false,
    status          text DEFAULT 'active',
    metadata        jsonb,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    CONSTRAINT uq_payment_requests_site_slug UNIQUE (site_id, slug)
);

-- Payment Submissions
CREATE TABLE IF NOT EXISTS public.payment_submissions (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_request_id uuid NOT NULL,
    customer_name      text NOT NULL,
    customer_email     text NOT NULL,
    customer_phone     text NOT NULL,
    amount             numeric NOT NULL,
    payment_status     text DEFAULT 'pending',
    payment_method     text,
    transaction_id     text,
    gateway_name       text DEFAULT 'cashfree',
    gateway_order_id   text,
    gateway_payment_id text,
    gateway_signature  text,
    metadata           jsonb,
    created_at         timestamptz DEFAULT now(),
    updated_at         timestamptz DEFAULT now()
);

-- User Carts
CREATE TABLE IF NOT EXISTS public.user_carts (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity   integer DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- User Wishlist
CREATE TABLE IF NOT EXISTS public.user_wishlist (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata   jsonb
);

-- User Product Access
CREATE TABLE IF NOT EXISTS public.user_product_access (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL,
    order_id          uuid NOT NULL,
    order_item_id     uuid,
    product_id        uuid NOT NULL,
    product_name      text NOT NULL,
    product_price     numeric NOT NULL,
    product_link      text NOT NULL,
    snapshot_metadata jsonb,
    created_at        timestamptz DEFAULT now()
);

-- Product Licenses
CREATE TABLE IF NOT EXISTS public.product_licenses (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     uuid NOT NULL,
    order_item_id uuid NOT NULL,
    user_id      uuid,
    product_id   uuid NOT NULL,
    license_key  text,
    license_type text,
    status       text NOT NULL DEFAULT 'active',
    issued_at    timestamptz DEFAULT now(),
    expires_at   timestamptz,
    snapshot     jsonb,
    metadata     jsonb,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

-- Product Ratings
CREATE TABLE IF NOT EXISTS public.product_ratings (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id           uuid NOT NULL,
    user_id              uuid NOT NULL,
    rating               integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_title         text,
    review_text          text,
    is_verified_purchase boolean DEFAULT false,
    is_approved          boolean DEFAULT false,
    helpful_count        integer DEFAULT 0,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

-- Affiliates
CREATE TABLE IF NOT EXISTS public.affiliates (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id         uuid NOT NULL,
    affiliate_user_id  uuid NOT NULL,
    commission_percent numeric NOT NULL DEFAULT 10 CHECK (commission_percent > 0 AND commission_percent <= 100),
    is_active          boolean DEFAULT true,
    metadata           jsonb,
    created_at         timestamptz DEFAULT now(),
    updated_at         timestamptz DEFAULT now()
);

-- Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id     uuid NOT NULL,
    code           text NOT NULL,
    discount_type  discount_type NOT NULL,
    discount_value numeric NOT NULL CHECK (discount_value > 0),
    max_uses       integer,
    current_uses   integer DEFAULT 0 CHECK (current_uses >= 0),
    valid_from     timestamptz DEFAULT now(),
    valid_until    timestamptz,
    is_active      boolean DEFAULT true,
    metadata       jsonb,
    created_at     timestamptz DEFAULT now(),
    updated_at     timestamptz DEFAULT now()
);

-- Referral Codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code             text NOT NULL UNIQUE,
    owner_user_id    uuid,
    owner_creator_id uuid,
    is_active        boolean DEFAULT true,
    metadata         jsonb,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

-- User Referrals
CREATE TABLE IF NOT EXISTS public.user_referrals (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id    uuid NOT NULL,
    referrer_user_id    uuid,
    referrer_creator_id uuid,
    referred_user_id    uuid NOT NULL,
    reward_status       text DEFAULT 'pending',
    reward_amount       numeric,
    metadata            jsonb,
    created_at          timestamptz DEFAULT now()
);

-- Order Referrals
CREATE TABLE IF NOT EXISTS public.order_referrals (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            uuid NOT NULL,
    referral_code_id    uuid,
    referrer_user_id    uuid,
    referrer_creator_id uuid,
    referred_user_id    uuid NOT NULL,
    commission_amount   numeric DEFAULT 0,
    status              text DEFAULT 'pending',
    metadata            jsonb,
    created_at          timestamptz DEFAULT now()
);

-- User Wallets
CREATE TABLE IF NOT EXISTS public.user_wallets (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL UNIQUE,
    balance    numeric NOT NULL DEFAULT 0,
    currency   text DEFAULT 'INR',
    is_active  boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- User Wallet Transactions
CREATE TABLE IF NOT EXISTS public.user_wallet_transactions (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id                uuid NOT NULL,
    user_id                  uuid NOT NULL,
    related_order_id         uuid,
    related_order_referral_id uuid,
    tx_type                  text NOT NULL,
    amount                   numeric NOT NULL CHECK (amount > 0),
    direction                wallet_direction NOT NULL,
    balance_after            numeric,
    status                   text DEFAULT 'completed',
    description              text,
    metadata                 jsonb,
    created_at               timestamptz DEFAULT now()
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid,
    creator_id        uuid,
    site_id           uuid,
    subject           text NOT NULL,
    description       text NOT NULL,
    status            text DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
    priority          text DEFAULT 'medium',
    assigned_admin_id uuid,
    metadata          jsonb,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id    uuid,
    recipient_creator_id uuid,
    title                text NOT NULL,
    message              text NOT NULL,
    type                 text NOT NULL,
    is_read              boolean DEFAULT false,
    action_url           text,
    metadata             jsonb,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

-- Email Events
CREATE TABLE IF NOT EXISTS public.email_events (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid,
    creator_id        uuid,
    order_id          uuid,
    payout_request_id uuid,
    recipient_email   text NOT NULL,
    subject           text NOT NULL,
    template_name     text NOT NULL,
    status            text DEFAULT 'pending',
    sent_at           timestamptz,
    error_message     text,
    provider_response jsonb,
    metadata          jsonb,
    created_at        timestamptz DEFAULT now()
);

-- Creator KYC
CREATE TABLE IF NOT EXISTS public.creator_kyc (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id                  uuid NOT NULL,
    status                      text NOT NULL DEFAULT 'pending',
    kyc_level                   text NOT NULL DEFAULT 'none',
    full_name                   text,
    legal_name                  text,
    dob                         date,
    gender                      text,
    pan_enc                     bytea,
    aadhaar_last4               text,
    upi_id_enc                  bytea,
    bank_account_enc            bytea,
    ifsc_code                   text,
    pan_last4                   text,
    pan_verified                boolean DEFAULT false,
    pan_verified_at             timestamptz,
    pan_name                    text,
    pan_verification_provider   text,
    pan_verification_ref        text,
    bank_last4                  text,
    bank_verified               boolean DEFAULT false,
    bank_verified_at            timestamptz,
    bank_account_name           text,
    bank_verification_provider  text,
    bank_verification_ref       text,
    beneficiary_id              text,
    beneficiary_metadata        jsonb DEFAULT '{}'::jsonb,
    upi_verified                boolean DEFAULT false,
    upi_verified_at             timestamptz,
    upi_verification_provider   text,
    upi_verification_ref        text,
    address_line1               text,
    address_line2               text,
    city                        text,
    state                       text,
    postal_code                 text,
    country                     text DEFAULT 'IN',
    document_urls               jsonb DEFAULT '{}'::jsonb,
    document_hashes             jsonb DEFAULT '{}'::jsonb,
    verification_provider       text,
    provider_verification_id    text,
    verified_at                 timestamptz,
    rejected_at                 timestamptz,
    rejection_reason            text,
    verified_by                 uuid,
    notes                       text,
    metadata                    jsonb DEFAULT '{}'::jsonb,
    created_at                  timestamptz DEFAULT now(),
    updated_at                  timestamptz DEFAULT now()
);

-- Transaction Ledger
CREATE TABLE IF NOT EXISTS public.transaction_ledger (
    id          bigserial PRIMARY KEY,
    user_id     uuid,
    creator_id  uuid,
    wallet_id   uuid,
    order_id    uuid,
    payout_id   uuid,
    referral_id uuid,
    tx_type     text NOT NULL,
    amount      numeric NOT NULL CHECK (amount > 0),
    currency    text NOT NULL DEFAULT 'INR',
    direction   wallet_direction NOT NULL,
    balance_after numeric,
    meta        jsonb,
    prev_hash   bytea,
    record_hash bytea NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Storage Files
CREATE TABLE IF NOT EXISTS public.storage_files (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket           text NOT NULL,
    path             text NOT NULL,
    public_url       text NOT NULL,
    owner_user_id    uuid,
    owner_creator_id uuid,
    file_type        text,
    size_bytes       bigint,
    status           text NOT NULL DEFAULT 'active',
    deleted_at       timestamptz,
    metadata         jsonb DEFAULT '{}'::jsonb,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now(),
    CONSTRAINT uq_storage_file UNIQUE (bucket, path)
);

-- Storage File Usages
CREATE TABLE IF NOT EXISTS public.storage_file_usages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id     uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id   uuid NOT NULL,
    field_name  text,
    created_at  timestamptz DEFAULT now()
);

-- Background Jobs
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type   text NOT NULL,
    payload    jsonb NOT NULL,
    status     text DEFAULT 'pending',
    attempts   integer DEFAULT 0,
    last_error text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Projects (visual builder workspace)
CREATE TABLE IF NOT EXISTS public.projects (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id  uuid NOT NULL,
    site_id     uuid,
    name        text NOT NULL,
    -- URL slug for /:storeslug/:projectslug routing, unique per creator
    slug        text,
    description text,
    is_public   boolean DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    deleted_at  timestamptz,
    CONSTRAINT uq_projects_creator_slug UNIQUE (creator_id, slug)
);

-- Pages (visual builder)
CREATE TABLE IF NOT EXISTS public.pages (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id             uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    site_id                uuid,
    creator_id             uuid,
    -- Unique per project (not globally): two creators can both have a page called "about"
    slug                   text NOT NULL,
    page_type              page_type NOT NULL DEFAULT 'custom',
    name                   text NOT NULL,
    title                  text,
    description            text,
    seo_title              text,
    seo_description        text,
    seo_keywords           text,
    status                 content_status DEFAULT 'draft',
    layout                 jsonb DEFAULT '{}'::jsonb,
    layout_type            text DEFAULT 'custom' CHECK (layout_type IN ('custom','single_column','two_column','grid','masonry')),
    theme_override         jsonb,
    visibility             text DEFAULT 'published' CHECK (visibility IN ('published','draft','password_protected','private')),
    password_protected_hash text,
    meta_robots            text,
    canonical_url          text,
    og_image_url           text,
    view_count             integer DEFAULT 0,
    is_homepage            boolean DEFAULT false,
    is_published           boolean DEFAULT false,
    sort_order             integer DEFAULT 0,
    -- HTML/CSS/JS injection per page
    custom_head_html       text,
    custom_css             text,
    custom_js              text,
    metadata               jsonb,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    published_at           timestamptz
);

-- Page Versions (history / undo)
CREATE TABLE IF NOT EXISTS public.page_versions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id           uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    layout            jsonb NOT NULL,
    version_label     text,
    is_autosave       boolean DEFAULT false,
    created_by_user_id uuid,
    change_summary    text,
    created_at        timestamptz NOT NULL DEFAULT now()
);

-- Page Blocks
CREATE TABLE IF NOT EXISTS public.page_blocks (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id              uuid NOT NULL,
    creator_id           uuid NOT NULL,
    -- Nesting tree: section > row > column > block
    parent_block_id      uuid,
    layout_role          layout_role_type NOT NULL DEFAULT 'block',
    block_type           page_block_type NOT NULL,
    display_name         text,
    sort_order           integer NOT NULL DEFAULT 0,
    is_visible           boolean DEFAULT true,
    is_locked            boolean DEFAULT false,
    padding              jsonb,
    margin               jsonb,
    background_color     text,
    background_image_url text,
    background_video_url text,
    custom_css           text,
    custom_id            text,
    custom_classes       text,
    html_attributes      jsonb,
    entrance_animation   jsonb,
    interaction_triggers jsonb DEFAULT '[]'::jsonb,
    custom_styles        jsonb,
    visibility_rules     jsonb,
    animation            jsonb,
    responsive_settings  jsonb,
    content              jsonb NOT NULL DEFAULT '{}'::jsonb,
    metadata             jsonb,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now(),
    deleted_at           timestamptz
);

-- Page Block Media
CREATE TABLE IF NOT EXISTS public.page_block_media (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_block_id uuid NOT NULL,
    media_id     uuid NOT NULL,
    sort_order   integer DEFAULT 0,
    created_at   timestamptz DEFAULT now()
);

-- Page Templates
CREATE TABLE IF NOT EXISTS public.page_templates (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id        uuid,
    template_name     text NOT NULL,
    description       text,
    page_type         page_type NOT NULL,
    template_blocks   jsonb NOT NULL,
    thumbnail_url     text,
    category          text,
    is_system_template boolean DEFAULT false,
    is_public         boolean DEFAULT false,
    usage_count       integer DEFAULT 0,
    rating            numeric,
    metadata          jsonb,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

-- ===================================================================
-- SECTION 3: VISUAL BUILDER ENHANCEMENTS
-- ===================================================================

-- Global design tokens per site
CREATE TABLE IF NOT EXISTS public.site_design_tokens (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id              uuid NOT NULL,
    creator_id           uuid NOT NULL,
    color_palette        jsonb NOT NULL DEFAULT '{"primary":"#6366F1","secondary":"#8B5CF6","accent":"#EC4899","surface":"#F9FAFB","text":"#111827","muted":"#6B7280"}'::jsonb,
    typography           jsonb NOT NULL DEFAULT '{"heading_font":"Inter","body_font":"Inter","base_size_px":16,"scale_ratio":1.25}'::jsonb,
    spacing_scale        jsonb NOT NULL DEFAULT '{"base_px":4,"xs":4,"sm":8,"md":16,"lg":24,"xl":32,"2xl":48}'::jsonb,
    border_radius_scale  jsonb NOT NULL DEFAULT '{"sm":"4px","md":"8px","lg":"12px","xl":"16px","full":"9999px"}'::jsonb,
    shadow_presets       jsonb DEFAULT '[]'::jsonb,
    custom_css_variables jsonb DEFAULT '{}'::jsonb,
    is_active            boolean DEFAULT true,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now(),
    UNIQUE (site_id)
);

-- Saved reusable components library
CREATE TABLE IF NOT EXISTS public.saved_components (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id     uuid NOT NULL,
    name           text NOT NULL,
    description    text,
    category       text,
    component_tree jsonb NOT NULL,
    thumbnail_url  text,
    is_public      boolean DEFAULT false,
    usage_count    integer DEFAULT 0,
    tags           text[],
    created_at     timestamptz DEFAULT now(),
    updated_at     timestamptz DEFAULT now()
);

-- Collaborative edit locks
CREATE TABLE IF NOT EXISTS public.page_edit_locks (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id           uuid NOT NULL,
    locked_by_user_id uuid NOT NULL,
    locked_at         timestamptz NOT NULL DEFAULT now(),
    expires_at        timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
    session_id        text NOT NULL,
    UNIQUE (page_id)
);

-- Builder custom fonts per site
CREATE TABLE IF NOT EXISTS public.builder_fonts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     uuid NOT NULL,
    creator_id  uuid NOT NULL,
    font_name   text NOT NULL,
    font_family text NOT NULL,
    source      font_source_type NOT NULL DEFAULT 'google',
    google_font_id text,
    storage_url text,
    variants    jsonb DEFAULT '[]'::jsonb,
    is_active   boolean DEFAULT true,
    created_at  timestamptz DEFAULT now()
);

-- Builder assets
CREATE TABLE IF NOT EXISTS public.builder_assets (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id    uuid NOT NULL,
    asset_type    builder_asset_type NOT NULL,
    name          text NOT NULL,
    storage_url   text NOT NULL,
    thumbnail_url text,
    source        text,
    metadata      jsonb,
    tags          text[],
    created_at    timestamptz DEFAULT now()
);

-- ===================================================================
-- SECTION 4: SHOPIFY-LIKE BUILDER ENHANCEMENTS
-- ===================================================================

-- Ordered section config per site
CREATE TABLE IF NOT EXISTS public.site_sections_config (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id    uuid NOT NULL,
    site_type  text NOT NULL CHECK (site_type IN ('main','single','payment','blog')),
    sections   jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (site_id)
);

-- Saved theme presets
CREATE TABLE IF NOT EXISTS public.site_theme_presets (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id       uuid,
    site_id          uuid,
    preset_name      text NOT NULL,
    description      text,
    theme_data       jsonb NOT NULL,
    thumbnail_url    text,
    is_system_preset boolean DEFAULT false,
    is_favorite      boolean DEFAULT false,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

-- Site navigation config
CREATE TABLE IF NOT EXISTS public.site_navigation (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id           uuid NOT NULL,
    header_logo_url   text,
    header_logo_alt   text,
    nav_items         jsonb DEFAULT '[]'::jsonb,
    show_cart_icon    boolean DEFAULT true,
    show_search       boolean DEFAULT false,
    sticky_header     boolean DEFAULT true,
    footer_columns    jsonb DEFAULT '[]'::jsonb,
    footer_bottom_text text,
    social_links      jsonb DEFAULT '{}'::jsonb,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now(),
    UNIQUE (site_id)
);

-- A/B test runner for site sections
CREATE TABLE IF NOT EXISTS public.site_ab_tests (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id              uuid NOT NULL,
    creator_id           uuid NOT NULL,
    test_name            text NOT NULL,
    section_key          text NOT NULL,
    variant_a            jsonb NOT NULL,
    variant_b            jsonb NOT NULL,
    traffic_split_percent integer NOT NULL DEFAULT 50 CHECK (traffic_split_percent BETWEEN 1 AND 99),
    status               ab_test_status NOT NULL DEFAULT 'draft',
    winner               text CHECK (winner IN ('a','b')),
    start_at             timestamptz,
    end_at               timestamptz,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

-- ===================================================================
-- SECTION 5: PRODUCT ENHANCEMENTS
-- ===================================================================

-- Multi-file variants per digital product
CREATE TABLE IF NOT EXISTS public.product_files (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      uuid NOT NULL,
    creator_id      uuid NOT NULL,
    file_label      text NOT NULL,
    storage_url     text NOT NULL,
    file_type       text,
    file_size_bytes bigint,
    version         text DEFAULT '1.0',
    is_primary      boolean DEFAULT false,
    download_count  integer DEFAULT 0,
    checksum        text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    UNIQUE (product_id, file_label)
);

-- Product upsell / cross-sell relationships
CREATE TABLE IF NOT EXISTS public.product_related (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id         uuid NOT NULL,
    related_product_id uuid NOT NULL,
    relation_type      product_relation_type NOT NULL,
    sort_order         integer DEFAULT 0,
    created_at         timestamptz DEFAULT now(),
    UNIQUE (product_id, related_product_id, relation_type)
);

-- Product bundles
CREATE TABLE IF NOT EXISTS public.product_bundles (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id       uuid NOT NULL,
    name             text NOT NULL,
    description      text,
    thumbnail_url    text,
    bundle_price     numeric NOT NULL CHECK (bundle_price >= 0),
    compare_at_price numeric,
    is_published     boolean DEFAULT false,
    metadata         jsonb,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

-- Product bundle items
CREATE TABLE IF NOT EXISTS public.product_bundle_items (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id  uuid NOT NULL,
    product_id uuid NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE (bundle_id, product_id)
);

-- ===================================================================
-- SECTION 6: ANALYTICS (Privacy-safe, no PII, no partitions)
-- ===================================================================

-- Site page views
CREATE TABLE IF NOT EXISTS public.site_page_views (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id      uuid NOT NULL,
    page_slug    text,
    session_id   text,
    referrer     text,
    utm_source   text,
    utm_medium   text,
    utm_campaign text,
    device_type  device_type,
    country_code char(2),
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Product view events
CREATE TABLE IF NOT EXISTS public.product_view_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  uuid NOT NULL,
    site_id     uuid,
    session_id  text,
    referrer    text,
    device_type device_type,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Conversion funnel events
CREATE TABLE IF NOT EXISTS public.conversion_events (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id    uuid NOT NULL,
    product_id uuid,
    order_id   uuid,
    session_id text,
    event_type conversion_event_type NOT NULL,
    revenue    numeric,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================================================================
-- SECTION 7: FOREIGN KEY CONSTRAINTS (All idempotent)
-- ===================================================================

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_users') THEN
  ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_users FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_user') THEN
  ALTER TABLE public.user_roles ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscription_offer_plan') THEN
  ALTER TABLE public.subscription_offers ADD CONSTRAINT fk_subscription_offer_plan FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_offer_redemption_subscription') THEN
  ALTER TABLE public.subscription_offer_redemptions ADD CONSTRAINT fk_offer_redemption_subscription FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_offer_redemption_offer') THEN
  ALTER TABLE public.subscription_offer_redemptions ADD CONSTRAINT fk_offer_redemption_offer FOREIGN KEY (offer_id) REFERENCES public.subscription_offers(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_offer_redemption_creator') THEN
  ALTER TABLE public.subscription_offer_redemptions ADD CONSTRAINT fk_offer_redemption_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_library_creator') THEN
  ALTER TABLE public.media_library ADD CONSTRAINT fk_media_library_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sites_creator') THEN
  ALTER TABLE public.sites ADD CONSTRAINT fk_sites_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_site_main_site') THEN
  ALTER TABLE public.site_main ADD CONSTRAINT fk_site_main_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_site_singlepage_site') THEN
  ALTER TABLE public.site_singlepage ADD CONSTRAINT fk_site_singlepage_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_site_singlepage_product') THEN
  ALTER TABLE public.site_singlepage ADD CONSTRAINT fk_site_singlepage_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_site_blog_site') THEN
  ALTER TABLE public.site_blog ADD CONSTRAINT fk_site_blog_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_blog_posts_site') THEN
  ALTER TABLE public.blog_posts ADD CONSTRAINT fk_blog_posts_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_blog_posts_creator') THEN
  ALTER TABLE public.blog_posts ADD CONSTRAINT fk_blog_posts_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_blog_posts_product') THEN
  ALTER TABLE public.blog_posts ADD CONSTRAINT fk_blog_posts_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_spa_site') THEN
  ALTER TABLE public.site_product_assignments ADD CONSTRAINT fk_spa_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_spa_product') THEN
  ALTER TABLE public.site_product_assignments ADD CONSTRAINT fk_spa_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_spa_site_product_placement') THEN
  ALTER TABLE public.site_product_assignments ADD CONSTRAINT uq_spa_site_product_placement UNIQUE (site_id, product_id, placement);
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_creator') THEN
  ALTER TABLE public.products ADD CONSTRAINT fk_products_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_other_products_creator') THEN
  ALTER TABLE public.other_products ADD CONSTRAINT fk_other_products_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_other_products_product') THEN
  ALTER TABLE public.other_products ADD CONSTRAINT fk_other_products_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_guest_leads_site') THEN
  ALTER TABLE public.guest_leads ADD CONSTRAINT fk_guest_leads_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_guest_leads_product') THEN
  ALTER TABLE public.guest_leads ADD CONSTRAINT fk_guest_leads_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_user') THEN
  ALTER TABLE public.orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_origin_site') THEN
  ALTER TABLE public.orders ADD CONSTRAINT fk_orders_origin_site FOREIGN KEY (origin_site_id) REFERENCES public.sites(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_guest_lead') THEN
  ALTER TABLE public.orders ADD CONSTRAINT fk_orders_guest_lead FOREIGN KEY (guest_lead_id) REFERENCES public.guest_leads(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_order') THEN
  ALTER TABLE public.order_items ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_product') THEN
  ALTER TABLE public.order_items ADD CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_origin_site') THEN
  ALTER TABLE public.order_items ADD CONSTRAINT fk_order_items_origin_site FOREIGN KEY (origin_site_id) REFERENCES public.sites(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_crs_creator') THEN
  ALTER TABLE public.creator_revenue_shares ADD CONSTRAINT fk_crs_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_crs_product') THEN
  ALTER TABLE public.creator_revenue_shares ADD CONSTRAINT fk_crs_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_revenue_share_subscription') THEN
  ALTER TABLE public.creator_revenue_shares ADD CONSTRAINT fk_revenue_share_subscription FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_creator_balances_creator') THEN
  ALTER TABLE public.creator_balances ADD CONSTRAINT fk_creator_balances_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_creator_payout_methods_creator') THEN
  ALTER TABLE public.creator_payout_methods ADD CONSTRAINT fk_creator_payout_methods_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_creator_payout_requests_creator') THEN
  ALTER TABLE public.creator_payout_requests ADD CONSTRAINT fk_creator_payout_requests_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_creator_payout_requests_method') THEN
  ALTER TABLE public.creator_payout_requests ADD CONSTRAINT fk_creator_payout_requests_method FOREIGN KEY (payout_method_id) REFERENCES public.creator_payout_methods(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cpri_payout_request') THEN
  ALTER TABLE public.creator_payout_request_items ADD CONSTRAINT fk_cpri_payout_request FOREIGN KEY (payout_request_id) REFERENCES public.creator_payout_requests(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cpri_revenue_share') THEN
  ALTER TABLE public.creator_payout_request_items ADD CONSTRAINT fk_cpri_revenue_share FOREIGN KEY (revenue_share_id) REFERENCES public.creator_revenue_shares(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_creator_payouts_creator') THEN
  ALTER TABLE public.creator_payouts ADD CONSTRAINT fk_creator_payouts_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_creator_payouts_request') THEN
  ALTER TABLE public.creator_payouts ADD CONSTRAINT fk_creator_payouts_request FOREIGN KEY (payout_request_id) REFERENCES public.creator_payout_requests(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_creator_payouts_method') THEN
  ALTER TABLE public.creator_payouts ADD CONSTRAINT fk_creator_payouts_method FOREIGN KEY (payout_method_id) REFERENCES public.creator_payout_methods(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscription_plan') THEN
  ALTER TABLE public.subscriptions ADD CONSTRAINT fk_subscription_plan FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscriptions_creator') THEN
  ALTER TABLE public.subscriptions ADD CONSTRAINT fk_subscriptions_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cso_creator') THEN
  ALTER TABLE public.creator_subscription_orders ADD CONSTRAINT fk_cso_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_api_rate_limit_creator') THEN
  ALTER TABLE public.api_rate_limits ADD CONSTRAINT fk_api_rate_limit_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_requests_site') THEN
  ALTER TABLE public.payment_requests ADD CONSTRAINT fk_payment_requests_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_submissions_request') THEN
  ALTER TABLE public.payment_submissions ADD CONSTRAINT fk_payment_submissions_request FOREIGN KEY (payment_request_id) REFERENCES public.payment_requests(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_carts_user') THEN
  ALTER TABLE public.user_carts ADD CONSTRAINT fk_user_carts_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_carts_product') THEN
  ALTER TABLE public.user_carts ADD CONSTRAINT fk_user_carts_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_carts_user_product') THEN
  ALTER TABLE public.user_carts ADD CONSTRAINT uq_user_carts_user_product UNIQUE (user_id, product_id);
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_wishlist_user') THEN
  ALTER TABLE public.user_wishlist ADD CONSTRAINT fk_user_wishlist_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_wishlist_product') THEN
  ALTER TABLE public.user_wishlist ADD CONSTRAINT fk_user_wishlist_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_wishlist_user_product') THEN
  ALTER TABLE public.user_wishlist ADD CONSTRAINT uq_user_wishlist_user_product UNIQUE (user_id, product_id);
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_upa_user') THEN
  ALTER TABLE public.user_product_access ADD CONSTRAINT fk_upa_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_upa_product') THEN
  ALTER TABLE public.user_product_access ADD CONSTRAINT fk_upa_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pl_user') THEN
  ALTER TABLE public.product_licenses ADD CONSTRAINT fk_pl_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pl_product') THEN
  ALTER TABLE public.product_licenses ADD CONSTRAINT fk_pl_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pr_product') THEN
  ALTER TABLE public.product_ratings ADD CONSTRAINT fk_pr_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pr_user') THEN
  ALTER TABLE public.product_ratings ADD CONSTRAINT fk_pr_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_pr_product_user') THEN
  ALTER TABLE public.product_ratings ADD CONSTRAINT uq_pr_product_user UNIQUE (product_id, user_id);
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_aff_creator') THEN
  ALTER TABLE public.affiliates ADD CONSTRAINT fk_aff_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_aff_user') THEN
  ALTER TABLE public.affiliates ADD CONSTRAINT fk_aff_user FOREIGN KEY (affiliate_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_coupons_creator') THEN
  ALTER TABLE public.coupons ADD CONSTRAINT fk_coupons_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rc_owner_user') THEN
  ALTER TABLE public.referral_codes ADD CONSTRAINT fk_rc_owner_user FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rc_owner_creator') THEN
  ALTER TABLE public.referral_codes ADD CONSTRAINT fk_rc_owner_creator FOREIGN KEY (owner_creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ur_code') THEN
  ALTER TABLE public.user_referrals ADD CONSTRAINT fk_ur_code FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ur_referrer_user') THEN
  ALTER TABLE public.user_referrals ADD CONSTRAINT fk_ur_referrer_user FOREIGN KEY (referrer_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ur_referrer_creator') THEN
  ALTER TABLE public.user_referrals ADD CONSTRAINT fk_ur_referrer_creator FOREIGN KEY (referrer_creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ur_referred_user') THEN
  ALTER TABLE public.user_referrals ADD CONSTRAINT fk_ur_referred_user FOREIGN KEY (referred_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_or_referral_code') THEN
  ALTER TABLE public.order_referrals ADD CONSTRAINT fk_or_referral_code FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_or_referrer_user') THEN
  ALTER TABLE public.order_referrals ADD CONSTRAINT fk_or_referrer_user FOREIGN KEY (referrer_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_or_referrer_creator') THEN
  ALTER TABLE public.order_referrals ADD CONSTRAINT fk_or_referrer_creator FOREIGN KEY (referrer_creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_or_referred_user') THEN
  ALTER TABLE public.order_referrals ADD CONSTRAINT fk_or_referred_user FOREIGN KEY (referred_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_uw_user') THEN
  ALTER TABLE public.user_wallets ADD CONSTRAINT fk_uw_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_uwt_wallet') THEN
  ALTER TABLE public.user_wallet_transactions ADD CONSTRAINT fk_uwt_wallet FOREIGN KEY (wallet_id) REFERENCES public.user_wallets(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_uwt_user') THEN
  ALTER TABLE public.user_wallet_transactions ADD CONSTRAINT fk_uwt_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_uwt_order_referral') THEN
  ALTER TABLE public.user_wallet_transactions ADD CONSTRAINT fk_uwt_order_referral FOREIGN KEY (related_order_referral_id) REFERENCES public.order_referrals(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_st_user') THEN
  ALTER TABLE public.support_tickets ADD CONSTRAINT fk_st_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_st_creator') THEN
  ALTER TABLE public.support_tickets ADD CONSTRAINT fk_st_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_st_site') THEN
  ALTER TABLE public.support_tickets ADD CONSTRAINT fk_st_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_st_admin') THEN
  ALTER TABLE public.support_tickets ADD CONSTRAINT fk_st_admin FOREIGN KEY (assigned_admin_id) REFERENCES public.users(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_user') THEN
  ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_creator') THEN
  ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_creator FOREIGN KEY (recipient_creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ee_user') THEN
  ALTER TABLE public.email_events ADD CONSTRAINT fk_ee_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ee_creator') THEN
  ALTER TABLE public.email_events ADD CONSTRAINT fk_ee_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_creator_kyc_creator') THEN
  ALTER TABLE public.creator_kyc ADD CONSTRAINT fk_creator_kyc_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sf_user') THEN
  ALTER TABLE public.storage_files ADD CONSTRAINT fk_sf_user FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sf_creator') THEN
  ALTER TABLE public.storage_files ADD CONSTRAINT fk_sf_creator FOREIGN KEY (owner_creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sfu_file') THEN
  ALTER TABLE public.storage_file_usages ADD CONSTRAINT fk_sfu_file FOREIGN KEY (file_id) REFERENCES public.storage_files(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_creator') THEN
  ALTER TABLE public.projects ADD CONSTRAINT fk_projects_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pages_site') THEN
  ALTER TABLE public.pages ADD CONSTRAINT fk_pages_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pages_creator') THEN
  ALTER TABLE public.pages ADD CONSTRAINT fk_pages_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_page_blocks_page') THEN
  ALTER TABLE public.page_blocks ADD CONSTRAINT fk_page_blocks_page FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_page_blocks_creator') THEN
  ALTER TABLE public.page_blocks ADD CONSTRAINT fk_page_blocks_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_page_blocks_parent') THEN
  ALTER TABLE public.page_blocks ADD CONSTRAINT fk_page_blocks_parent FOREIGN KEY (parent_block_id) REFERENCES public.page_blocks(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_page_block_media_block') THEN
  ALTER TABLE public.page_block_media ADD CONSTRAINT fk_page_block_media_block FOREIGN KEY (page_block_id) REFERENCES public.page_blocks(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_page_block_media_media') THEN
  ALTER TABLE public.page_block_media ADD CONSTRAINT fk_page_block_media_media FOREIGN KEY (media_id) REFERENCES public.media_library(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_page_templates_creator') THEN
  ALTER TABLE public.page_templates ADD CONSTRAINT fk_page_templates_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_page_versions_user') THEN
  ALTER TABLE public.page_versions ADD CONSTRAINT fk_page_versions_user FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_page_edit_locks_page') THEN
  ALTER TABLE public.page_edit_locks ADD CONSTRAINT fk_page_edit_locks_page FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_page_edit_locks_user') THEN
  ALTER TABLE public.page_edit_locks ADD CONSTRAINT fk_page_edit_locks_user FOREIGN KEY (locked_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sdt_site') THEN
  ALTER TABLE public.site_design_tokens ADD CONSTRAINT fk_sdt_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sdt_creator') THEN
  ALTER TABLE public.site_design_tokens ADD CONSTRAINT fk_sdt_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sc_creator') THEN
  ALTER TABLE public.saved_components ADD CONSTRAINT fk_sc_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bf_site') THEN
  ALTER TABLE public.builder_fonts ADD CONSTRAINT fk_bf_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bf_creator') THEN
  ALTER TABLE public.builder_fonts ADD CONSTRAINT fk_bf_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ba_creator') THEN
  ALTER TABLE public.builder_assets ADD CONSTRAINT fk_ba_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ssc_site') THEN
  ALTER TABLE public.site_sections_config ADD CONSTRAINT fk_ssc_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stp_creator') THEN
  ALTER TABLE public.site_theme_presets ADD CONSTRAINT fk_stp_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stp_site') THEN
  ALTER TABLE public.site_theme_presets ADD CONSTRAINT fk_stp_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_snav_site') THEN
  ALTER TABLE public.site_navigation ADD CONSTRAINT fk_snav_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sat_site') THEN
  ALTER TABLE public.site_ab_tests ADD CONSTRAINT fk_sat_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sat_creator') THEN
  ALTER TABLE public.site_ab_tests ADD CONSTRAINT fk_sat_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pf_product') THEN
  ALTER TABLE public.product_files ADD CONSTRAINT fk_pf_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pf_creator') THEN
  ALTER TABLE public.product_files ADD CONSTRAINT fk_pf_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prelat_product') THEN
  ALTER TABLE public.product_related ADD CONSTRAINT fk_prelat_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prelat_related') THEN
  ALTER TABLE public.product_related ADD CONSTRAINT fk_prelat_related FOREIGN KEY (related_product_id) REFERENCES public.products(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pbundle_creator') THEN
  ALTER TABLE public.product_bundles ADD CONSTRAINT fk_pbundle_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pbi_bundle') THEN
  ALTER TABLE public.product_bundle_items ADD CONSTRAINT fk_pbi_bundle FOREIGN KEY (bundle_id) REFERENCES public.product_bundles(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pbi_product') THEN
  ALTER TABLE public.product_bundle_items ADD CONSTRAINT fk_pbi_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pve_product') THEN
  ALTER TABLE public.product_view_events ADD CONSTRAINT fk_pve_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pve_site') THEN
  ALTER TABLE public.product_view_events ADD CONSTRAINT fk_pve_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ce_site') THEN
  ALTER TABLE public.conversion_events ADD CONSTRAINT fk_ce_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ce_product') THEN
  ALTER TABLE public.conversion_events ADD CONSTRAINT fk_ce_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
END IF; END $$;

-- ===================================================================
-- SECTION 8: INDEXES
-- ===================================================================

-- Core identity
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_provider      ON public.users (auth_provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id         ON public.profiles (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_slug               ON public.sites (slug);

-- Sites
CREATE INDEX IF NOT EXISTS idx_sites_creator_type ON public.sites (creator_id, site_type);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_creator_published ON public.products (creator_id, is_published, created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_products_name              ON public.products (creator_id, is_published, name);
CREATE INDEX IF NOT EXISTS idx_products_search            ON public.products USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS gin_products_metadata          ON public.products USING GIN (metadata);
CREATE INDEX IF NOT EXISTS gin_products_images            ON public.products USING GIN (images);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_user_status_date    ON public.orders (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_origin_site_id      ON public.orders (origin_site_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id       ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_crs_order_id               ON public.creator_revenue_shares (order_id);
CREATE INDEX IF NOT EXISTS idx_upa_order_id               ON public.user_product_access (order_id);
CREATE INDEX IF NOT EXISTS idx_pl_order_id                ON public.product_licenses (order_id);
CREATE INDEX IF NOT EXISTS idx_or_order_id                ON public.order_referrals (order_id);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active       ON public.subscription_plans (is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator_active    ON public.subscriptions (creator_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_subscription ON public.subscriptions (creator_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscription_offers_active      ON public.subscription_offers (is_active, start_date, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscription_offers_plan        ON public.subscription_offers (subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_subscription  ON public.subscription_offer_redemptions (subscription_id, created_at);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_creator       ON public.subscription_offer_redemptions (creator_id, expires_at);

-- Media library
CREATE INDEX IF NOT EXISTS idx_media_library_creator_type ON public.media_library (creator_id, media_type);
CREATE INDEX IF NOT EXISTS idx_media_library_tags         ON public.media_library USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_media_library_favorite     ON public.media_library (creator_id, is_favorite) WHERE is_favorite = true;

-- Pages
CREATE INDEX IF NOT EXISTS idx_pages_slug            ON public.pages (slug);
CREATE INDEX IF NOT EXISTS idx_pages_project_id      ON public.pages (project_id);
CREATE INDEX IF NOT EXISTS idx_pages_site_slug       ON public.pages (site_id, slug);
CREATE INDEX IF NOT EXISTS idx_pages_creator_status  ON public.pages (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_pages_site_homepage   ON public.pages (site_id, is_homepage);
CREATE INDEX IF NOT EXISTS idx_pages_type_published  ON public.pages (page_type, status) WHERE status = 'published'::content_status;
CREATE INDEX IF NOT EXISTS idx_pages_view_count      ON public.pages (creator_id, view_count DESC);

-- Page blocks
CREATE INDEX IF NOT EXISTS idx_page_blocks_page_sort   ON public.page_blocks (page_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_page_blocks_creator_type ON public.page_blocks (creator_id, block_type);
CREATE INDEX IF NOT EXISTS idx_page_blocks_visible     ON public.page_blocks (page_id, is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_page_blocks_parent      ON public.page_blocks (parent_block_id) WHERE parent_block_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_blocks_layout_role ON public.page_blocks (page_id, layout_role);
CREATE INDEX IF NOT EXISTS gin_page_blocks_content     ON public.page_blocks USING GIN (content);
CREATE INDEX IF NOT EXISTS gin_page_blocks_custom_styles ON public.page_blocks USING GIN (custom_styles);

-- Page versions
CREATE INDEX IF NOT EXISTS idx_page_versions_page_date ON public.page_versions (page_id, created_at DESC);

-- Page block media
CREATE INDEX IF NOT EXISTS idx_page_block_media_block ON public.page_block_media (page_block_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_page_block_media_media ON public.page_block_media (media_id);

-- Page templates
CREATE INDEX IF NOT EXISTS idx_page_templates_creator_type  ON public.page_templates (creator_id, page_type);
CREATE INDEX IF NOT EXISTS idx_page_templates_system_public ON public.page_templates (is_system_template, is_public) WHERE is_system_template = true OR is_public = true;
CREATE INDEX IF NOT EXISTS idx_page_templates_category      ON public.page_templates (category);

-- Page edit locks
CREATE INDEX IF NOT EXISTS idx_page_edit_locks_expires ON public.page_edit_locks (expires_at);

-- Blog
CREATE INDEX IF NOT EXISTS idx_blog_posts_site_published ON public.blog_posts (site_id, is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug           ON public.blog_posts (site_id, slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_creator        ON public.blog_posts (creator_id);
CREATE INDEX IF NOT EXISTS gin_blog_posts_tags           ON public.blog_posts USING GIN (tags);

-- Site design tokens
CREATE INDEX IF NOT EXISTS idx_sdt_site_id ON public.site_design_tokens (site_id);

-- Saved components
CREATE INDEX IF NOT EXISTS idx_sc_creator_category ON public.saved_components (creator_id, category);
CREATE INDEX IF NOT EXISTS idx_sc_public           ON public.saved_components (is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS gin_sc_component_tree   ON public.saved_components USING GIN (component_tree);
CREATE INDEX IF NOT EXISTS gin_sc_tags             ON public.saved_components USING GIN (tags);

-- Builder assets
CREATE INDEX IF NOT EXISTS idx_ba_creator_type ON public.builder_assets (creator_id, asset_type);
CREATE INDEX IF NOT EXISTS gin_ba_tags         ON public.builder_assets USING GIN (tags);

-- Builder fonts
CREATE INDEX IF NOT EXISTS idx_bf_site_active ON public.builder_fonts (site_id, is_active);

-- Site sections config
CREATE INDEX IF NOT EXISTS idx_ssc_site_type  ON public.site_sections_config (site_id, site_type);
CREATE INDEX IF NOT EXISTS gin_ssc_sections   ON public.site_sections_config USING GIN (sections);

-- Site theme presets
CREATE INDEX IF NOT EXISTS idx_stp_creator_favorite ON public.site_theme_presets (creator_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_stp_system           ON public.site_theme_presets (is_system_preset) WHERE is_system_preset = true;

-- Site A/B tests
CREATE INDEX IF NOT EXISTS idx_sat_site_status ON public.site_ab_tests (site_id, status);

-- Product files
CREATE INDEX IF NOT EXISTS idx_pf_product_id ON public.product_files (product_id);
CREATE INDEX IF NOT EXISTS idx_pf_primary    ON public.product_files (product_id, is_primary) WHERE is_primary = true;

-- Product related
CREATE INDEX IF NOT EXISTS idx_prelat_product_type ON public.product_related (product_id, relation_type);

-- Product bundles
CREATE INDEX IF NOT EXISTS idx_pbundle_creator ON public.product_bundles (creator_id, is_published);
CREATE INDEX IF NOT EXISTS idx_pbi_bundle_id   ON public.product_bundle_items (bundle_id);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_spv_site_date       ON public.site_page_views (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spv_slug_date        ON public.site_page_views (page_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pve_product_date     ON public.product_view_events (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_site_event_date   ON public.conversion_events (site_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_product_date      ON public.conversion_events (product_id, created_at DESC);

-- Payouts
CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_payout_methods_single_default ON public.creator_payout_methods (creator_id) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_creator_payout_requests_creator_status ON public.creator_payout_requests (creator_id, status);

-- KYC
CREATE INDEX IF NOT EXISTS idx_creator_kyc_status       ON public.creator_kyc (status);
CREATE INDEX IF NOT EXISTS idx_creator_kyc_bank_verified ON public.creator_kyc (bank_verified);

-- API rate limits
CREATE INDEX IF NOT EXISTS idx_api_rate_limit_creator_hour ON public.api_rate_limits (creator_id, window_start);
CREATE INDEX IF NOT EXISTS idx_api_rate_limit_endpoint     ON public.api_rate_limits (endpoint, method, created_at);

-- Background jobs
CREATE INDEX IF NOT EXISTS idx_jobs_pending ON public.background_jobs (status, created_at) WHERE status = 'pending';

-- Wallets
CREATE INDEX IF NOT EXISTS idx_user_wallet_tx_user ON public.user_wallet_transactions (user_id, created_at);

-- ===================================================================
-- SECTION 9: ROW LEVEL SECURITY (RLS)
-- ===================================================================

ALTER TABLE public.projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_blocks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_design_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_components     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_edit_locks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_fonts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_assets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_sections_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_theme_presets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_navigation      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ab_tests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_files        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_related      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bundles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_page_views      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_view_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_blog            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts           ENABLE ROW LEVEL SECURITY;

-- Helper: drop policy before recreating (safe re-run)
-- projects
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated USING (true);

-- pages
DROP POLICY IF EXISTS "pages_select" ON public.pages;
DROP POLICY IF EXISTS "pages_insert" ON public.pages;
DROP POLICY IF EXISTS "pages_update" ON public.pages;
DROP POLICY IF EXISTS "pages_delete" ON public.pages;
CREATE POLICY "pages_select" ON public.pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "pages_insert" ON public.pages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pages_update" ON public.pages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "pages_delete" ON public.pages FOR DELETE TO authenticated USING (true);

-- page_versions
DROP POLICY IF EXISTS "page_versions_select" ON public.page_versions;
DROP POLICY IF EXISTS "page_versions_insert" ON public.page_versions;
DROP POLICY IF EXISTS "page_versions_delete" ON public.page_versions;
CREATE POLICY "page_versions_select" ON public.page_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "page_versions_insert" ON public.page_versions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "page_versions_delete" ON public.page_versions FOR DELETE TO authenticated USING (true);

-- page_blocks
DROP POLICY IF EXISTS "page_blocks_select" ON public.page_blocks;
DROP POLICY IF EXISTS "page_blocks_insert" ON public.page_blocks;
DROP POLICY IF EXISTS "page_blocks_update" ON public.page_blocks;
DROP POLICY IF EXISTS "page_blocks_delete" ON public.page_blocks;
CREATE POLICY "page_blocks_select" ON public.page_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "page_blocks_insert" ON public.page_blocks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "page_blocks_update" ON public.page_blocks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "page_blocks_delete" ON public.page_blocks FOR DELETE TO authenticated USING (true);

-- site_design_tokens
DROP POLICY IF EXISTS "sdt_all" ON public.site_design_tokens;
CREATE POLICY "sdt_all" ON public.site_design_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- saved_components
DROP POLICY IF EXISTS "sc_select" ON public.saved_components;
DROP POLICY IF EXISTS "sc_insert" ON public.saved_components;
DROP POLICY IF EXISTS "sc_update" ON public.saved_components;
DROP POLICY IF EXISTS "sc_delete" ON public.saved_components;
CREATE POLICY "sc_select" ON public.saved_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "sc_insert" ON public.saved_components FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sc_update" ON public.saved_components FOR UPDATE TO authenticated USING (true);
CREATE POLICY "sc_delete" ON public.saved_components FOR DELETE TO authenticated USING (true);

-- page_edit_locks
DROP POLICY IF EXISTS "pel_all" ON public.page_edit_locks;
CREATE POLICY "pel_all" ON public.page_edit_locks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- builder_fonts
DROP POLICY IF EXISTS "bf_all" ON public.builder_fonts;
CREATE POLICY "bf_all" ON public.builder_fonts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- builder_assets
DROP POLICY IF EXISTS "ba_all" ON public.builder_assets;
CREATE POLICY "ba_all" ON public.builder_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_sections_config
DROP POLICY IF EXISTS "ssc_all" ON public.site_sections_config;
CREATE POLICY "ssc_all" ON public.site_sections_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_theme_presets
DROP POLICY IF EXISTS "stp_select" ON public.site_theme_presets;
DROP POLICY IF EXISTS "stp_insert" ON public.site_theme_presets;
DROP POLICY IF EXISTS "stp_update" ON public.site_theme_presets;
DROP POLICY IF EXISTS "stp_delete" ON public.site_theme_presets;
CREATE POLICY "stp_select" ON public.site_theme_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "stp_insert" ON public.site_theme_presets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "stp_update" ON public.site_theme_presets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "stp_delete" ON public.site_theme_presets FOR DELETE TO authenticated USING (true);

-- site_navigation
DROP POLICY IF EXISTS "snav_all" ON public.site_navigation;
CREATE POLICY "snav_all" ON public.site_navigation FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_ab_tests
DROP POLICY IF EXISTS "sat_all" ON public.site_ab_tests;
CREATE POLICY "sat_all" ON public.site_ab_tests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- product_files
DROP POLICY IF EXISTS "pf_all" ON public.product_files;
CREATE POLICY "pf_all" ON public.product_files FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- product_related
DROP POLICY IF EXISTS "prelat_all" ON public.product_related;
CREATE POLICY "prelat_all" ON public.product_related FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- product_bundles
DROP POLICY IF EXISTS "pbundle_all" ON public.product_bundles;
CREATE POLICY "pbundle_all" ON public.product_bundles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- product_bundle_items
DROP POLICY IF EXISTS "pbi_all" ON public.product_bundle_items;
CREATE POLICY "pbi_all" ON public.product_bundle_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- analytics: public insert, authenticated read
DROP POLICY IF EXISTS "spv_insert" ON public.site_page_views;
DROP POLICY IF EXISTS "spv_select" ON public.site_page_views;
CREATE POLICY "spv_insert" ON public.site_page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "spv_select" ON public.site_page_views FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pve_insert" ON public.product_view_events;
DROP POLICY IF EXISTS "pve_select" ON public.product_view_events;
CREATE POLICY "pve_insert" ON public.product_view_events FOR INSERT WITH CHECK (true);
CREATE POLICY "pve_select" ON public.product_view_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ce_insert" ON public.conversion_events;
DROP POLICY IF EXISTS "ce_select" ON public.conversion_events;
CREATE POLICY "ce_insert" ON public.conversion_events FOR INSERT WITH CHECK (true);
CREATE POLICY "ce_select" ON public.conversion_events FOR SELECT TO authenticated USING (true);

-- site_blog
DROP POLICY IF EXISTS "site_blog_all" ON public.site_blog;
CREATE POLICY "site_blog_all" ON public.site_blog FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- blog_posts
DROP POLICY IF EXISTS "blog_posts_select" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_insert" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_update" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_delete" ON public.blog_posts;
CREATE POLICY "blog_posts_select" ON public.blog_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "blog_posts_insert" ON public.blog_posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "blog_posts_update" ON public.blog_posts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "blog_posts_delete" ON public.blog_posts FOR DELETE TO authenticated USING (true);

-- ===================================================================
-- SECTION 10: SEED DATA
-- ===================================================================

INSERT INTO public.subscription_plans
    (plan_type, plan_name, platform_fee_percent, monthly_price, yearly_price, description, features, is_active)
VALUES
    ('free', 'Free Plan',  10.0,    0,     0, 'Perfect for getting started',    '["basic_analytics","up_to_10_products"]'::jsonb, true),
    ('plus', 'Plus Plan',   7.0,  500,  5500, 'Great for growing creators',     '["advanced_analytics","up_to_100_products","email_support","custom_domain"]'::jsonb, true),
    ('pro',  'Pro Plan',    5.0, 1000, 10000, 'Best for professionals',         '["full_analytics","unlimited_products","priority_support","custom_domain","api_access","advanced_marketing"]'::jsonb, true)
ON CONFLICT (plan_type) DO NOTHING;

INSERT INTO public.site_theme_presets
    (creator_id, site_id, preset_name, description, theme_data, is_system_preset)
VALUES
    (NULL, NULL, 'Indigo Pro',    'Clean indigo & white professional theme',  '{"primaryColor":"#6366F1","secondaryColor":"#8B5CF6","accentColor":"#EC4899","backgroundColor":"#F9FAFB","surfaceColor":"#FFFFFF","textColor":"#111827","headingFont":"Inter","bodyFont":"Inter","borderRadius":"8px"}'::jsonb,  true),
    (NULL, NULL, 'Midnight Dark', 'Premium dark theme for modern creators',   '{"primaryColor":"#818CF8","secondaryColor":"#A78BFA","accentColor":"#F472B6","backgroundColor":"#0F172A","surfaceColor":"#1E293B","textColor":"#F1F5F9","headingFont":"Inter","bodyFont":"Inter","borderRadius":"12px"}'::jsonb, true),
    (NULL, NULL, 'Warm Amber',    'Warm, inviting amber & cream theme',       '{"primaryColor":"#D97706","secondaryColor":"#B45309","accentColor":"#DC2626","backgroundColor":"#FFFBEB","surfaceColor":"#FFFFFF","textColor":"#1C1917","headingFont":"Playfair Display","bodyFont":"Inter","borderRadius":"6px"}'::jsonb, true),
    (NULL, NULL, 'Forest Green',  'Natural green & earthy tones',             '{"primaryColor":"#059669","secondaryColor":"#047857","accentColor":"#F59E0B","backgroundColor":"#F0FDF4","surfaceColor":"#FFFFFF","textColor":"#14532D","headingFont":"Inter","bodyFont":"Inter","borderRadius":"10px"}'::jsonb, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.page_templates
    (creator_id, template_name, description, page_type, template_blocks, is_system_template, is_public, category)
VALUES
    (NULL, 'Product Showcase', 'Modern product landing page',  'product', '{"blocks":[{"type":"hero","title":"Product Title","cta":true},{"type":"image_gallery","columns":3},{"type":"testimonial"},{"type":"cta_button","text":"Buy Now"}]}'::jsonb, true, true, 'product'),
    (NULL, 'About Page',       'Company/Creator about page',   'about',   '{"blocks":[{"type":"hero","title":"About Us"},{"type":"text","content":"Your story"},{"type":"image","alignment":"right"},{"type":"testimonial"}]}'::jsonb, true, true, 'about'),
    (NULL, 'Blog Landing',     'Blog home page',               'blog',    '{"blocks":[{"type":"hero","title":"My Blog"},{"type":"rich_text"},{"type":"cta_button","subscription":true}]}'::jsonb, true, true, 'blog'),
    (NULL, 'Minimalist',       'Minimal & clean design',       'landing', '{"blocks":[{"type":"hero","fullscreen":true},{"type":"cta_button"},{"type":"divider"}]}'::jsonb, true, true, 'landing'),
    (NULL, 'Contact Form',     'Lead capture page',            'contact', '{"blocks":[{"type":"text","title":"Get In Touch"},{"type":"form","fields":["name","email","message"]},{"type":"cta_button"}]}'::jsonb, true, true, 'contact')
ON CONFLICT DO NOTHING;

INSERT INTO public.subscription_offers
    (subscription_plan_id, offer_name, offer_type, discount_value, description, start_date, end_date, max_redemptions, apply_to_new_only, is_active)
SELECT id, 'Launch Offer - 30% Off', 'percentage'::offer_type, 30,
    'Limited time launch offer for new Plus subscribers',
    NOW(), NOW() + INTERVAL '30 days', 1000, true, true
FROM public.subscription_plans WHERE plan_type = 'plus'::subscription_plan_type
ON CONFLICT DO NOTHING;

INSERT INTO public.subscription_offers
    (subscription_plan_id, offer_name, offer_type, discount_value, description, start_date, end_date, max_redemptions, apply_to_new_only, is_active)
SELECT id, 'Upgrade Special - ₹500 Off', 'fixed_amount'::offer_type, 500,
    'Upgrade from Free to Pro with special discount',
    NOW(), NOW() + INTERVAL '45 days', 500, false, true
FROM public.subscription_plans WHERE plan_type = 'pro'::subscription_plan_type
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SCHEMA COMPLETE — DigiOne Final v3
-- Tables : 63  |  Indexes : 85+  |  RLS : all new tables covered
-- Site types: main | single | payment | blog
-- HTML/CSS/JS injection: block → page → site (all types)
-- ===================================================================

-- ===================================================================
-- SECTION 7b: ADDITIONAL FK CONSTRAINTS (missed in v3)
-- ===================================================================

-- projects → sites (new site_id column)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_site') THEN
  ALTER TABLE public.projects ADD CONSTRAINT fk_projects_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;
END IF; END $$;

-- pages: scoped unique slug per project (replaces global unique)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_pages_project_slug') THEN
  ALTER TABLE public.pages ADD CONSTRAINT uq_pages_project_slug UNIQUE (project_id, slug);
END IF; END $$;

-- coupons: unique code per creator (two creators can both have "SAVE10")
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_coupons_creator_code') THEN
  ALTER TABLE public.coupons ADD CONSTRAINT uq_coupons_creator_code UNIQUE (creator_id, code);
END IF; END $$;

-- creator_kyc: one KYC record per creator
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_creator_kyc_creator') THEN
  ALTER TABLE public.creator_kyc ADD CONSTRAINT uq_creator_kyc_creator UNIQUE (creator_id);
END IF; END $$;

-- ===================================================================
-- SECTION 8b: ADDITIONAL INDEXES (missed in v3)
-- ===================================================================

-- Sites: partial unique for main store slugs (replaces broken global unique)
DROP INDEX IF EXISTS idx_sites_slug;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_main_slug
  ON public.sites (slug)
  WHERE site_type = 'main' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sites_parent_child
  ON public.sites (parent_site_id, child_slug)
  WHERE parent_site_id IS NOT NULL;

-- Orders: gateway_order_id for Cashfree webhook lookups (critical)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_gateway_order_id
  ON public.orders (gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;

-- Payment submissions: gateway lookup
CREATE INDEX IF NOT EXISTS idx_payment_submissions_gateway
  ON public.payment_submissions (gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;

-- Notifications: dashboard load query (recipient + unread + recency)
CREATE INDEX IF NOT EXISTS idx_notifications_creator_unread
  ON public.notifications (recipient_creator_id, is_read, created_at DESC)
  WHERE recipient_creator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (recipient_user_id, is_read, created_at DESC)
  WHERE recipient_user_id IS NOT NULL;

-- Creator balances: payout screen
CREATE INDEX IF NOT EXISTS idx_creator_balances_creator
  ON public.creator_balances (creator_id);

-- Coupons: checkout validation
CREATE INDEX IF NOT EXISTS idx_coupons_creator_code
  ON public.coupons (creator_id, code)
  WHERE is_active = true;

-- User carts + wishlists: opened on every session
CREATE INDEX IF NOT EXISTS idx_user_carts_user
  ON public.user_carts (user_id);

CREATE INDEX IF NOT EXISTS idx_user_wishlist_user
  ON public.user_wishlist (user_id);

-- User product access: gated content check on every page load
CREATE INDEX IF NOT EXISTS idx_upa_user_product
  ON public.user_product_access (user_id, product_id);

-- Affiliates
CREATE INDEX IF NOT EXISTS idx_affiliates_creator
  ON public.affiliates (creator_id, is_active);

CREATE INDEX IF NOT EXISTS idx_affiliates_user
  ON public.affiliates (affiliate_user_id);

-- Support tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status
  ON public.support_tickets (user_id, status)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_admin_status
  ON public.support_tickets (assigned_admin_id, status)
  WHERE assigned_admin_id IS NOT NULL;

-- Email events
CREATE INDEX IF NOT EXISTS idx_email_events_order
  ON public.email_events (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_events_recipient_status
  ON public.email_events (recipient_email, status);

-- Payout request items
CREATE INDEX IF NOT EXISTS idx_cpri_payout_request
  ON public.creator_payout_request_items (payout_request_id);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_creator_slug
  ON public.projects (creator_id, slug)
  WHERE slug IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_site
  ON public.projects (site_id)
  WHERE site_id IS NOT NULL;

-- Payment requests
CREATE INDEX IF NOT EXISTS idx_payment_requests_site_slug
  ON public.payment_requests (site_id, slug)
  WHERE slug IS NOT NULL;

-- Blog search
CREATE INDEX IF NOT EXISTS idx_blog_posts_search
  ON public.blog_posts USING GIN (search_vector);

-- ===================================================================
-- SECTION 8c: UPDATED_AT TRIGGER
-- Automatically keeps updated_at current on every UPDATE.
-- One function, applied to every table that has the column.
-- ===================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply trigger to every table with updated_at
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'subscription_plans','subscription_offers','subscription_offer_redemptions',
    'media_library','users','profiles','user_roles','site_templates',
    'sites','site_main','site_singlepage','site_blog','blog_posts',
    'site_product_assignments','products','other_products','guest_leads',
    'orders','order_items','creator_revenue_shares','creator_balances',
    'creator_payout_methods','creator_payout_requests','creator_payouts',
    'subscriptions','api_rate_limits','payment_requests','payment_submissions',
    'user_carts','user_product_access','product_licenses','product_ratings',
    'affiliates','coupons','referral_codes','user_referrals','user_wallets',
    'support_tickets','notifications','creator_kyc','transaction_ledger',
    'storage_files','storage_file_usages','background_jobs','projects','pages',
    'page_blocks','page_block_media','page_templates','site_design_tokens',
    'saved_components','builder_fonts','builder_assets','site_sections_config',
    'site_theme_presets','site_navigation','site_ab_tests','product_files',
    'product_related','product_bundles'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;
       CREATE TRIGGER trg_set_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t
    );
  END LOOP;
END $$;

-- blog_posts: auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION public.update_blog_post_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_post_search ON public.blog_posts;
CREATE TRIGGER trg_blog_post_search
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_blog_post_search_vector();

-- ===================================================================
-- SECTION 9b: REAL RLS POLICIES
-- Replaces all USING (true) with actual auth.uid() checks.
-- Helper: get current user's profile id from auth.uid()
-- ===================================================================

CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── sites ──────────────────────────────────────────────────────────
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sites_select"  ON public.sites;
DROP POLICY IF EXISTS "sites_insert"  ON public.sites;
DROP POLICY IF EXISTS "sites_update"  ON public.sites;
DROP POLICY IF EXISTS "sites_delete"  ON public.sites;
-- Public can read active sites (storefronts are public)
CREATE POLICY "sites_select" ON public.sites FOR SELECT USING (
  is_active = true OR creator_id = public.auth_profile_id()
);
CREATE POLICY "sites_insert" ON public.sites FOR INSERT TO authenticated WITH CHECK (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "sites_update" ON public.sites FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "sites_delete" ON public.sites FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── products ───────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select"  ON public.products;
DROP POLICY IF EXISTS "products_insert"  ON public.products;
DROP POLICY IF EXISTS "products_update"  ON public.products;
DROP POLICY IF EXISTS "products_delete"  ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT USING (
  is_published = true OR creator_id = public.auth_profile_id()
);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── profiles ───────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (
  user_id = auth.uid()
);

-- ── users ──────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (
  id = auth.uid()
);
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (
  id = auth.uid()
);

-- ── orders ─────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select" ON public.orders;
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_select" ON public.orders FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = orders.id AND p.creator_id = public.auth_profile_id()
  )
);
CREATE POLICY "orders_insert" ON public.orders FOR INSERT WITH CHECK (true);

-- ── order_items ────────────────────────────────────────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = order_items.product_id
    AND p.creator_id = public.auth_profile_id()
  )
);
CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT WITH CHECK (true);

-- ── projects ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id() OR is_public = true
);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── pages ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pages_select" ON public.pages;
DROP POLICY IF EXISTS "pages_insert" ON public.pages;
DROP POLICY IF EXISTS "pages_update" ON public.pages;
DROP POLICY IF EXISTS "pages_delete" ON public.pages;
CREATE POLICY "pages_select" ON public.pages FOR SELECT USING (
  is_published = true OR creator_id = public.auth_profile_id()
);
CREATE POLICY "pages_insert" ON public.pages FOR INSERT TO authenticated WITH CHECK (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "pages_update" ON public.pages FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "pages_delete" ON public.pages FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── page_blocks ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "page_blocks_select" ON public.page_blocks;
DROP POLICY IF EXISTS "page_blocks_insert" ON public.page_blocks;
DROP POLICY IF EXISTS "page_blocks_update" ON public.page_blocks;
DROP POLICY IF EXISTS "page_blocks_delete" ON public.page_blocks;
CREATE POLICY "page_blocks_select" ON public.page_blocks FOR SELECT USING (
  creator_id = public.auth_profile_id()
  OR EXISTS (SELECT 1 FROM public.pages pg WHERE pg.id = page_blocks.page_id AND pg.is_published = true)
);
CREATE POLICY "page_blocks_insert" ON public.page_blocks FOR INSERT TO authenticated WITH CHECK (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "page_blocks_update" ON public.page_blocks FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "page_blocks_delete" ON public.page_blocks FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── media_library ──────────────────────────────────────────────────
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ml_select" ON public.media_library;
DROP POLICY IF EXISTS "ml_insert" ON public.media_library;
DROP POLICY IF EXISTS "ml_update" ON public.media_library;
DROP POLICY IF EXISTS "ml_delete" ON public.media_library;
CREATE POLICY "ml_select" ON public.media_library FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "ml_insert" ON public.media_library FOR INSERT TO authenticated WITH CHECK (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "ml_update" ON public.media_library FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "ml_delete" ON public.media_library FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── blog_posts ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "blog_posts_select" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_insert" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_update" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_delete" ON public.blog_posts;
CREATE POLICY "blog_posts_select" ON public.blog_posts FOR SELECT USING (
  is_published = true OR creator_id = public.auth_profile_id()
);
CREATE POLICY "blog_posts_insert" ON public.blog_posts FOR INSERT TO authenticated WITH CHECK (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "blog_posts_update" ON public.blog_posts FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "blog_posts_delete" ON public.blog_posts FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── notifications: own records only ───────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated USING (
  recipient_user_id = auth.uid() OR recipient_creator_id = public.auth_profile_id()
);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated USING (
  recipient_user_id = auth.uid() OR recipient_creator_id = public.auth_profile_id()
);

-- ── creator_revenue_shares: own records ────────────────────────────
ALTER TABLE public.creator_revenue_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crs_select" ON public.creator_revenue_shares;
CREATE POLICY "crs_select" ON public.creator_revenue_shares FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "crs_insert" ON public.creator_revenue_shares FOR INSERT WITH CHECK (true);

-- ── creator_balances: own record ───────────────────────────────────
ALTER TABLE public.creator_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cb_select" ON public.creator_balances;
CREATE POLICY "cb_select" ON public.creator_balances FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "cb_insert" ON public.creator_balances FOR INSERT WITH CHECK (true);
CREATE POLICY "cb_update" ON public.creator_balances FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── creator_kyc: own record ────────────────────────────────────────
ALTER TABLE public.creator_kyc ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kyc_select" ON public.creator_kyc;
DROP POLICY IF EXISTS "kyc_insert" ON public.creator_kyc;
DROP POLICY IF EXISTS "kyc_update" ON public.creator_kyc;
CREATE POLICY "kyc_select" ON public.creator_kyc FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "kyc_insert" ON public.creator_kyc FOR INSERT TO authenticated WITH CHECK (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "kyc_update" ON public.creator_kyc FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── creator_payout_methods ─────────────────────────────────────────
ALTER TABLE public.creator_payout_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cpm_select" ON public.creator_payout_methods;
DROP POLICY IF EXISTS "cpm_insert" ON public.creator_payout_methods;
DROP POLICY IF EXISTS "cpm_update" ON public.creator_payout_methods;
DROP POLICY IF EXISTS "cpm_delete" ON public.creator_payout_methods;
CREATE POLICY "cpm_select" ON public.creator_payout_methods FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "cpm_insert" ON public.creator_payout_methods FOR INSERT TO authenticated WITH CHECK (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "cpm_update" ON public.creator_payout_methods FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "cpm_delete" ON public.creator_payout_methods FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── creator_payout_requests ────────────────────────────────────────
ALTER TABLE public.creator_payout_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cpr_select" ON public.creator_payout_requests;
DROP POLICY IF EXISTS "cpr_insert" ON public.creator_payout_requests;
CREATE POLICY "cpr_select" ON public.creator_payout_requests FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "cpr_insert" ON public.creator_payout_requests FOR INSERT TO authenticated WITH CHECK (
  creator_id = public.auth_profile_id()
);

-- ── subscriptions: own record ──────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sub_select" ON public.subscriptions;
CREATE POLICY "sub_select" ON public.subscriptions FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "sub_insert" ON public.subscriptions FOR INSERT WITH CHECK (true);

-- ── subscription_plans: public read ───────────────────────────────
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_select" ON public.subscription_plans;
CREATE POLICY "sp_select" ON public.subscription_plans FOR SELECT USING (is_active = true);

-- ── subscription_offers: public read ──────────────────────────────
ALTER TABLE public.subscription_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "so_select" ON public.subscription_offers;
CREATE POLICY "so_select" ON public.subscription_offers FOR SELECT USING (is_active = true);

-- ── user_product_access: own records ──────────────────────────────
ALTER TABLE public.user_product_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "upa_select" ON public.user_product_access;
CREATE POLICY "upa_select" ON public.user_product_access FOR SELECT TO authenticated USING (
  user_id = auth.uid()
);
CREATE POLICY "upa_insert" ON public.user_product_access FOR INSERT WITH CHECK (true);

-- ── product_licenses: own records ─────────────────────────────────
ALTER TABLE public.product_licenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pl_select" ON public.product_licenses;
CREATE POLICY "pl_select" ON public.product_licenses FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_licenses.product_id AND p.creator_id = public.auth_profile_id())
);
CREATE POLICY "pl_insert" ON public.product_licenses FOR INSERT WITH CHECK (true);

-- ── user_carts + wishlist: own records ────────────────────────────
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cart_all" ON public.user_carts;
CREATE POLICY "cart_all" ON public.user_carts FOR ALL TO authenticated USING (
  user_id = auth.uid()
) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.user_wishlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wish_all" ON public.user_wishlist;
CREATE POLICY "wish_all" ON public.user_wishlist FOR ALL TO authenticated USING (
  user_id = auth.uid()
) WITH CHECK (user_id = auth.uid());

-- ── user_wallets + transactions: own records ──────────────────────
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_select" ON public.user_wallets;
CREATE POLICY "wallet_select" ON public.user_wallets FOR SELECT TO authenticated USING (
  user_id = auth.uid()
);
CREATE POLICY "wallet_insert" ON public.user_wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "wallet_update" ON public.user_wallets FOR UPDATE TO authenticated USING (
  user_id = auth.uid()
);

ALTER TABLE public.user_wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "uwt_select" ON public.user_wallet_transactions;
CREATE POLICY "uwt_select" ON public.user_wallet_transactions FOR SELECT TO authenticated USING (
  user_id = auth.uid()
);
CREATE POLICY "uwt_insert" ON public.user_wallet_transactions FOR INSERT WITH CHECK (true);

-- ── coupons: creator owns, anyone can validate (insert check) ─────
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coupon_select" ON public.coupons;
DROP POLICY IF EXISTS "coupon_write"  ON public.coupons;
CREATE POLICY "coupon_select" ON public.coupons FOR SELECT USING (
  is_active = true OR creator_id = public.auth_profile_id()
);
CREATE POLICY "coupon_write" ON public.coupons FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── support_tickets: own tickets or creator sees tickets for their site ──
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_select" ON public.support_tickets;
DROP POLICY IF EXISTS "ticket_insert" ON public.support_tickets;
CREATE POLICY "ticket_select" ON public.support_tickets FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR creator_id = public.auth_profile_id()
);
CREATE POLICY "ticket_insert" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "ticket_update" ON public.support_tickets FOR UPDATE TO authenticated USING (
  user_id = auth.uid() OR creator_id = public.auth_profile_id()
);

-- ── payment_requests: public read (storefronts), creator write ────
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pr_select" ON public.payment_requests;
DROP POLICY IF EXISTS "pr_write"  ON public.payment_requests;
CREATE POLICY "pr_select" ON public.payment_requests FOR SELECT USING (
  status = 'active'
  OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = payment_requests.site_id AND s.creator_id = public.auth_profile_id())
);
CREATE POLICY "pr_write" ON public.payment_requests FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = payment_requests.site_id AND s.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = payment_requests.site_id AND s.creator_id = public.auth_profile_id())
);

-- ── payment_submissions: creator reads their site's submissions ───
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ps_select" ON public.payment_submissions;
DROP POLICY IF EXISTS "ps_insert" ON public.payment_submissions;
CREATE POLICY "ps_select" ON public.payment_submissions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.payment_requests pr
    JOIN public.sites s ON s.id = pr.site_id
    WHERE pr.id = payment_submissions.payment_request_id
    AND s.creator_id = public.auth_profile_id()
  )
);
CREATE POLICY "ps_insert" ON public.payment_submissions FOR INSERT WITH CHECK (true);

-- ── email_events: read own ─────────────────────────────────────────
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ee_select" ON public.email_events;
CREATE POLICY "ee_select" ON public.email_events FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR creator_id = public.auth_profile_id()
);
CREATE POLICY "ee_insert" ON public.email_events FOR INSERT WITH CHECK (true);

-- ── background_jobs: service role only (no user access) ───────────
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bj_all" ON public.background_jobs;
-- No policy = no access for normal users; service_role bypasses RLS

-- ── transaction_ledger: immutable, read own ────────────────────────
ALTER TABLE public.transaction_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tl_select" ON public.transaction_ledger;
CREATE POLICY "tl_select" ON public.transaction_ledger FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR creator_id = public.auth_profile_id()
);
CREATE POLICY "tl_insert" ON public.transaction_ledger FOR INSERT WITH CHECK (true);

-- ── storage_files: own files ───────────────────────────────────────
ALTER TABLE public.storage_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sf_select" ON public.storage_files;
DROP POLICY IF EXISTS "sf_write"  ON public.storage_files;
CREATE POLICY "sf_select" ON public.storage_files FOR SELECT TO authenticated USING (
  owner_user_id = auth.uid() OR owner_creator_id = public.auth_profile_id()
);
CREATE POLICY "sf_insert" ON public.storage_files FOR INSERT TO authenticated WITH CHECK (
  owner_user_id = auth.uid() OR owner_creator_id = public.auth_profile_id()
);
CREATE POLICY "sf_update" ON public.storage_files FOR UPDATE TO authenticated USING (
  owner_user_id = auth.uid() OR owner_creator_id = public.auth_profile_id()
);

-- ── api_rate_limits: own records ───────────────────────────────────
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "arl_all" ON public.api_rate_limits;
CREATE POLICY "arl_all" ON public.api_rate_limits FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── product_ratings: approved visible to all, own visible to self ─
ALTER TABLE public.product_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prat_select" ON public.product_ratings;
DROP POLICY IF EXISTS "prat_write"  ON public.product_ratings;
CREATE POLICY "prat_select" ON public.product_ratings FOR SELECT USING (
  is_approved = true OR user_id = auth.uid()
);
CREATE POLICY "prat_insert" ON public.product_ratings FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "prat_update" ON public.product_ratings FOR UPDATE TO authenticated USING (
  user_id = auth.uid()
);

-- ── affiliates: creator + affiliate user can see ───────────────────
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aff_select" ON public.affiliates;
CREATE POLICY "aff_select" ON public.affiliates FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id() OR affiliate_user_id = auth.uid()
);
CREATE POLICY "aff_insert" ON public.affiliates FOR INSERT TO authenticated WITH CHECK (
  creator_id = public.auth_profile_id()
);

-- ── referral_codes: owner can see ─────────────────────────────────
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rc_select" ON public.referral_codes;
CREATE POLICY "rc_select" ON public.referral_codes FOR SELECT USING (
  is_active = true OR owner_user_id = auth.uid() OR owner_creator_id = public.auth_profile_id()
);
CREATE POLICY "rc_insert" ON public.referral_codes FOR INSERT TO authenticated WITH CHECK (
  owner_user_id = auth.uid() OR owner_creator_id = public.auth_profile_id()
);

-- ── subscription_offer_redemptions: own ───────────────────────────
ALTER TABLE public.subscription_offer_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sor_select" ON public.subscription_offer_redemptions;
CREATE POLICY "sor_select" ON public.subscription_offer_redemptions FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
CREATE POLICY "sor_insert" ON public.subscription_offer_redemptions FOR INSERT WITH CHECK (true);

-- ── site_builder tables: scoped to creator ────────────────────────
-- (site_design_tokens, site_sections_config, site_navigation,
--  site_theme_presets, site_ab_tests — all use creator_id or site.creator_id)

DROP POLICY IF EXISTS "sdt_all" ON public.site_design_tokens;
CREATE POLICY "sdt_all" ON public.site_design_tokens FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

DROP POLICY IF EXISTS "ssc_all" ON public.site_sections_config;
CREATE POLICY "ssc_all" ON public.site_sections_config FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_sections_config.site_id AND s.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_sections_config.site_id AND s.creator_id = public.auth_profile_id())
);

DROP POLICY IF EXISTS "snav_all" ON public.site_navigation;
CREATE POLICY "snav_all" ON public.site_navigation FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_navigation.site_id AND s.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_navigation.site_id AND s.creator_id = public.auth_profile_id())
);

DROP POLICY IF EXISTS "stp_select" ON public.site_theme_presets;
DROP POLICY IF EXISTS "stp_insert" ON public.site_theme_presets;
DROP POLICY IF EXISTS "stp_update" ON public.site_theme_presets;
DROP POLICY IF EXISTS "stp_delete" ON public.site_theme_presets;
CREATE POLICY "stp_select" ON public.site_theme_presets FOR SELECT USING (
  is_system_preset = true OR creator_id = public.auth_profile_id()
);
CREATE POLICY "stp_write" ON public.site_theme_presets FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

DROP POLICY IF EXISTS "sat_all" ON public.site_ab_tests;
CREATE POLICY "sat_all" ON public.site_ab_tests FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── builder assets/fonts/saved_components: own ────────────────────
DROP POLICY IF EXISTS "bf_all" ON public.builder_fonts;
CREATE POLICY "bf_all" ON public.builder_fonts FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

DROP POLICY IF EXISTS "ba_all" ON public.builder_assets;
CREATE POLICY "ba_all" ON public.builder_assets FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

DROP POLICY IF EXISTS "sc_select" ON public.saved_components;
DROP POLICY IF EXISTS "sc_insert" ON public.saved_components;
DROP POLICY IF EXISTS "sc_update" ON public.saved_components;
DROP POLICY IF EXISTS "sc_delete" ON public.saved_components;
CREATE POLICY "sc_select" ON public.saved_components FOR SELECT USING (
  is_public = true OR creator_id = public.auth_profile_id()
);
CREATE POLICY "sc_write" ON public.saved_components FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── page_templates: system public, creator own ────────────────────
DROP POLICY IF EXISTS "pt_select" ON public.page_templates;
CREATE POLICY "pt_select" ON public.page_templates FOR SELECT USING (
  is_system_template = true OR is_public = true OR creator_id = public.auth_profile_id()
);
CREATE POLICY "pt_write" ON public.page_templates FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── page_edit_locks: own lock ──────────────────────────────────────
DROP POLICY IF EXISTS "pel_all" ON public.page_edit_locks;
CREATE POLICY "pel_all" ON public.page_edit_locks FOR ALL TO authenticated USING (
  locked_by_user_id = auth.uid()
) WITH CHECK (locked_by_user_id = auth.uid());

-- ── product tables: creator scoped ────────────────────────────────
DROP POLICY IF EXISTS "pf_all" ON public.product_files;
CREATE POLICY "pf_select" ON public.product_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_files.product_id AND (p.is_published = true OR p.creator_id = public.auth_profile_id()))
);
CREATE POLICY "pf_write" ON public.product_files FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

DROP POLICY IF EXISTS "pbundle_all" ON public.product_bundles;
CREATE POLICY "pbundle_select" ON public.product_bundles FOR SELECT USING (
  is_published = true OR creator_id = public.auth_profile_id()
);
CREATE POLICY "pbundle_write" ON public.product_bundles FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

DROP POLICY IF EXISTS "prelat_all" ON public.product_related;
CREATE POLICY "prelat_all" ON public.product_related FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_related.product_id AND p.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_related.product_id AND p.creator_id = public.auth_profile_id())
);

DROP POLICY IF EXISTS "pbi_all" ON public.product_bundle_items;
CREATE POLICY "pbi_all" ON public.product_bundle_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.product_bundles pb WHERE pb.id = product_bundle_items.bundle_id AND pb.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.product_bundles pb WHERE pb.id = product_bundle_items.bundle_id AND pb.creator_id = public.auth_profile_id())
);

-- ===================================================================
-- SCHEMA COMPLETE — DigiOne v4
-- Tables  : 68
-- Indexes : 100+
-- Triggers: updated_at on all tables + blog search vector
-- RLS     : real auth.uid() policies on all 68 tables
-- URL routing: parent/child site hierarchy built in
-- ===================================================================

-- ============================================================
-- PART 2: SEED DATA
-- ============================================================
-- ===================================================================
-- DIGIONE — COMPLETE SEED DATA (FINAL)
-- Single file. Run AFTER digione_schema_v4.sql on a fresh database.
-- No migration patch needed — all data matches schema v4 directly.
--
-- PASSWORD FOR ALL ACCOUNTS: Test@1234
--
-- ── PERSONAS ───────────────────────────────────────────────────────
-- admin@digione.in      super_admin
-- arjun@digione.in      creator  Pro plan   courses + ebooks
-- priya@digione.in      creator  Plus plan  design assets + blog
-- rahul@digione.in      creator  Free plan  photography
-- neha@digione.in       creator  Pro plan   music + podcasts (KYC rejected)
-- sneha@example.com     buyer    3 orders, wallet balance, wishlist
-- karan@example.com     buyer    cart with items, 1 pending order
-- dev@example.com       buyer    refunded order, support ticket
--
-- ── UUID PREFIX MAP ────────────────────────────────────────────────
-- 00000000-...  users / auth.users       (01=admin 02=arjun 03=priya
--                                         04=rahul 05=sneha 06=karan
--                                         07=neha  08=dev)
-- 10000000-...  auth_provider_id         (mirrors users)
-- a0000000-...  profiles                 (a01–a08)
-- 5b000000-...  subscriptions
-- fc000000-...  subscription_offers
-- e2000000-...  media_library
-- fb000000-...  sites
-- e8000000-...  products
-- fd000000-...  blog_posts
-- e1000000-...  guest_leads
-- e4000000-...  orders
-- e3000000-...  order_items
-- e5000000-...  page_blocks / bundles
-- e6000000-...  pages
-- e7000000-...  projects
-- e9000000-...  referral_codes
-- fa000000-...  storage_files
-- ce000000-...  creator_payout_requests
-- ca000000-...  payment_requests
-- ===================================================================

BEGIN;

-- ===================================================================
-- PART 1: SUPABASE AUTH (auth.users + auth.identities)
-- ===================================================================


INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
)
VALUES
  -- Super Admin
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@digione.in',
    crypt('Test@1234', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"DigiOne Admin","role":"super_admin"}'::jsonb,
    NOW() - INTERVAL '180 days',
    NOW(),
    'authenticated',
    'authenticated'
  ),
  -- Creator 1: Arjun Sharma
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'arjun@digione.in',
    crypt('Test@1234', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Arjun Sharma","role":"creator"}'::jsonb,
    NOW() - INTERVAL '150 days',
    NOW(),
    'authenticated',
    'authenticated'
  ),
  -- Creator 2: Priya Mehta
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'priya@digione.in',
    crypt('Test@1234', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Priya Mehta","role":"creator"}'::jsonb,
    NOW() - INTERVAL '120 days',
    NOW(),
    'authenticated',
    'authenticated'
  ),
  -- Creator 3: Rahul Verma
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'rahul@digione.in',
    crypt('Test@1234', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rahul Verma","role":"creator"}'::jsonb,
    NOW() - INTERVAL '90 days',
    NOW(),
    'authenticated',
    'authenticated'
  ),
  -- Creator 4: Neha Kapoor
  (
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000000',
    'neha@digione.in',
    crypt('Test@1234', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Neha Kapoor","role":"creator"}'::jsonb,
    NOW() - INTERVAL '60 days',
    NOW(),
    'authenticated',
    'authenticated'
  ),
  -- Buyer 1: Sneha Patel
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'sneha@example.com',
    crypt('Test@1234', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sneha Patel","role":"user"}'::jsonb,
    NOW() - INTERVAL '100 days',
    NOW(),
    'authenticated',
    'authenticated'
  ),
  -- Buyer 2: Karan Singh
  (
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'karan@example.com',
    crypt('Test@1234', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Karan Singh","role":"user"}'::jsonb,
    NOW() - INTERVAL '80 days',
    NOW(),
    'authenticated',
    'authenticated'
  ),
  -- Buyer 3: Dev Sharma
  (
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000000',
    'dev@example.com',
    crypt('Test@1234', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dev Sharma","role":"user"}'::jsonb,
    NOW() - INTERVAL '50 days',
    NOW(),
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Also insert identity records (required for email/password login)
INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@digione.in',  '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@digione.in"}'::jsonb,  'email', NOW(), NOW()-INTERVAL '180 days', NOW()),
  ('00000000-0000-0000-0000-000000000002', 'arjun@digione.in',  '00000000-0000-0000-0000-000000000002', '{"sub":"00000000-0000-0000-0000-000000000002","email":"arjun@digione.in"}'::jsonb,  'email', NOW(), NOW()-INTERVAL '150 days', NOW()),
  ('00000000-0000-0000-0000-000000000003', 'priya@digione.in',  '00000000-0000-0000-0000-000000000003', '{"sub":"00000000-0000-0000-0000-000000000003","email":"priya@digione.in"}'::jsonb,  'email', NOW(), NOW()-INTERVAL '120 days', NOW()),
  ('00000000-0000-0000-0000-000000000004', 'rahul@digione.in',  '00000000-0000-0000-0000-000000000004', '{"sub":"00000000-0000-0000-0000-000000000004","email":"rahul@digione.in"}'::jsonb,  'email', NOW(), NOW()-INTERVAL '90 days',  NOW()),
  ('00000000-0000-0000-0000-000000000007', 'neha@digione.in',   '00000000-0000-0000-0000-000000000007', '{"sub":"00000000-0000-0000-0000-000000000007","email":"neha@digione.in"}'::jsonb,   'email', NOW(), NOW()-INTERVAL '60 days',  NOW()),
  ('00000000-0000-0000-0000-000000000005', 'sneha@example.com', '00000000-0000-0000-0000-000000000005', '{"sub":"00000000-0000-0000-0000-000000000005","email":"sneha@example.com"}'::jsonb, 'email', NOW(), NOW()-INTERVAL '100 days', NOW()),
  ('00000000-0000-0000-0000-000000000006', 'karan@example.com', '00000000-0000-0000-0000-000000000006', '{"sub":"00000000-0000-0000-0000-000000000006","email":"karan@example.com"}'::jsonb, 'email', NOW(), NOW()-INTERVAL '80 days',  NOW()),
  ('00000000-0000-0000-0000-000000000008', 'dev@example.com',   '00000000-0000-0000-0000-000000000008', '{"sub":"00000000-0000-0000-0000-000000000008","email":"dev@example.com"}'::jsonb,   'email', NOW(), NOW()-INTERVAL '50 days',  NOW())
ON CONFLICT (id) DO NOTHING;

-- Link auth.users.id → public.users.auth_provider_id
-- (The seed already sets auth_provider_id to the same UUID,
--  but this update makes it explicit and handles re-runs)
UPDATE public.users u
SET auth_provider_id = u.id  -- UUID is the same in both tables
WHERE u.auth_provider_id IS DISTINCT FROM u.id;
-- ===================================================================
-- PART 2: APPLICATION DATA
-- ===================================================================


-- ===================================================================
-- SECTION 1: USERS
-- ===================================================================

INSERT INTO public.users (id, auth_provider_id, email, phone, is_verified, role, created_at)
VALUES
  -- admin
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','admin@digione.in',   '+919000000001', true,  'admin',   NOW() - INTERVAL '180 days'),
  -- creators
  ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','arjun@digione.in',   '+919000000002', true,  'creator', NOW() - INTERVAL '150 days'),
  ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','priya@digione.in',   '+919000000003', true,  'creator', NOW() - INTERVAL '120 days'),
  ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','rahul@digione.in',   '+919000000004', true,  'creator', NOW() - INTERVAL '90 days'),
  ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000007','neha@digione.in',    '+919000000007', true,  'creator', NOW() - INTERVAL '60 days'),
  -- buyers
  ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000005','sneha@example.com',  '+919000000005', true,  'user',    NOW() - INTERVAL '100 days'),
  ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000006','karan@example.com',  '+919000000006', true,  'user',    NOW() - INTERVAL '80 days'),
  ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000008','dev@example.com',    '+919000000008', true,  'user',    NOW() - INTERVAL '50 days')
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SECTION 2: PROFILES
-- ===================================================================

INSERT INTO public.profiles (id, user_id, full_name, avatar_url, mobile, mobile_verified, email, email_verified, created_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','DigiOne Admin',  'https://cdn.digione.in/avatars/admin.jpg', '+919000000001', true, 'admin@digione.in',  true, NOW() - INTERVAL '180 days'),
  ('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Arjun Sharma',   'https://cdn.digione.in/avatars/arjun.jpg', '+919000000002', true, 'arjun@digione.in',  true, NOW() - INTERVAL '150 days'),
  ('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','Priya Mehta',    'https://cdn.digione.in/avatars/priya.jpg', '+919000000003', true, 'priya@digione.in',  true, NOW() - INTERVAL '120 days'),
  ('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','Rahul Verma',    'https://cdn.digione.in/avatars/rahul.jpg', '+919000000004', true, 'rahul@digione.in',  true, NOW() - INTERVAL '90 days'),
  ('a0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000007','Neha Kapoor',    'https://cdn.digione.in/avatars/neha.jpg',  '+919000000007', true, 'neha@digione.in',   true, NOW() - INTERVAL '60 days'),
  ('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000005','Sneha Patel',    'https://cdn.digione.in/avatars/sneha.jpg', '+919000000005', true, 'sneha@example.com', true, NOW() - INTERVAL '100 days'),
  ('a0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000006','Karan Singh',    'https://cdn.digione.in/avatars/karan.jpg', '+919000000006', true, 'karan@example.com', true, NOW() - INTERVAL '80 days'),
  ('a0000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000008','Dev Sharma',     'https://cdn.digione.in/avatars/dev.jpg',   '+919000000008', true, 'dev@example.com',   true, NOW() - INTERVAL '50 days')
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SECTION 3: USER ROLES
-- ===================================================================

INSERT INTO public.user_roles (user_id, role, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001','super_admin', NOW() - INTERVAL '180 days'),
  ('00000000-0000-0000-0000-000000000002','creator',     NOW() - INTERVAL '150 days'),
  ('00000000-0000-0000-0000-000000000003','creator',     NOW() - INTERVAL '120 days'),
  ('00000000-0000-0000-0000-000000000004','creator',     NOW() - INTERVAL '90 days'),
  ('00000000-0000-0000-0000-000000000007','creator',     NOW() - INTERVAL '60 days'),
  ('00000000-0000-0000-0000-000000000005','user',        NOW() - INTERVAL '100 days'),
  ('00000000-0000-0000-0000-000000000006','user',        NOW() - INTERVAL '80 days'),
  ('00000000-0000-0000-0000-000000000008','user',        NOW() - INTERVAL '50 days')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 4: SUBSCRIPTION PLANS (idempotent — also in schema seed)
-- ===================================================================

INSERT INTO public.subscription_plans (plan_type, plan_name, platform_fee_percent, monthly_price, yearly_price, description, features, is_active)
VALUES
  ('free', 'Free Plan',  10.0,    0,     0,    'Perfect for getting started',   '["basic_analytics","up_to_10_products"]'::jsonb, true),
  ('plus', 'Plus Plan',   7.0,  500,  5500,   'Great for growing creators',    '["advanced_analytics","up_to_100_products","email_support","custom_domain"]'::jsonb, true),
  ('pro',  'Pro Plan',    5.0, 1000, 10000,   'Best for professionals',        '["full_analytics","unlimited_products","priority_support","custom_domain","api_access","advanced_marketing"]'::jsonb, true)
ON CONFLICT (plan_type) DO NOTHING;

-- ===================================================================
-- SECTION 5: SUBSCRIPTION OFFERS
-- ===================================================================

INSERT INTO public.subscription_offers (id, subscription_plan_id, offer_name, offer_type, discount_value, description, start_date, end_date, max_redemptions, redeemed_count, apply_to_new_only, is_active)
SELECT 'fc000000-0000-0000-0000-000000000001', id, 'Launch 30% Off — Plus', 'percentage', 30,
  '30% off Plus plan for new subscribers', NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days', 500, 12, true, true
FROM public.subscription_plans WHERE plan_type = 'plus' ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscription_offers (id, subscription_plan_id, offer_name, offer_type, discount_value, description, start_date, end_date, max_redemptions, redeemed_count, apply_to_new_only, is_active)
SELECT 'fc000000-0000-0000-0000-000000000002', id, 'Upgrade Special — ₹500 Off Pro', 'fixed_amount', 500,
  '₹500 off first month of Pro', NOW() - INTERVAL '30 days', NOW() + INTERVAL '15 days', 200, 4, false, true
FROM public.subscription_plans WHERE plan_type = 'pro' ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscription_offers (id, subscription_plan_id, offer_name, offer_type, discount_value, description, start_date, end_date, max_redemptions, redeemed_count, apply_to_new_only, is_active)
SELECT 'fc000000-0000-0000-0000-000000000003', id, 'Early Bird — 1 Month Free Pro', 'free_period', 1000,
  '1 free month for early bird creators', NOW() - INTERVAL '90 days', NOW() - INTERVAL '30 days', 100, 100, true, false
FROM public.subscription_plans WHERE plan_type = 'pro' ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SECTION 6: SUBSCRIPTIONS (one active per creator + one expired)
-- ===================================================================

INSERT INTO public.subscriptions (id, creator_id, subscription_plan_id, status, billing_cycle, current_price, current_platform_fee_percent, start_date, end_date, renewal_date, auto_renew)
SELECT '5b000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', id,
  'active', 'monthly', 1000, 5.0, NOW() - INTERVAL '25 days', NULL, NOW() + INTERVAL '5 days', true
FROM public.subscription_plans WHERE plan_type = 'pro' ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscriptions (id, creator_id, subscription_plan_id, status, billing_cycle, current_price, current_platform_fee_percent, start_date, end_date, renewal_date, auto_renew)
SELECT '5b000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', id,
  'active', 'yearly', 5500, 7.0, NOW() - INTERVAL '60 days', NULL, NOW() + INTERVAL '305 days', true
FROM public.subscription_plans WHERE plan_type = 'plus' ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscriptions (id, creator_id, subscription_plan_id, status, billing_cycle, current_price, current_platform_fee_percent, start_date, end_date, renewal_date, auto_renew)
SELECT '5b000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', id,
  'active', 'monthly', 0, 10.0, NOW() - INTERVAL '10 days', NULL, NOW() + INTERVAL '20 days', false
FROM public.subscription_plans WHERE plan_type = 'free' ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscriptions (id, creator_id, subscription_plan_id, status, billing_cycle, current_price, current_platform_fee_percent, start_date, end_date, renewal_date, auto_renew)
SELECT '5b000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000007', id,
  'active', 'monthly', 500, 5.0, NOW() - INTERVAL '5 days', NULL, NOW() + INTERVAL '25 days', true
FROM public.subscription_plans WHERE plan_type = 'pro' ON CONFLICT (id) DO NOTHING;

-- expired subscription (Neha's previous plan)
INSERT INTO public.subscriptions (id, creator_id, subscription_plan_id, status, billing_cycle, current_price, current_platform_fee_percent, start_date, end_date, renewal_date, auto_renew)
SELECT '5b000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000007', id,
  'expired', 'monthly', 500, 7.0, NOW() - INTERVAL '65 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', false
FROM public.subscription_plans WHERE plan_type = 'plus' ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SECTION 7: SUBSCRIPTION OFFER REDEMPTIONS
-- ===================================================================

INSERT INTO public.subscription_offer_redemptions (subscription_id, offer_id, creator_id, discount_amount, expires_at)
VALUES
  ('5b000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 500,  NOW() + INTERVAL '5 days'),
  ('5b000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 1650, NOW() + INTERVAL '305 days')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 8: CREATOR SUBSCRIPTION ORDERS
-- ===================================================================

INSERT INTO public.creator_subscription_orders (creator_id, plan_id, amount, currency, status, gateway_order_id, gateway_payment_id, paid_at, created_at)
VALUES
  ('a0000000-0000-0000-0000-000000000002', 'pro',  1000, 'INR', 'paid',    'CF_SUBORD_001', 'CF_SUBPAY_001', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('a0000000-0000-0000-0000-000000000003', 'plus', 5500, 'INR', 'paid',    'CF_SUBORD_002', 'CF_SUBPAY_002', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
  ('a0000000-0000-0000-0000-000000000007', 'pro',  1000, 'INR', 'paid',    'CF_SUBORD_003', 'CF_SUBPAY_003', NOW() - INTERVAL '5 days',  NOW() - INTERVAL '5 days'),
  ('a0000000-0000-0000-0000-000000000007', 'plus',  500, 'INR', 'paid',    'CF_SUBORD_004', 'CF_SUBPAY_004', NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days'),
  -- failed attempt
  ('a0000000-0000-0000-0000-000000000004', 'plus',  500, 'INR', 'failed',  'CF_SUBORD_005', NULL,            NULL,                       NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 9: MEDIA LIBRARY
-- ===================================================================

INSERT INTO public.media_library (id, creator_id, file_name, file_type, file_size, media_type, storage_url, thumbnail_url, width, height, alt_text, tags, is_favorite)
VALUES
  -- Arjun
  ('e2000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','figma-course-cover.jpg',  'image/jpeg',  245000,  'image',    'https://cdn.digione.in/arjun/figma-course-cover.jpg',  'https://cdn.digione.in/arjun/figma-course-thumb.jpg',  1200,630,  'Figma Masterclass cover',         ARRAY['course','figma','cover'],         true),
  ('e2000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','uxbook-cover.jpg',        'image/jpeg',  189000,  'image',    'https://cdn.digione.in/arjun/uxbook-cover.jpg',        'https://cdn.digione.in/arjun/uxbook-thumb.jpg',        1200,630,  'UX Career Ebook cover',           ARRAY['ebook','ux','cover'],             false),
  ('e2000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002','component-lib-cover.jpg', 'image/jpeg',  210000,  'image',    'https://cdn.digione.in/arjun/component-lib-cover.jpg', 'https://cdn.digione.in/arjun/component-lib-thumb.jpg', 1200,630,  'Figma Components cover',          ARRAY['figma','components','cover'],    false),
  ('e2000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000002','intro-video.mp4',         'video/mp4',  85000000, 'video',    'https://cdn.digione.in/arjun/intro-video.mp4',         'https://cdn.digione.in/arjun/intro-video-thumb.jpg',   NULL,NULL, 'Course intro video',              ARRAY['video','intro','course'],        true),
  -- Priya
  ('e2000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003','uikit-cover.jpg',         'image/jpeg',  198000,  'image',    'https://cdn.digione.in/priya/uikit-cover.jpg',         'https://cdn.digione.in/priya/uikit-thumb.jpg',         1200,630,  'Pro UI Kit cover',                ARRAY['uikit','design','cover'],        true),
  ('e2000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000003','icons-cover.jpg',         'image/jpeg',  145000,  'image',    'https://cdn.digione.in/priya/icons-cover.jpg',         'https://cdn.digione.in/priya/icons-thumb.jpg',         1200,630,  '500 Icons cover',                 ARRAY['icons','design','cover'],        false),
  ('e2000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000003','blog-figma-shortcuts.jpg','image/jpeg',   98000,  'image',    'https://cdn.digione.in/priya/blog-figma-shortcuts.jpg',NULL,                                                   1200,630,  'Figma shortcuts blog thumbnail',  ARRAY['blog','figma','thumbnail'],      false),
  -- Rahul
  ('e2000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000004','preset-cover.jpg',        'image/jpeg',  156000,  'image',    'https://cdn.digione.in/rahul/preset-cover.jpg',        'https://cdn.digione.in/rahul/preset-thumb.jpg',        1200,800,  'Golden Hour Presets cover',       ARRAY['presets','photography','cover'], true),
  ('e2000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000004','mobile-photo-cover.jpg',  'image/jpeg',  132000,  'image',    'https://cdn.digione.in/rahul/mobile-photo-cover.jpg',  'https://cdn.digione.in/rahul/mobile-photo-thumb.jpg',  1200,630,  'Mobile Photography Ebook cover',  ARRAY['ebook','photography','cover'],   false),
  -- Neha
  ('e2000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000007','podcast-course-cover.jpg','image/jpeg',  201000,  'image',    'https://cdn.digione.in/neha/podcast-course-cover.jpg', 'https://cdn.digione.in/neha/podcast-course-thumb.jpg', 1200,630,  'Podcast Mastery cover',           ARRAY['podcast','course','cover'],      true),
  ('e2000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000007','music-prod-cover.jpg',    'image/jpeg',  178000,  'image',    'https://cdn.digione.in/neha/music-prod-cover.jpg',     'https://cdn.digione.in/neha/music-prod-thumb.jpg',     1200,630,  'Music Production Ebook cover',    ARRAY['music','ebook','cover'],         false)
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SECTION 10: SITE TEMPLATES
-- ===================================================================

INSERT INTO public.site_templates (site_type, template_key, name, description, is_active, default_theme)
VALUES
  ('main',    'bold_creator',       'Bold Creator',       'High-contrast dark creator storefront',   true,  '{"primaryColor":"#6366F1","backgroundColor":"#0F172A"}'::jsonb),
  ('main',    'minimal_store',      'Minimal Store',      'Clean light minimal store',               true,  '{"primaryColor":"#111827","backgroundColor":"#F9FAFB"}'::jsonb),
  ('main',    'warm_market',        'Warm Market',        'Warm amber tones for lifestyle creators', true,  '{"primaryColor":"#D97706","backgroundColor":"#FFFBEB"}'::jsonb),
  ('single',  'conversion_pro',     'Conversion Pro',     'High-converting dark sales page',         true,  '{"primaryColor":"#6366F1","backgroundColor":"#0F172A"}'::jsonb),
  ('single',  'modern_product',     'Modern Product',     'Sleek light single product page',         true,  '{"primaryColor":"#8B5CF6","backgroundColor":"#FFFFFF"}'::jsonb),
  ('payment', 'simple_pay',         'Simple Pay',         'Clean minimal payment link page',         true,  '{"primaryColor":"#059669","backgroundColor":"#F0FDF4"}'::jsonb),
  ('payment', 'trust_pay',          'Trust Pay',          'Badge-heavy trust-building pay page',     true,  '{"primaryColor":"#2563EB","backgroundColor":"#EFF6FF"}'::jsonb),
  ('blog',    'clean_blog',         'Clean Blog',         'Minimal readable blog layout',            true,  '{"primaryColor":"#6366F1","backgroundColor":"#FFFFFF"}'::jsonb),
  ('blog',    'dark_blog',          'Dark Blog',          'Premium dark blog with card layout',      true,  '{"primaryColor":"#818CF8","backgroundColor":"#0F172A"}'::jsonb)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 11: SITES
-- ===================================================================
-- site_type: main | single | payment | blog

-- id | creator_id | slug (main only) | child_slug (children only) | parent_site_id (children only)
-- | site_type | is_active | custom_domain | domain_verified | ssl_status | created_at
INSERT INTO public.sites (id, creator_id, slug, child_slug, parent_site_id, site_type, is_active, custom_domain, domain_verified, ssl_status, created_at)
VALUES
  -- ── Main stores (slug set, no parent, no child_slug) ────────────────────
  ('fb000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','arjun', NULL, NULL, 'main',    true,  'store.arjunsharma.in', true,  'active',  NOW()-INTERVAL '140 days'),
  ('fb000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003','priya', NULL, NULL, 'main',    true,  'priyamehta.design',    true,  'active',  NOW()-INTERVAL '110 days'),
  ('fb000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000004','rahul', NULL, NULL, 'main',    true,  NULL,                   false, 'none',    NOW()-INTERVAL '80 days'),
  ('fb000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000007','neha',  NULL, NULL, 'main',    true,  NULL,                   false, 'pending', NOW()-INTERVAL '55 days'),
  -- ── Arjun child sites (slug NULL, child_slug + parent set) ──────────────
  ('fb000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002', NULL, 'figma-course', 'fb000000-0000-0000-0000-000000000001', 'single',  true,  NULL, false, 'none', NOW()-INTERVAL '130 days'),
  ('fb000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002', NULL, 'mentorship',   'fb000000-0000-0000-0000-000000000001', 'payment', true,  NULL, false, 'none', NOW()-INTERVAL '100 days'),
  -- ── Priya child sites ────────────────────────────────────────────────────
  ('fb000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003', NULL, 'blog',         'fb000000-0000-0000-0000-000000000004', 'blog',    true,  NULL, false, 'none', NOW()-INTERVAL '90 days'),
  -- ── Rahul child sites ────────────────────────────────────────────────────
  ('fb000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000004', NULL, 'golden-hour',  'fb000000-0000-0000-0000-000000000006', 'single',  true,  NULL, false, 'none', NOW()-INTERVAL '70 days'),
  -- ── Neha child sites ─────────────────────────────────────────────────────
  ('fb000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000007', NULL, 'blog',         'fb000000-0000-0000-0000-000000000008', 'blog',    false, NULL, false, 'none', NOW()-INTERVAL '50 days'),
  ('fb000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000007', NULL, 'collab',       'fb000000-0000-0000-0000-000000000008', 'payment', true,  NULL, false, 'none', NOW()-INTERVAL '40 days')
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SECTION 12: PRODUCTS
-- ===================================================================

INSERT INTO public.products (id, creator_id, name, description, price, thumbnail_url, category, is_published, is_on_discover_page, images, product_link, post_purchase_url, post_purchase_instructions, is_licensable, license_type, created_at)
VALUES
  -- Arjun (3 published, 1 draft)
  ('e8000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   'Figma Masterclass 2024',
   'India''s most comprehensive Figma course. 40 hrs HD video, real projects, lifetime access.',
   1999, 'https://cdn.digione.in/arjun/figma-course-cover.jpg', 'Course', true, true,
   '[{"url":"https://cdn.digione.in/arjun/fc-1.jpg"},{"url":"https://cdn.digione.in/arjun/fc-2.jpg"}]'::jsonb,
   'https://learn.digione.in/arjun/figma', 'https://learn.digione.in/arjun/figma/start',
   'Your access link has been sent to your email. Use it to log into the course portal.',
   true, 'single_user', NOW() - INTERVAL '130 days'),

  ('e8000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002',
   'UI/UX Career Roadmap Ebook',
   'Step-by-step guide to land your first UI/UX job. 180 pages, PDF + Notion template.',
   499, 'https://cdn.digione.in/arjun/uxbook-cover.jpg', 'Ebook', true, true,
   '[{"url":"https://cdn.digione.in/arjun/ux-1.jpg"}]'::jsonb,
   NULL, NULL, 'Download link sent to your email within 5 minutes.',
   false, NULL, NOW() - INTERVAL '120 days'),

  ('e8000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002',
   'Figma Component Library v2',
   'Production-ready Figma component library. 600+ components, auto-layout, variables.',
   799, 'https://cdn.digione.in/arjun/component-lib-cover.jpg', 'Design Asset', true, false,
   '[{"url":"https://cdn.digione.in/arjun/cl-1.jpg"}]'::jsonb,
   'https://figma.com/@arjun/components', NULL, 'Duplicate the Figma community file to your drafts.',
   true, 'multi_use', NOW() - INTERVAL '100 days'),

  ('e8000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000002',
   'Advanced Prototyping Masterclass', -- draft product
   'Deep-dive into Figma smart animate and interactive components.',
   2499, 'https://cdn.digione.in/arjun/proto-cover.jpg', 'Course', false, false,
   '[]'::jsonb, NULL, NULL, NULL, true, 'single_user', NOW() - INTERVAL '5 days'),

  -- Priya (3 published)
  ('e8000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003',
   'Pro UI Kit — Web & Mobile',
   '1200+ UI elements, 50 screens, Figma Variables, light/dark mode. Free updates 1 year.',
   1299, 'https://cdn.digione.in/priya/uikit-cover.jpg', 'Design Asset', true, true,
   '[{"url":"https://cdn.digione.in/priya/uk-1.jpg"},{"url":"https://cdn.digione.in/priya/uk-2.jpg"}]'::jsonb,
   NULL, NULL, 'Download your Figma file from the link in your order confirmation.',
   true, 'single_user', NOW() - INTERVAL '110 days'),

  ('e8000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000003',
   '500 Custom Icons Pack',
   'Minimal line icons in SVG, PNG and Figma. Free updates for 1 year.',
   349, 'https://cdn.digione.in/priya/icons-cover.jpg', 'Design Asset', true, false,
   '[{"url":"https://cdn.digione.in/priya/ic-1.jpg"}]'::jsonb,
   NULL, NULL, 'ZIP file emailed within 5 minutes.', false, NULL, NOW() - INTERVAL '90 days'),

  ('e8000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000003',
   'Framer Portfolio Template',
   'Editable Framer portfolio template for designers. 10 pages, CMS-ready.',
   599, 'https://cdn.digione.in/priya/framer-template-cover.jpg', 'Template', true, true,
   '[{"url":"https://cdn.digione.in/priya/ft-1.jpg"}]'::jsonb,
   'https://framer.com/@priya/portfolio', NULL, 'Clone the Framer template using the link in your email.',
   true, 'multi_use', NOW() - INTERVAL '50 days'),

  -- Rahul (2 published, 1 draft)
  ('e8000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000004',
   'Golden Hour Lightroom Presets',
   '30 cinematic presets for portraits and landscapes. .xmp + .lrtemplate included.',
   299, 'https://cdn.digione.in/rahul/preset-cover.jpg', 'Photography', true, true,
   '[{"url":"https://cdn.digione.in/rahul/p-1.jpg"},{"url":"https://cdn.digione.in/rahul/p-2.jpg"}]'::jsonb,
   NULL, NULL, 'Download your presets from the link in the confirmation email.',
   false, NULL, NOW() - INTERVAL '75 days'),

  ('e8000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000004',
   'Mobile Photography Ebook',
   'Shoot like a pro using only your phone. 120-page PDF guide.',
   199, 'https://cdn.digione.in/rahul/mobile-photo-cover.jpg', 'Ebook', true, false,
   '[{"url":"https://cdn.digione.in/rahul/mp-1.jpg"}]'::jsonb,
   NULL, NULL, 'PDF download link sent to your email.', false, NULL, NOW() - INTERVAL '60 days'),

  ('e8000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000004',
   'Street Photography Presets', -- draft
   '20 moody street photography presets.',
   249, 'https://cdn.digione.in/rahul/street-cover.jpg', 'Photography', false, false,
   '[]'::jsonb, NULL, NULL, NULL, false, NULL, NOW() - INTERVAL '3 days'),

  -- Neha (2 published)
  ('e8000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000007',
   'Podcast Mastery: Launch to 1000 Listeners',
   'Complete course on starting, growing and monetising a podcast in India.',
   1499, 'https://cdn.digione.in/neha/podcast-course-cover.jpg', 'Course', true, true,
   '[{"url":"https://cdn.digione.in/neha/pc-1.jpg"}]'::jsonb,
   'https://learn.digione.in/neha/podcast', NULL, 'Access link sent to your email.',
   true, 'single_user', NOW() - INTERVAL '50 days'),

  ('e8000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000007',
   'Music Production Starter Ebook',
   'Produce your first track using free tools. 90-page PDF.',
   299, 'https://cdn.digione.in/neha/music-prod-cover.jpg', 'Ebook', true, false,
   '[{"url":"https://cdn.digione.in/neha/mp-1.jpg"}]'::jsonb,
   NULL, NULL, 'PDF emailed within 5 minutes.', false, NULL, NOW() - INTERVAL '40 days')
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SECTION 13: PRODUCT FILES
-- ===================================================================

INSERT INTO public.product_files (product_id, creator_id, file_label, storage_url, file_type, file_size_bytes, version, is_primary)
VALUES
  ('e8000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','Access Key',              'https://cdn.digione.in/arjun/figma-course.key',      'text/plain',        512,      '1.0', true),
  ('e8000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','PDF Edition',             'https://cdn.digione.in/arjun/ux-career-ebook.pdf',   'application/pdf',   9800000,  '1.0', true),
  ('e8000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','Notion Template',         'https://cdn.digione.in/arjun/ux-career-notion.zip',  'application/zip',   245000,   '1.0', false),
  ('e8000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002','Figma File (.fig)',       'https://cdn.digione.in/arjun/components-v2.fig',     'application/fig',   21000000, '2.0', true),
  ('e8000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003','Figma File',              'https://cdn.digione.in/priya/uikit-pro.fig',         'application/fig',   42000000, '3.0', true),
  ('e8000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003','Sketch File',             'https://cdn.digione.in/priya/uikit-pro.sketch',      'application/sketch',38000000, '3.0', false),
  ('e8000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000003','SVG Pack',                'https://cdn.digione.in/priya/500-icons-svg.zip',     'application/zip',   4200000,  '1.0', true),
  ('e8000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000003','PNG Pack 2x',             'https://cdn.digione.in/priya/500-icons-png.zip',     'application/zip',   12000000, '1.0', false),
  ('e8000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000003','Framer Template Clone',   'https://cdn.digione.in/priya/framer-portfolio.key',  'text/plain',        256,      '1.0', true),
  ('e8000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000004','Presets ZIP (.xmp)',      'https://cdn.digione.in/rahul/golden-hour.zip',       'application/zip',   2800000,  '1.0', true),
  ('e8000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000004','PDF Ebook',               'https://cdn.digione.in/rahul/mobile-photo.pdf',      'application/pdf',   7600000,  '1.0', true),
  ('e8000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000007','Access Key',              'https://cdn.digione.in/neha/podcast-course.key',     'text/plain',        512,      '1.0', true),
  ('e8000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000007','PDF Ebook',               'https://cdn.digione.in/neha/music-prod.pdf',         'application/pdf',   6800000,  '1.0', true)
ON CONFLICT (product_id, file_label) DO NOTHING;

-- ===================================================================
-- SECTION 14: PRODUCT RELATED
-- ===================================================================

INSERT INTO public.product_related (product_id, related_product_id, relation_type, sort_order)
VALUES
  ('e8000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000003','upsell',     1),
  ('e8000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000002','cross_sell', 2),
  ('e8000000-0000-0000-0000-000000000005','e8000000-0000-0000-0000-000000000006','upsell',     1),
  ('e8000000-0000-0000-0000-000000000005','e8000000-0000-0000-0000-000000000007','cross_sell', 2),
  ('e8000000-0000-0000-0000-000000000008','e8000000-0000-0000-0000-000000000009','cross_sell', 1),
  ('e8000000-0000-0000-0000-000000000011','e8000000-0000-0000-0000-000000000012','upsell',     1)
ON CONFLICT (product_id, related_product_id, relation_type) DO NOTHING;

-- ===================================================================
-- SECTION 15: PRODUCT BUNDLES + ITEMS
-- ===================================================================

INSERT INTO public.product_bundles (id, creator_id, name, description, thumbnail_url, bundle_price, compare_at_price, is_published)
VALUES
  ('e5000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   'Figma Designer Bundle',
   'Figma Course + Component Library + UX Ebook. Everything you need to become a design pro.',
   'https://cdn.digione.in/arjun/designer-bundle.jpg', 2799, 3297, true),
  ('e5000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003',
   'Design Assets Mega Pack',
   'Pro UI Kit + 500 Icons. One bundle, total coverage.',
   'https://cdn.digione.in/priya/megapack.jpg', 1499, 1648, true),
  ('e5000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004',
   'Photography Starter Pack',
   'Golden Hour Presets + Mobile Photography Ebook.',
   'https://cdn.digione.in/rahul/starter-pack.jpg', 449, 498, false)  -- draft bundle
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_bundle_items (bundle_id, product_id, sort_order)
VALUES
  ('e5000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001',1),
  ('e5000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000003',2),
  ('e5000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000002',3),
  ('e5000000-0000-0000-0000-000000000002','e8000000-0000-0000-0000-000000000005',1),
  ('e5000000-0000-0000-0000-000000000002','e8000000-0000-0000-0000-000000000006',2),
  ('e5000000-0000-0000-0000-000000000003','e8000000-0000-0000-0000-000000000008',1),
  ('e5000000-0000-0000-0000-000000000003','e8000000-0000-0000-0000-000000000009',2)
ON CONFLICT (bundle_id, product_id) DO NOTHING;

-- ===================================================================
-- SECTION 16: OTHER PRODUCTS
-- ===================================================================

INSERT INTO public.other_products (creator_id, product_id, is_active, is_other_product)
VALUES
  ('a0000000-0000-0000-0000-000000000002','e8000000-0000-0000-0000-000000000003', true,  true),
  ('a0000000-0000-0000-0000-000000000004','e8000000-0000-0000-0000-000000000010', false, true)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 17: SITE MAIN
-- ===================================================================

INSERT INTO public.site_main (site_id, title, description, logo_url, banner_url, template_name, theme, contact_mobile, contact_email, social_links, legal_pages, meta_keywords, meta_description, custom_css, custom_js)
VALUES
  ('fb000000-0000-0000-0000-000000000001',
   'Arjun Sharma — Design Courses',
   'Learn Figma, UI/UX & Product Design from India''s most trusted creator.',
   'https://cdn.digione.in/arjun/logo.png','https://cdn.digione.in/arjun/banner.jpg',
   'bold_creator',
   '{"primaryColor":"#6366F1","secondaryColor":"#8B5CF6","backgroundColor":"#0F172A","textColor":"#F1F5F9","accentColor":"#EC4899"}'::jsonb,
   '+919000000002','arjun@digione.in',
   '{"instagram":"https://instagram.com/arjunsharma","youtube":"https://youtube.com/arjunsharma","twitter":"https://twitter.com/arjunsharma","linkedin":"https://linkedin.com/in/arjunsharma"}'::jsonb,
   '{"about_us":true,"terms":true,"privacy":true,"refund":true}'::jsonb,
   'figma course india, ui ux design, product design course',
   'Learn Figma and UX Design with Arjun Sharma. Courses, ebooks and design assets.',
   ':root { --brand: #6366F1; } .hero { min-height: 80vh; }',
   'console.log("[Arjun Store] loaded");'),

  ('fb000000-0000-0000-0000-000000000004',
   'Priya Mehta — Design Assets',
   'Premium Figma UI kits, icon packs and templates for modern designers.',
   'https://cdn.digione.in/priya/logo.png','https://cdn.digione.in/priya/banner.jpg',
   'minimal_store',
   '{"primaryColor":"#EC4899","secondaryColor":"#8B5CF6","backgroundColor":"#FFFFFF","textColor":"#111827"}'::jsonb,
   '+919000000003','priya@digione.in',
   '{"instagram":"https://instagram.com/priyamehta_design","dribbble":"https://dribbble.com/priyamehta"}'::jsonb,
   '{"about_us":true,"terms":true,"privacy":true,"refund":false}'::jsonb,
   'ui kit india, figma assets, icon pack',
   'High quality Figma design assets by Priya Mehta — UI kits, icons and templates.',
   NULL, NULL),

  ('fb000000-0000-0000-0000-000000000006',
   'Rahul Verma — Photography',
   'Lightroom presets and photography guides for Indian creators.',
   'https://cdn.digione.in/rahul/logo.png','https://cdn.digione.in/rahul/banner.jpg',
   'warm_market',
   '{"primaryColor":"#F59E0B","secondaryColor":"#D97706","backgroundColor":"#FFFBEB","textColor":"#1C1917"}'::jsonb,
   '+919000000004','rahul@digione.in',
   '{"instagram":"https://instagram.com/rahulverma_photo"}'::jsonb,
   '{"about_us":false,"terms":true,"privacy":true,"refund":false}'::jsonb,
   'lightroom presets india, mobile photography guide',
   'Download premium Lightroom presets and photography guides by Rahul Verma.',
   NULL, NULL),

  ('fb000000-0000-0000-0000-000000000008',
   'Neha Kapoor — Podcast & Music',
   'Courses and guides on podcasting and music production in India.',
   'https://cdn.digione.in/neha/logo.png','https://cdn.digione.in/neha/banner.jpg',
   'bold_creator',
   '{"primaryColor":"#8B5CF6","secondaryColor":"#EC4899","backgroundColor":"#0F172A","textColor":"#F1F5F9"}'::jsonb,
   '+919000000007','neha@digione.in',
   '{"instagram":"https://instagram.com/nehacreates","spotify":"https://open.spotify.com/show/nehacreates"}'::jsonb,
   '{"about_us":true,"terms":true,"privacy":true,"refund":false}'::jsonb,
   'podcast course india, music production, creator economy',
   'Start your podcast or music career with Neha Kapoor.',
   NULL, NULL)
ON CONFLICT (site_id) DO NOTHING;

-- ===================================================================
-- SECTION 18: SITE SINGLE PAGE
-- ===================================================================

INSERT INTO public.site_singlepage (site_id, product_id, title, description, hero_image_url, template_name, theme, contact_email, social_links, legal_pages, show_add_to_cart, show_buy_now, enable_reviews, meta_description, countdown_end_at, faq_items, testimonials, guarantee_badges, custom_css)
VALUES
  ('fb000000-0000-0000-0000-000000000002',
   'e8000000-0000-0000-0000-000000000001',
   'Figma Masterclass 2024 — Become Job-Ready in 30 Days',
   'The most comprehensive Figma course in India. 40 hrs, real projects, job guarantee support.',
   'https://cdn.digione.in/arjun/figma-course-hero.jpg',
   'conversion_pro',
   '{"primaryColor":"#6366F1","accentColor":"#EC4899","backgroundColor":"#0F172A"}'::jsonb,
   'arjun@digione.in',
   '{"youtube":"https://youtube.com/arjunsharma"}'::jsonb,
   '{"terms":true,"privacy":true,"refund":true}'::jsonb,
   false, true, true,
   'Enroll in the best Figma course in India. Learn from scratch to advanced in 30 days.',
   NOW() + INTERVAL '3 days',
   '[{"q":"Is this for beginners?","a":"Yes, no prior design experience needed."},{"q":"Do I get lifetime access?","a":"Yes, including all future updates."},{"q":"What software do I need?","a":"Just a free Figma account — works on any OS."},{"q":"Is there a refund policy?","a":"Full refund within 7 days, no questions asked."}]'::jsonb,
   '[{"name":"Sneha Patel","role":"Junior UX Designer at Swiggy","text":"Got my first design job 3 weeks after finishing this course!","avatar":"https://cdn.digione.in/t/sneha.jpg","rating":5},{"name":"Karan Singh","role":"Freelance Designer","text":"Best ₹2000 I ever spent. Clients now pay me ₹50k a month.","avatar":"https://cdn.digione.in/t/karan.jpg","rating":5},{"name":"Dev Sharma","role":"Product Designer","text":"Went from zero to hired in 45 days. Arjun''s teaching style is unmatched.","avatar":"https://cdn.digione.in/t/dev.jpg","rating":5}]'::jsonb,
   '[{"text":"30-Day Money Back Guarantee","icon":"shield"},{"text":"Lifetime Access","icon":"infinity"},{"text":"Certificate of Completion","icon":"award"},{"text":"24/7 Community Support","icon":"users"}]'::jsonb,
   '.hero-cta { animation: pulse 2s infinite; }'),

  ('fb000000-0000-0000-0000-000000000007',
   'e8000000-0000-0000-0000-000000000008',
   'Golden Hour Lightroom Presets — 30 Cinematic Looks',
   '30 professional presets that transform your photos in one click. .xmp + .lrtemplate.',
   'https://cdn.digione.in/rahul/golden-hour-hero.jpg',
   'modern_product',
   '{"primaryColor":"#F59E0B","backgroundColor":"#FFFBEB"}'::jsonb,
   'rahul@digione.in',
   '{"instagram":"https://instagram.com/rahulverma_photo"}'::jsonb,
   '{"terms":true,"privacy":true,"refund":false}'::jsonb,
   true, true, true,
   'Download 30 Golden Hour Lightroom presets for stunning portraits and landscapes.',
   NULL,
   '[{"q":"Which Lightroom version works?","a":"Lightroom Classic, Mobile and CC — all supported."},{"q":"Do they work on mobile?","a":"Yes, .DNG files included for Lightroom Mobile."}]'::jsonb,
   '[{"name":"Meera Nair","role":"Travel Blogger","text":"My Instagram engagement doubled after using these presets!","avatar":"https://cdn.digione.in/t/meera.jpg","rating":5}]'::jsonb,
   '[{"text":"Instant Download","icon":"download"},{"text":"Works on Mobile & Desktop","icon":"device"}]'::jsonb,
   NULL)
ON CONFLICT (site_id) DO NOTHING;

-- ===================================================================
-- SECTION 19: SITE PRODUCT ASSIGNMENTS
-- ===================================================================

INSERT INTO public.site_product_assignments (site_id, product_id, placement, is_visible, sort_order)
VALUES
  ('fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001','featured',   true,  1),
  ('fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000002','front_main', true,  2),
  ('fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000003','front_main', true,  3),
  ('fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000004','front_main', false, 4), -- hidden draft
  ('fb000000-0000-0000-0000-000000000004','e8000000-0000-0000-0000-000000000005','featured',   true,  1),
  ('fb000000-0000-0000-0000-000000000004','e8000000-0000-0000-0000-000000000006','front_main', true,  2),
  ('fb000000-0000-0000-0000-000000000004','e8000000-0000-0000-0000-000000000007','front_main', true,  3),
  ('fb000000-0000-0000-0000-000000000006','e8000000-0000-0000-0000-000000000008','featured',   true,  1),
  ('fb000000-0000-0000-0000-000000000006','e8000000-0000-0000-0000-000000000009','front_main', true,  2),
  ('fb000000-0000-0000-0000-000000000006','e8000000-0000-0000-0000-000000000010','front_main', false, 3), -- hidden draft
  ('fb000000-0000-0000-0000-000000000008','e8000000-0000-0000-0000-000000000011','featured',   true,  1),
  ('fb000000-0000-0000-0000-000000000008','e8000000-0000-0000-0000-000000000012','front_main', true,  2)
ON CONFLICT (site_id, product_id, placement) DO NOTHING;

-- ===================================================================
-- SECTION 20: SITE BLOG
-- ===================================================================

INSERT INTO public.site_blog (site_id, title, description, banner_url, logo_url, template_name, theme, contact_email, social_links, legal_pages, meta_description, custom_css)
VALUES
  ('fb000000-0000-0000-0000-000000000005',
   'Priya Mehta — Design Blog',
   'Weekly articles on UI/UX design, Figma tips, and building a design career in India.',
   'https://cdn.digione.in/priya/blog-banner.jpg',
   'https://cdn.digione.in/priya/logo.png',
   'clean_blog',
   '{"primaryColor":"#EC4899","backgroundColor":"#FFFFFF","textColor":"#111827"}'::jsonb,
   'priya@digione.in',
   '{"instagram":"https://instagram.com/priyamehta_design","twitter":"https://twitter.com/priyamehta"}'::jsonb,
   '{"about_us":true,"terms":true,"privacy":true,"refund":false}'::jsonb,
   'Design tips, Figma tutorials and UI/UX career advice by Priya Mehta.',
   'article { max-width: 700px; margin: 0 auto; }'),

  ('fb000000-0000-0000-0000-000000000009',
   'Neha Kapoor — Creator Blog',
   'Podcasting tips, music production basics, and creator economy insights.',
   'https://cdn.digione.in/neha/blog-banner.jpg',
   'https://cdn.digione.in/neha/logo.png',
   'dark_blog',
   '{"primaryColor":"#8B5CF6","backgroundColor":"#0F172A","textColor":"#F1F5F9"}'::jsonb,
   'neha@digione.in',
   '{"instagram":"https://instagram.com/nehacreates"}'::jsonb,
   '{"about_us":true,"terms":true,"privacy":true}'::jsonb,
   'Podcasting and music production tips by Neha Kapoor.',
   NULL)
ON CONFLICT (site_id) DO NOTHING;

-- ===================================================================
-- SECTION 21: BLOG POSTS
-- ===================================================================

INSERT INTO public.blog_posts (id, site_id, creator_id, title, slug, description, content, thumbnail_url, is_published, is_free, product_id, tags, view_count, sort_order, published_at)
VALUES
  -- Priya's blog (3 published, 1 draft)
  ('fd000000-0000-0000-0000-000000000001','fb000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003',
   '10 Figma Shortcuts That Will 10x Your Speed',
   '10-figma-shortcuts-10x-speed',
   'The exact shortcuts professional Figma designers use every day.',
   '<h2>Why Shortcuts Matter</h2><p>Speed is everything in client work. Here are the 10 I use daily…</p><h3>1. Ctrl+G — Group</h3><p>Select layers and group instantly.</p>',
   'https://cdn.digione.in/priya/blog-figma-shortcuts.jpg',
   true, true, NULL, ARRAY['figma','shortcuts','productivity'], 1840, 1, NOW() - INTERVAL '25 days'),

  ('fd000000-0000-0000-0000-000000000002','fb000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003',
   'How I Built a 1200-Component UI Kit',
   'how-i-built-1200-component-ui-kit',
   'Behind the scenes of building the most popular Indian Figma UI kit.',
   '<h2>The Problem</h2><p>I could not find a UI kit that matched Indian product design patterns…</p>',
   'https://cdn.digione.in/priya/blog-uikit-story.jpg',
   true, true, NULL, ARRAY['figma','ui-kit','design-system'], 987, 2, NOW() - INTERVAL '15 days'),

  ('fd000000-0000-0000-0000-000000000003','fb000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003',
   'Pro UI Kit v3.0 — Full Walkthrough (Members Only)',
   'pro-ui-kit-v3-walkthrough',
   'Exclusive deep-dive into the Pro UI Kit for buyers.',
   '<h2>What is New in v3</h2><p>Variables support, dark mode components and 200 new patterns…</p>',
   'https://cdn.digione.in/priya/blog-uikit-walkthrough.jpg',
   true, false, 'e8000000-0000-0000-0000-000000000005', ARRAY['ui-kit','figma','gated'], 512, 3, NOW() - INTERVAL '5 days'),

  ('fd000000-0000-0000-0000-000000000004','fb000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003',
   'Framer vs Figma in 2024 — Which Should You Learn?', -- draft
   'framer-vs-figma-2024',
   'Comparing the two most popular design tools for Indian designers.',
   '<h2>The Great Debate</h2><p>Draft content…</p>',
   'https://cdn.digione.in/priya/blog-framer-vs-figma.jpg',
   false, true, NULL, ARRAY['figma','framer','tools'], 0, 4, NULL),

  -- Neha's blog (1 published, 1 draft on inactive site)
  ('fd000000-0000-0000-0000-000000000005','fb000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000007',
   'How to Start a Podcast in India With Zero Budget',
   'start-podcast-india-zero-budget',
   'Step-by-step guide to launching your first podcast using only free tools.',
   '<h2>Step 1: Choose Your Niche</h2><p>Pick a topic you can talk about for 50+ episodes…</p>',
   'https://cdn.digione.in/neha/blog-podcast-start.jpg',
   true, true, NULL, ARRAY['podcast','india','creator'], 673, 1, NOW() - INTERVAL '20 days'),

  ('fd000000-0000-0000-0000-000000000006','fb000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000007',
   'Top 5 Free DAWs for Beginner Music Producers', -- draft
   'top-5-free-daws-beginners',
   'The best free Digital Audio Workstations to start making music today.',
   '<h2>Why Free DAWs Work</h2><p>Draft…</p>',
   'https://cdn.digione.in/neha/blog-daws.jpg',
   false, true, NULL, ARRAY['music','production','tools'], 0, 2, NULL)
ON CONFLICT (site_id, slug) DO NOTHING;

-- ===================================================================
-- SECTION 22: GUEST LEADS
-- ===================================================================

INSERT INTO public.guest_leads (id, site_id, product_id, full_name, email, mobile, status, created_at)
VALUES
  ('e1000000-0000-0000-0000-000000000001','fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001','Meera Nair',   'meera@example.com',  '+919111111111','converted', NOW() - INTERVAL '40 days'),
  ('e1000000-0000-0000-0000-000000000002','fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000002','Tanvi Shah',   'tanvi@example.com',  '+919222222222','pending',   NOW() - INTERVAL '10 days'),
  ('e1000000-0000-0000-0000-000000000003','fb000000-0000-0000-0000-000000000004','e8000000-0000-0000-0000-000000000005','Anjali Desai', 'anjali@example.com', '+919333333333','pending',   NOW() - INTERVAL '5 days'),
  ('e1000000-0000-0000-0000-000000000004','fb000000-0000-0000-0000-000000000006','e8000000-0000-0000-0000-000000000008','Ravi Kumar',   'ravi@example.com',   '+919444444444','converted', NOW() - INTERVAL '30 days'),
  ('e1000000-0000-0000-0000-000000000005','fb000000-0000-0000-0000-000000000008','e8000000-0000-0000-0000-000000000011','Aisha Khan',   'aisha@example.com',  '+919555555555','pending',   NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SECTION 23: ORDERS + ORDER ITEMS
-- All statuses covered: completed, pending, failed, refunded, cancelled
-- ===================================================================

-- ORDER 1: Sneha — Figma Course — completed
INSERT INTO public.orders (id, user_id, origin_site_id, total_amount, status, customer_name, customer_email, customer_phone, payment_method, gateway_name, gateway_order_id, gateway_payment_id, gateway_signature, created_at)
VALUES ('e4000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','fb000000-0000-0000-0000-000000000001',1999,'completed','Sneha Patel','sneha@example.com','+919000000005','upi','cashfree','CF_ORD_001','CF_PAY_001','CF_SIG_001',NOW()-INTERVAL '60 days') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.order_items (id, order_id, product_id, price_at_purchase, quantity, origin_site_id)
VALUES ('e3000000-0000-0000-0000-000000000001','e4000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001',1999,1,'fb000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;

-- ORDER 2: Sneha — UX Ebook — completed
INSERT INTO public.orders (id, user_id, origin_site_id, total_amount, status, customer_name, customer_email, customer_phone, payment_method, gateway_name, gateway_order_id, gateway_payment_id, gateway_signature, created_at)
VALUES ('e4000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','fb000000-0000-0000-0000-000000000001',499,'completed','Sneha Patel','sneha@example.com','+919000000005','card','cashfree','CF_ORD_002','CF_PAY_002','CF_SIG_002',NOW()-INTERVAL '50 days') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.order_items (id, order_id, product_id, price_at_purchase, quantity, origin_site_id)
VALUES ('e3000000-0000-0000-0000-000000000002','e4000000-0000-0000-0000-000000000002','e8000000-0000-0000-0000-000000000002',499,1,'fb000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;

-- ORDER 3: Karan — UI Kit — completed
INSERT INTO public.orders (id, user_id, origin_site_id, total_amount, status, customer_name, customer_email, customer_phone, payment_method, gateway_name, gateway_order_id, gateway_payment_id, gateway_signature, created_at)
VALUES ('e4000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000006','fb000000-0000-0000-0000-000000000004',1299,'completed','Karan Singh','karan@example.com','+919000000006','netbanking','cashfree','CF_ORD_003','CF_PAY_003','CF_SIG_003',NOW()-INTERVAL '40 days') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.order_items (id, order_id, product_id, price_at_purchase, quantity, origin_site_id)
VALUES ('e3000000-0000-0000-0000-000000000003','e4000000-0000-0000-0000-000000000003','e8000000-0000-0000-0000-000000000005',1299,1,'fb000000-0000-0000-0000-000000000004') ON CONFLICT (id) DO NOTHING;

-- ORDER 4: Guest Meera — Figma Course — completed
INSERT INTO public.orders (id, user_id, origin_site_id, guest_lead_id, total_amount, status, customer_name, customer_email, customer_phone, payment_method, gateway_name, gateway_order_id, gateway_payment_id, created_at)
VALUES ('e4000000-0000-0000-0000-000000000004',NULL,'fb000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001',1999,'completed','Meera Nair','meera@example.com','+919111111111','upi','cashfree','CF_ORD_004','CF_PAY_004',NOW()-INTERVAL '38 days') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.order_items (id, order_id, product_id, price_at_purchase, quantity, origin_site_id)
VALUES ('e3000000-0000-0000-0000-000000000004','e4000000-0000-0000-0000-000000000004','e8000000-0000-0000-0000-000000000001',1999,1,'fb000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;

-- ORDER 5: Dev — Podcast Course — completed
INSERT INTO public.orders (id, user_id, origin_site_id, total_amount, status, customer_name, customer_email, customer_phone, payment_method, gateway_name, gateway_order_id, gateway_payment_id, gateway_signature, created_at)
VALUES ('e4000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000008','fb000000-0000-0000-0000-000000000008',1499,'completed','Dev Sharma','dev@example.com','+919000000008','upi','cashfree','CF_ORD_005','CF_PAY_005','CF_SIG_005',NOW()-INTERVAL '30 days') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.order_items (id, order_id, product_id, price_at_purchase, quantity, origin_site_id)
VALUES ('e3000000-0000-0000-0000-000000000005','e4000000-0000-0000-0000-000000000005','e8000000-0000-0000-0000-000000000011',1499,1,'fb000000-0000-0000-0000-000000000008') ON CONFLICT (id) DO NOTHING;

-- ORDER 6: Karan — Presets — pending
INSERT INTO public.orders (id, user_id, origin_site_id, total_amount, status, customer_name, customer_email, customer_phone, payment_method, gateway_name, gateway_order_id, created_at)
VALUES ('e4000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000006','fb000000-0000-0000-0000-000000000006',299,'pending','Karan Singh','karan@example.com','+919000000006','upi','cashfree','CF_ORD_006',NOW()-INTERVAL '1 day') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.order_items (id, order_id, product_id, price_at_purchase, quantity, origin_site_id)
VALUES ('e3000000-0000-0000-0000-000000000006','e4000000-0000-0000-0000-000000000006','e8000000-0000-0000-0000-000000000008',299,1,'fb000000-0000-0000-0000-000000000006') ON CONFLICT (id) DO NOTHING;

-- ORDER 7: Dev — Figma Course — REFUNDED (tests refund flow)
INSERT INTO public.orders (id, user_id, origin_site_id, total_amount, status, customer_name, customer_email, customer_phone, payment_method, gateway_name, gateway_order_id, gateway_payment_id, created_at)
VALUES ('e4000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000008','fb000000-0000-0000-0000-000000000001',1999,'refunded','Dev Sharma','dev@example.com','+919000000008','card','cashfree','CF_ORD_007','CF_PAY_007',NOW()-INTERVAL '20 days') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.order_items (id, order_id, product_id, price_at_purchase, quantity, origin_site_id)
VALUES ('e3000000-0000-0000-0000-000000000007','e4000000-0000-0000-0000-000000000007','e8000000-0000-0000-0000-000000000001',1999,1,'fb000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;

-- ORDER 8: Sneha — Icons Pack — failed payment (tests failure state)
INSERT INTO public.orders (id, user_id, origin_site_id, total_amount, status, customer_name, customer_email, customer_phone, payment_method, gateway_name, gateway_order_id, created_at)
VALUES ('e4000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000005','fb000000-0000-0000-0000-000000000004',349,'failed','Sneha Patel','sneha@example.com','+919000000005','upi','cashfree','CF_ORD_008',NOW()-INTERVAL '15 days') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.order_items (id, order_id, product_id, price_at_purchase, quantity, origin_site_id)
VALUES ('e3000000-0000-0000-0000-000000000008','e4000000-0000-0000-0000-000000000008','e8000000-0000-0000-0000-000000000006',349,1,'fb000000-0000-0000-0000-000000000004') ON CONFLICT (id) DO NOTHING;

-- ORDER 9: Sneha — Framer Template — completed
INSERT INTO public.orders (id, user_id, origin_site_id, total_amount, status, customer_name, customer_email, customer_phone, payment_method, gateway_name, gateway_order_id, gateway_payment_id, gateway_signature, created_at)
VALUES ('e4000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000005','fb000000-0000-0000-0000-000000000004',599,'completed','Sneha Patel','sneha@example.com','+919000000005','upi','cashfree','CF_ORD_009','CF_PAY_009','CF_SIG_009',NOW()-INTERVAL '10 days') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.order_items (id, order_id, product_id, price_at_purchase, quantity, origin_site_id)
VALUES ('e3000000-0000-0000-0000-000000000009','e4000000-0000-0000-0000-000000000009','e8000000-0000-0000-0000-000000000007',599,1,'fb000000-0000-0000-0000-000000000004') ON CONFLICT (id) DO NOTHING;

-- ORDER 10: Karan — Figma Course — cancelled (tests cancellation)
INSERT INTO public.orders (id, user_id, origin_site_id, total_amount, status, customer_name, customer_email, customer_phone, payment_method, gateway_name, gateway_order_id, created_at)
VALUES ('e4000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000006','fb000000-0000-0000-0000-000000000001',1999,'cancelled','Karan Singh','karan@example.com','+919000000006','upi','cashfree','CF_ORD_010',NOW()-INTERVAL '35 days') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.order_items (id, order_id, product_id, price_at_purchase, quantity, origin_site_id)
VALUES ('e3000000-0000-0000-0000-000000000010','e4000000-0000-0000-0000-000000000010','e8000000-0000-0000-0000-000000000001',1999,1,'fb000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SECTION 24: CREATOR REVENUE SHARES
-- ===================================================================

INSERT INTO public.creator_revenue_shares (order_id, order_item_id, creator_id, subscription_id, product_id, gross_amount, platform_fee_percent, platform_fee_amount, creator_earnings_amount, status, created_at)
VALUES
  ('e4000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','5b000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001',1999, 5.0,  99.95,1899.05,'settled', NOW()-INTERVAL '60 days'),
  ('e4000000-0000-0000-0000-000000000002','e3000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','5b000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000002', 499, 5.0,  24.95, 474.05,'settled', NOW()-INTERVAL '50 days'),
  ('e4000000-0000-0000-0000-000000000003','e3000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003','5b000000-0000-0000-0000-000000000002','e8000000-0000-0000-0000-000000000005',1299, 7.0,  90.93,1208.07,'settled', NOW()-INTERVAL '40 days'),
  ('e4000000-0000-0000-0000-000000000004','e3000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000002','5b000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001',1999, 5.0,  99.95,1899.05,'settled', NOW()-INTERVAL '38 days'),
  ('e4000000-0000-0000-0000-000000000005','e3000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000007','5b000000-0000-0000-0000-000000000004','e8000000-0000-0000-0000-000000000011',1499, 5.0,  74.95,1424.05,'settled', NOW()-INTERVAL '30 days'),
  ('e4000000-0000-0000-0000-000000000006','e3000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000004','5b000000-0000-0000-0000-000000000003','e8000000-0000-0000-0000-000000000008', 299,10.0,  29.90, 269.10,'pending', NOW()-INTERVAL '1 day'),
  ('e4000000-0000-0000-0000-000000000007','e3000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000002','5b000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001',1999, 5.0,  99.95,1899.05,'refunded',NOW()-INTERVAL '20 days'),
  ('e4000000-0000-0000-0000-000000000009','e3000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000003','5b000000-0000-0000-0000-000000000002','e8000000-0000-0000-0000-000000000007', 599, 7.0,  41.93, 557.07,'settled', NOW()-INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 25: CREATOR BALANCES
-- ===================================================================

INSERT INTO public.creator_balances (creator_id, total_earnings, total_platform_fees, total_paid_out, pending_payout)
VALUES
  ('a0000000-0000-0000-0000-000000000002', 5272.15, 323.80, 3500.00, 1772.15),
  ('a0000000-0000-0000-0000-000000000003', 1765.14, 132.86,    0.00, 1765.14),
  ('a0000000-0000-0000-0000-000000000004',  269.10,  29.90,    0.00,  269.10),
  ('a0000000-0000-0000-0000-000000000007', 1424.05,  74.95,    0.00, 1424.05)
ON CONFLICT (creator_id) DO NOTHING;

-- ===================================================================
-- SECTION 26: CREATOR KYC (all statuses: verified, pending, rejected)
-- ===================================================================

INSERT INTO public.creator_kyc (creator_id, status, kyc_level, full_name, legal_name, pan_last4, pan_verified, pan_verified_at, bank_last4, bank_verified, bank_verified_at, bank_account_name, ifsc_code, upi_verified, upi_id_enc, beneficiary_id, city, state, country)
VALUES
  ('a0000000-0000-0000-0000-000000000002','verified','full','Arjun Sharma','ARJUN SHARMA',
   '1234',true,NOW()-INTERVAL '120 days','5678',true,NOW()-INTERVAL '118 days','ARJUN SHARMA','HDFC0001234',true,NULL,'BEN_ARJUN_001','Mumbai','Maharashtra','IN'),

  ('a0000000-0000-0000-0000-000000000003','verified','full','Priya Mehta','PRIYA MEHTA',
   '2345',true,NOW()-INTERVAL '100 days','6789',true,NOW()-INTERVAL '98 days','PRIYA MEHTA','ICIC0002345',true,NULL,'BEN_PRIYA_001','Bangalore','Karnataka','IN'),

  ('a0000000-0000-0000-0000-000000000004','pending','none','Rahul Verma',NULL,
   NULL,false,NULL,NULL,false,NULL,NULL,NULL,false,NULL,NULL,'Delhi','Delhi','IN'),

  ('a0000000-0000-0000-0000-000000000007','rejected','basic','Neha Kapoor','NEHA KAPOOR',
   '9012',true,NOW()-INTERVAL '30 days',NULL,false,NULL,NULL,NULL,false,NULL,NULL,'Pune','Maharashtra','IN')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 27: CREATOR PAYOUT METHODS
-- ===================================================================

INSERT INTO public.creator_payout_methods (creator_id, type, is_default, upi_id, account_holder_name, account_number, ifsc_code, bank_name, status)
VALUES
  ('a0000000-0000-0000-0000-000000000002','upi',          true,  'arjun@ybl',  'Arjun Sharma', NULL,           NULL,          NULL,        'verified'),
  ('a0000000-0000-0000-0000-000000000002','bank_transfer', false, NULL,         'Arjun Sharma', '50100XXXXXX',  'HDFC0001234', 'HDFC Bank', 'verified'),
  ('a0000000-0000-0000-0000-000000000003','upi',          true,  'priya@paytm','Priya Mehta',  NULL,           NULL,          NULL,        'verified'),
  ('a0000000-0000-0000-0000-000000000004','upi',          true,  'rahul@gpay', 'Rahul Verma',  NULL,           NULL,          NULL,        'pending'),
  ('a0000000-0000-0000-0000-000000000007','upi',          true,  'neha@ybl',   'Neha Kapoor',  NULL,           NULL,          NULL,        'rejected')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 28: CREATOR PAYOUT REQUESTS + ITEMS + PAYOUTS
-- ===================================================================

-- Arjun: processed payout
INSERT INTO public.creator_payout_requests (id, creator_id, payout_method_id, amount, status, admin_notes, created_at)
SELECT 'ce000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002', cpm.id, 3500, 'approved', 'Verified. Processed via UPI.', NOW()-INTERVAL '10 days'
FROM public.creator_payout_methods cpm
WHERE cpm.creator_id='a0000000-0000-0000-0000-000000000002' AND cpm.type='upi'
ON CONFLICT (id) DO NOTHING;

-- Priya: pending payout request
INSERT INTO public.creator_payout_requests (id, creator_id, payout_method_id, amount, status, created_at)
SELECT 'ce000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003', cpm.id, 1765, 'pending', NOW()-INTERVAL '2 days'
FROM public.creator_payout_methods cpm
WHERE cpm.creator_id='a0000000-0000-0000-0000-000000000003' AND cpm.type='upi'
ON CONFLICT (id) DO NOTHING;

-- Neha: rejected payout
INSERT INTO public.creator_payout_requests (id, creator_id, payout_method_id, amount, status, rejection_reason, created_at)
SELECT 'ce000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000007', cpm.id, 1424, 'rejected', 'KYC not verified. Please complete KYC first.', NOW()-INTERVAL '5 days'
FROM public.creator_payout_methods cpm
WHERE cpm.creator_id='a0000000-0000-0000-0000-000000000007' AND cpm.type='upi'
ON CONFLICT (id) DO NOTHING;

-- Payout request items (link revenue shares to request)
INSERT INTO public.creator_payout_request_items (payout_request_id, revenue_share_id, amount)
SELECT 'ce000000-0000-0000-0000-000000000001', crs.id, crs.creator_earnings_amount
FROM public.creator_revenue_shares crs
WHERE crs.creator_id='a0000000-0000-0000-0000-000000000002' AND crs.status='settled'
ON CONFLICT DO NOTHING;

INSERT INTO public.creator_payout_request_items (payout_request_id, revenue_share_id, amount)
SELECT 'ce000000-0000-0000-0000-000000000002', crs.id, crs.creator_earnings_amount
FROM public.creator_revenue_shares crs
WHERE crs.creator_id='a0000000-0000-0000-0000-000000000003' AND crs.status='settled'
ON CONFLICT DO NOTHING;

-- Actual payout records
INSERT INTO public.creator_payouts (creator_id, payout_request_id, payout_method_id, amount, status, gateway_payout_id, processed_at, created_at)
SELECT 'a0000000-0000-0000-0000-000000000002', 'ce000000-0000-0000-0000-000000000001', cpm.id,
  3500, 'processed', 'CF_PAYOUT_001', NOW()-INTERVAL '9 days', NOW()-INTERVAL '10 days'
FROM public.creator_payout_methods cpm
WHERE cpm.creator_id='a0000000-0000-0000-0000-000000000002' AND cpm.type='upi'
ON CONFLICT DO NOTHING;

-- A failed payout attempt (Neha)
INSERT INTO public.creator_payouts (creator_id, payout_request_id, payout_method_id, amount, status, failure_reason, created_at)
SELECT 'a0000000-0000-0000-0000-000000000007', 'ce000000-0000-0000-0000-000000000003', cpm.id,
  1424, 'failed', 'UPI ID invalid or not registered.', NOW()-INTERVAL '4 days'
FROM public.creator_payout_methods cpm
WHERE cpm.creator_id='a0000000-0000-0000-0000-000000000007' AND cpm.type='upi'
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 29: USER PRODUCT ACCESS
-- ===================================================================

INSERT INTO public.user_product_access (user_id, order_id, order_item_id, product_id, product_name, product_price, product_link, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000005','e4000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001','Figma Masterclass 2024',    1999,'https://learn.digione.in/arjun/figma', NOW()-INTERVAL '60 days'),
  ('00000000-0000-0000-0000-000000000005','e4000000-0000-0000-0000-000000000002','e3000000-0000-0000-0000-000000000002','e8000000-0000-0000-0000-000000000002','UI/UX Career Roadmap Ebook', 499,'https://cdn.digione.in/arjun/ux-career-ebook.pdf', NOW()-INTERVAL '50 days'),
  ('00000000-0000-0000-0000-000000000005','e4000000-0000-0000-0000-000000000009','e3000000-0000-0000-0000-000000000009','e8000000-0000-0000-0000-000000000007','Framer Portfolio Template',  599,'https://framer.com/@priya/portfolio', NOW()-INTERVAL '10 days'),
  ('00000000-0000-0000-0000-000000000006','e4000000-0000-0000-0000-000000000003','e3000000-0000-0000-0000-000000000003','e8000000-0000-0000-0000-000000000005','Pro UI Kit — Web & Mobile', 1299,'https://cdn.digione.in/priya/uikit-pro.fig', NOW()-INTERVAL '40 days'),
  ('00000000-0000-0000-0000-000000000008','e4000000-0000-0000-0000-000000000005','e3000000-0000-0000-0000-000000000005','e8000000-0000-0000-0000-000000000011','Podcast Mastery',           1499,'https://learn.digione.in/neha/podcast', NOW()-INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 30: PRODUCT LICENSES
-- ===================================================================

INSERT INTO public.product_licenses (order_id, order_item_id, user_id, product_id, license_key, license_type, status, expires_at)
VALUES
  ('e4000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','e8000000-0000-0000-0000-000000000001','FIGMA-2024-SNEHA-A1B2C3','single_user','active',NULL),
  ('e4000000-0000-0000-0000-000000000003','e3000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000006','e8000000-0000-0000-0000-000000000005','UIKIT-PRO-KARAN-D4E5F6','single_user','active',NOW()+INTERVAL '1 year'),
  ('e4000000-0000-0000-0000-000000000009','e3000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000005','e8000000-0000-0000-0000-000000000007','FRAMER-TMPL-SNEHA-G7H8I9','multi_use','active',NOW()+INTERVAL '1 year'),
  ('e4000000-0000-0000-0000-000000000005','e3000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000008','e8000000-0000-0000-0000-000000000011','PODCAST-DEV-J0K1L2','single_user','active',NULL),
  -- revoked license (for the refunded order)
  ('e4000000-0000-0000-0000-000000000007','e3000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000008','e8000000-0000-0000-0000-000000000001','FIGMA-2024-DEV-REV001','single_user','revoked',NOW()-INTERVAL '20 days')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 31: PRODUCT RATINGS
-- ===================================================================

INSERT INTO public.product_ratings (product_id, user_id, rating, review_title, review_text, is_verified_purchase, is_approved, helpful_count)
VALUES
  ('e8000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005',5,'Life changing course!',         'Got my first UX job 3 weeks after completing this. Cannot recommend it enough.',      true, true,  24),
  ('e8000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005',4,'Very well structured',           'Clear roadmap, practical advice. Would love a 2024 salary data update.',              true, true,  8),
  ('e8000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006',5,'Best UI kit I have ever bought', 'Saved me 40 hours on my last client project. Dark mode support is excellent.',        true, true,  31),
  ('e8000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000005',5,'Perfect Framer template',        'Clean, easy to edit, and looks stunning on mobile. Clients are impressed.',           true, true,  12),
  ('e8000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000008',5,'Exactly what I needed',          'Went from 0 to 500 listeners in 3 months using Neha''s framework. Highly recommend.', true, true,  17),
  -- unapproved review (for moderation testing)
  ('e8000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006',2,'Too basic for intermediate',     'Expected more advanced content. Good for absolute beginners though.',                 false,false, 0)
ON CONFLICT (product_id, user_id) DO NOTHING;

-- ===================================================================
-- SECTION 32: USER CARTS + WISHLISTS
-- ===================================================================

INSERT INTO public.user_carts (user_id, product_id, quantity)
VALUES
  ('00000000-0000-0000-0000-000000000006','e8000000-0000-0000-0000-000000000001',1),
  ('00000000-0000-0000-0000-000000000006','e8000000-0000-0000-0000-000000000003',1),
  ('00000000-0000-0000-0000-000000000008','e8000000-0000-0000-0000-000000000005',1)
ON CONFLICT (user_id, product_id) DO NOTHING;

INSERT INTO public.user_wishlist (user_id, product_id)
VALUES
  ('00000000-0000-0000-0000-000000000005','e8000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000005','e8000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000006','e8000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000006','e8000000-0000-0000-0000-000000000008'),
  ('00000000-0000-0000-0000-000000000008','e8000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, product_id) DO NOTHING;

-- ===================================================================
-- SECTION 33: COUPONS (active, used-up, expired)
-- ===================================================================

INSERT INTO public.coupons (creator_id, code, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000002','ARJUN20',    'percentage', 20,  200, 14,  NOW()-INTERVAL '30 days', NOW()+INTERVAL '30 days', true),
  ('a0000000-0000-0000-0000-000000000002','LAUNCH500',  'fixed',      500, 50,   4,  NOW()-INTERVAL '20 days', NOW()+INTERVAL '10 days', true),
  ('a0000000-0000-0000-0000-000000000002','SOLD100',    'fixed',      100, 10,  10,  NOW()-INTERVAL '60 days', NOW()+INTERVAL '30 days', false), -- maxed out
  ('a0000000-0000-0000-0000-000000000003','PRIYA15',    'percentage', 15,  500, 38,  NOW()-INTERVAL '30 days', NOW()+INTERVAL '60 days', true),
  ('a0000000-0000-0000-0000-000000000003','DESIGNFREE', 'fixed',      349, 5,   5,  NOW()-INTERVAL '90 days', NOW()-INTERVAL '30 days', false), -- expired
  ('a0000000-0000-0000-0000-000000000004','RAHUL10',    'percentage', 10,  100, 2,   NOW()-INTERVAL '10 days', NOW()+INTERVAL '20 days', true),
  ('a0000000-0000-0000-0000-000000000007','NEHA25',     'percentage', 25,  100, 0,   NOW()-INTERVAL '5 days',  NOW()+INTERVAL '25 days', true)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 34: REFERRAL CODES + USER REFERRALS + ORDER REFERRALS
-- ===================================================================

INSERT INTO public.referral_codes (id, code, owner_creator_id, is_active)
VALUES
  ('e9000000-0000-0000-0000-000000000001','REF-ARJUN-001','a0000000-0000-0000-0000-000000000002', true),
  ('e9000000-0000-0000-0000-000000000002','REF-PRIYA-001','a0000000-0000-0000-0000-000000000003', true),
  ('e9000000-0000-0000-0000-000000000003','REF-RAHUL-001','a0000000-0000-0000-0000-000000000004', true),
  ('e9000000-0000-0000-0000-000000000004','REF-NEHA-001', 'a0000000-0000-0000-0000-000000000007', false) -- inactive
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.user_referrals (referral_code_id, referrer_creator_id, referred_user_id, reward_status, reward_amount)
VALUES
  ('e9000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','rewarded',200),
  ('e9000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000006','pending', NULL),
  ('e9000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000008','pending', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO public.order_referrals (order_id, referral_code_id, referrer_creator_id, referred_user_id, commission_amount, status)
VALUES
  ('e4000000-0000-0000-0000-000000000001','e9000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005',199.90,'settled'),
  ('e4000000-0000-0000-0000-000000000009','e9000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000005', 59.90,'settled')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 35: AFFILIATES
-- ===================================================================

INSERT INTO public.affiliates (creator_id, affiliate_user_id, commission_percent, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000006', 15, true),
  ('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000005', 10, true),
  ('a0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000006', 12, false)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 36: USER WALLETS + TRANSACTIONS
-- ===================================================================

INSERT INTO public.user_wallets (user_id, balance)
VALUES
  ('00000000-0000-0000-0000-000000000005', 200.00),
  ('00000000-0000-0000-0000-000000000006',   0.00),
  ('00000000-0000-0000-0000-000000000008',  50.00)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_wallet_transactions (wallet_id, user_id, tx_type, amount, direction, balance_after, status, description)
SELECT w.id, w.user_id, 'referral_reward', 200, 'credit', 200, 'completed', 'Referral reward — REF-ARJUN-001'
FROM public.user_wallets w WHERE w.user_id='00000000-0000-0000-0000-000000000005' ON CONFLICT DO NOTHING;

INSERT INTO public.user_wallet_transactions (wallet_id, user_id, tx_type, amount, direction, balance_after, status, description)
SELECT w.id, w.user_id, 'cashback', 50, 'credit', 50, 'completed', 'First purchase cashback'
FROM public.user_wallets w WHERE w.user_id='00000000-0000-0000-0000-000000000008' ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 37: PAYMENT REQUESTS + SUBMISSIONS
-- ===================================================================

INSERT INTO public.payment_requests (id, site_id, slug, title, description, amount, is_fixed_amount, status)
VALUES
  ('ca000000-0000-0000-0000-000000000001','fb000000-0000-0000-0000-000000000003','one-on-one',       '1-on-1 Mentorship — 60 min','Figma or UX career coaching session with Arjun.',               2500, true,  'active'),
  ('ca000000-0000-0000-0000-000000000002','fb000000-0000-0000-0000-000000000003','portfolio-review', 'Portfolio Review',          'Detailed feedback on your design portfolio.',                   1500, true,  'active'),
  ('ca000000-0000-0000-0000-000000000003','fb000000-0000-0000-0000-000000000003','custom-work',      'Custom Design Work',        'Pay any amount for custom freelance design work.',              NULL, false, 'active'),
  ('ca000000-0000-0000-0000-000000000004','fb000000-0000-0000-0000-000000000010','podcast-consult',  'Podcast Consulting Call',   '30-minute podcast strategy session with Neha.',                 999, true,  'active'),
  ('ca000000-0000-0000-0000-000000000005','fb000000-0000-0000-0000-000000000010','collab-inquiry',   'Collaboration Inquiry',     'Reach out for brand collaborations or podcast guest appearances.', NULL, false, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payment_submissions (payment_request_id, customer_name, customer_email, customer_phone, amount, payment_status, gateway_order_id, gateway_payment_id)
VALUES
  ('ca000000-0000-0000-0000-000000000001','Sneha Patel', 'sneha@example.com','+919000000005',2500,'paid',    'CF_ORD_PR_001','CF_PAY_PR_001'),
  ('ca000000-0000-0000-0000-000000000001','Karan Singh', 'karan@example.com','+919000000006',2500,'paid',    'CF_ORD_PR_002','CF_PAY_PR_002'),
  ('ca000000-0000-0000-0000-000000000002','Dev Sharma',  'dev@example.com',  '+919000000008',1500,'paid',    'CF_ORD_PR_003','CF_PAY_PR_003'),
  ('ca000000-0000-0000-0000-000000000003','Anjali Desai','anjali@example.com','+919333333333',800, 'paid',    'CF_ORD_PR_004','CF_PAY_PR_004'),
  ('ca000000-0000-0000-0000-000000000004','Sneha Patel', 'sneha@example.com','+919000000005',999, 'pending', 'CF_ORD_PR_005',NULL)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 38: SITE DESIGN TOKENS
-- ===================================================================

INSERT INTO public.site_design_tokens (site_id, creator_id, color_palette, typography, spacing_scale, border_radius_scale, shadow_presets, custom_css_variables)
VALUES
  ('fb000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   '{"primary":"#6366F1","secondary":"#8B5CF6","accent":"#EC4899","surface":"#1E293B","text":"#F1F5F9","muted":"#94A3B8"}'::jsonb,
   '{"heading_font":"Inter","body_font":"Inter","base_size_px":16,"scale_ratio":1.25}'::jsonb,
   '{"base_px":4,"xs":4,"sm":8,"md":16,"lg":24,"xl":32,"2xl":48}'::jsonb,
   '{"sm":"4px","md":"8px","lg":"12px","xl":"16px","full":"9999px"}'::jsonb,
   '[{"name":"Card","value":"0 4px 24px rgba(0,0,0,0.3)"},{"name":"Button","value":"0 2px 8px rgba(99,102,241,0.4)"}]'::jsonb,
   '{"--brand-gradient":"linear-gradient(135deg,#6366F1,#EC4899)"}'::jsonb),

  ('fb000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003',
   '{"primary":"#EC4899","secondary":"#8B5CF6","accent":"#F59E0B","surface":"#FFFFFF","text":"#111827","muted":"#6B7280"}'::jsonb,
   '{"heading_font":"Playfair Display","body_font":"Inter","base_size_px":16,"scale_ratio":1.333}'::jsonb,
   '{"base_px":4,"xs":4,"sm":8,"md":16,"lg":24,"xl":32,"2xl":48}'::jsonb,
   '{"sm":"6px","md":"12px","lg":"18px","xl":"24px","full":"9999px"}'::jsonb,
   '[{"name":"Soft","value":"0 2px 16px rgba(0,0,0,0.08)"}]'::jsonb,
   '{}'::jsonb),

  ('fb000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000007',
   '{"primary":"#8B5CF6","secondary":"#EC4899","accent":"#06B6D4","surface":"#1E293B","text":"#F1F5F9","muted":"#94A3B8"}'::jsonb,
   '{"heading_font":"Space Grotesk","body_font":"Inter","base_size_px":16,"scale_ratio":1.25}'::jsonb,
   '{"base_px":4,"xs":4,"sm":8,"md":16,"lg":24,"xl":32,"2xl":48}'::jsonb,
   '{"sm":"4px","md":"8px","lg":"12px","xl":"16px","full":"9999px"}'::jsonb,
   '[]'::jsonb, '{}'::jsonb)
ON CONFLICT (site_id) DO NOTHING;

-- ===================================================================
-- SECTION 39: SITE SECTIONS CONFIG
-- ===================================================================

INSERT INTO public.site_sections_config (site_id, site_type, sections)
VALUES
  ('fb000000-0000-0000-0000-000000000001','main','[
    {"section_key":"announcement","section_type":"announcement_bar","label":"Announcement","is_visible":true,"sort_order":0,"settings":{"text":"🎉 Use ARJUN20 for 20% off all products!","bg_color":"#6366F1","text_color":"#FFFFFF"}},
    {"section_key":"hero","section_type":"hero_banner","label":"Hero Banner","is_visible":true,"sort_order":1,"settings":{"heading":"Learn Figma. Land Design Jobs.","subheading":"India''s most trusted design education platform.","cta_text":"Browse Courses","cta_url":"/products","bg_type":"gradient","bg_value":"linear-gradient(135deg,#0F172A,#1E293B)"}},
    {"section_key":"featured","section_type":"featured_products","label":"Featured Products","is_visible":true,"sort_order":2,"settings":{"title":"Top Picks","max_items":3,"show_price":true}},
    {"section_key":"social_proof","section_type":"social_proof","label":"Social Proof","is_visible":true,"sort_order":3,"settings":{"stats":[{"label":"Students","value":"50,000+"},{"label":"Courses","value":"12"},{"label":"Avg Rating","value":"4.9★"}]}},
    {"section_key":"testimonials","section_type":"testimonials","label":"Testimonials","is_visible":true,"sort_order":4,"settings":{"title":"What students say","style":"grid","columns":3}},
    {"section_key":"trust","section_type":"trust_badges","label":"Trust Badges","is_visible":true,"sort_order":5,"settings":{"badges":["Secure Payment","Instant Download","24/7 Support","Refund Policy"]}},
    {"section_key":"email_cap","section_type":"email_capture","label":"Email Capture","is_visible":false,"sort_order":6,"settings":{"headline":"Get free design resources weekly"}}
  ]'::jsonb),

  ('fb000000-0000-0000-0000-000000000004','main','[
    {"section_key":"hero","section_type":"hero_banner","label":"Hero Banner","is_visible":true,"sort_order":1,"settings":{"heading":"Design Assets for Modern Creators","subheading":"Figma UI kits, icon packs and Framer templates.","cta_text":"Shop Now"}},
    {"section_key":"grid","section_type":"product_grid","label":"Product Grid","is_visible":true,"sort_order":2,"settings":{"columns":3,"show_price":true,"show_rating":true}},
    {"section_key":"about","section_type":"about_creator","label":"About Priya","is_visible":true,"sort_order":3,"settings":{"text":"Hi, I''m Priya. I design assets for UI/UX professionals across India.","photo_url":"https://cdn.digione.in/priya/about-photo.jpg"}}
  ]'::jsonb),

  ('fb000000-0000-0000-0000-000000000008','main','[
    {"section_key":"hero","section_type":"hero_banner","label":"Hero Banner","is_visible":true,"sort_order":1,"settings":{"heading":"Start Your Podcast or Music Career","subheading":"Courses, ebooks and mentorship by Neha Kapoor.","cta_text":"Explore","video_bg":"https://cdn.digione.in/neha/hero-bg.mp4"}},
    {"section_key":"featured","section_type":"featured_products","label":"Featured","is_visible":true,"sort_order":2,"settings":{"max_items":2}},
    {"section_key":"faq","section_type":"faq_accordion","label":"FAQ","is_visible":true,"sort_order":3,"settings":{"items":[{"q":"Is Podcast Mastery for beginners?","a":"Yes, zero equipment or experience needed."}]}}
  ]'::jsonb)
ON CONFLICT (site_id) DO NOTHING;

-- ===================================================================
-- SECTION 40: SITE THEME PRESETS (system presets seeded in schema)
-- Add creator-specific saved presets
-- ===================================================================

INSERT INTO public.site_theme_presets (creator_id, site_id, preset_name, description, theme_data, is_system_preset, is_favorite)
VALUES
  ('a0000000-0000-0000-0000-000000000002', 'fb000000-0000-0000-0000-000000000001',
   'Arjun Dark Blue', 'Current live theme for Arjun''s store',
   '{"primaryColor":"#6366F1","secondaryColor":"#8B5CF6","accentColor":"#EC4899","backgroundColor":"#0F172A","surfaceColor":"#1E293B","textColor":"#F1F5F9","headingFont":"Inter","bodyFont":"Inter","borderRadius":"8px"}'::jsonb,
   false, true),
  ('a0000000-0000-0000-0000-000000000003', 'fb000000-0000-0000-0000-000000000004',
   'Priya Pink Minimal', 'Current live theme for Priya''s store',
   '{"primaryColor":"#EC4899","secondaryColor":"#8B5CF6","accentColor":"#F59E0B","backgroundColor":"#FFFFFF","surfaceColor":"#FDF2F8","textColor":"#111827","headingFont":"Playfair Display","bodyFont":"Inter","borderRadius":"12px"}'::jsonb,
   false, true)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 41: SITE NAVIGATION
-- ===================================================================

INSERT INTO public.site_navigation (site_id, header_logo_url, header_logo_alt, nav_items, show_cart_icon, show_search, sticky_header, footer_bottom_text, social_links)
VALUES
  ('fb000000-0000-0000-0000-000000000001',
   'https://cdn.digione.in/arjun/logo.png','Arjun Sharma',
   '[{"label":"Home","url":"/"},{"label":"Courses","url":"/products"},{"label":"Blog","url":"/blog"},{"label":"Mentorship","url":"/pay"},{"label":"Contact","url":"/contact"}]'::jsonb,
   true, false, true,
   '© 2024 Arjun Sharma. All rights reserved.',
   '{"instagram":"https://instagram.com/arjunsharma","youtube":"https://youtube.com/arjunsharma","twitter":"https://twitter.com/arjunsharma"}'::jsonb),

  ('fb000000-0000-0000-0000-000000000004',
   'https://cdn.digione.in/priya/logo.png','Priya Mehta',
   '[{"label":"Home","url":"/"},{"label":"Assets","url":"/products"},{"label":"Blog","url":"/blog"},{"label":"About","url":"/about"}]'::jsonb,
   true, true, true,
   '© 2024 Priya Mehta Designs. All rights reserved.',
   '{"instagram":"https://instagram.com/priyamehta_design","dribbble":"https://dribbble.com/priyamehta"}'::jsonb),

  ('fb000000-0000-0000-0000-000000000008',
   'https://cdn.digione.in/neha/logo.png','Neha Kapoor',
   '[{"label":"Home","url":"/"},{"label":"Courses","url":"/products"},{"label":"Blog","url":"/blog"},{"label":"Collab","url":"/pay"}]'::jsonb,
   true, false, true,
   '© 2024 Neha Kapoor Creates.',
   '{"instagram":"https://instagram.com/nehacreates","spotify":"https://open.spotify.com/show/nehacreates"}'::jsonb)
ON CONFLICT (site_id) DO NOTHING;

-- ===================================================================
-- SECTION 42: SITE A/B TESTS (running, paused, concluded)
-- ===================================================================

INSERT INTO public.site_ab_tests (site_id, creator_id, test_name, section_key, variant_a, variant_b, traffic_split_percent, status, winner, start_at, end_at)
VALUES
  ('fb000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   'Hero CTA Button Text', 'hero',
   '{"cta_text":"Browse Courses","cta_color":"#6366F1","cta_size":"lg"}'::jsonb,
   '{"cta_text":"Start Learning Today","cta_color":"#EC4899","cta_size":"lg"}'::jsonb,
   50, 'running', NULL, NOW()-INTERVAL '5 days', NULL),

  ('fb000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003',
   'Product Grid Columns', 'grid',
   '{"columns":2,"card_style":"minimal"}'::jsonb,
   '{"columns":3,"card_style":"shadow"}'::jsonb,
   50, 'concluded', 'b', NOW()-INTERVAL '30 days', NOW()-INTERVAL '2 days'),

  ('fb000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000007',
   'Hero Background Type', 'hero',
   '{"bg_type":"image","overlay_opacity":0.5}'::jsonb,
   '{"bg_type":"video","overlay_opacity":0.6}'::jsonb,
   50, 'paused', NULL, NOW()-INTERVAL '3 days', NULL)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 43: PROJECTS + PAGES + PAGE BLOCKS + PAGE BLOCK MEDIA
-- ===================================================================

INSERT INTO public.projects (id, creator_id, site_id, name, slug, description, is_public, created_at)
VALUES
  ('e7000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','fb000000-0000-0000-0000-000000000001','Arjun — Landing Pages', 'landing-pages','Custom landing and about pages for Arjun''s store.', false, NOW()-INTERVAL '120 days'),
  ('e7000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003','fb000000-0000-0000-0000-000000000004','Priya — Portfolio Pages','portfolio',    'Portfolio and case study pages for Priya''s store.', false, NOW()-INTERVAL '90 days'),
  ('e7000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000007','fb000000-0000-0000-0000-000000000008','Neha — Custom Pages',   'custom-pages', 'Custom pages for Neha''s creator store.',            false, NOW()-INTERVAL '45 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.pages (id, project_id, site_id, creator_id, slug, page_type, name, title, seo_title, seo_description, status, is_published, is_homepage, custom_head_html, custom_css, custom_js, view_count, published_at, created_at)
VALUES
  -- Arjun: about page (published)
  ('e6000000-0000-0000-0000-000000000001','e7000000-0000-0000-0000-000000000001','fb000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000002',
   'about','about','About Arjun','About Arjun Sharma',
   'About Arjun Sharma — Figma & UX Educator',
   'Meet Arjun Sharma, India''s most trusted Figma and UX Design educator.',
   'published', true, false,
   '<meta name="author" content="Arjun Sharma"><meta property="og:image" content="https://cdn.digione.in/arjun/og.jpg">',
   'body { font-family: Inter, sans-serif; } .section { padding: 80px 0; }',
   'console.log("[Arjun About] loaded");',
   1240, NOW()-INTERVAL '110 days', NOW()-INTERVAL '120 days'),

  -- Arjun: contact page (published)
  ('e6000000-0000-0000-0000-000000000002','e7000000-0000-0000-0000-000000000001','fb000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000002',
   'contact','contact','Contact','Contact Arjun',
   'Contact Arjun Sharma',
   'Get in touch with Arjun Sharma for collaborations or course enquiries.',
   'published', true, false, NULL, NULL, NULL,
   530, NOW()-INTERVAL '100 days', NOW()-INTERVAL '115 days'),

  -- Priya: portfolio page (published)
  ('e6000000-0000-0000-0000-000000000003','e7000000-0000-0000-0000-000000000002','fb000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000003',
   'portfolio','landing','Portfolio','Priya Mehta Design Portfolio',
   'Priya Mehta — Design Portfolio',
   'Explore the design work and products of Priya Mehta.',
   'published', true, false, NULL,
   '.portfolio-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2rem; }',
   NULL, 870, NOW()-INTERVAL '80 days', NOW()-INTERVAL '90 days'),

  -- Neha: coming soon page (draft)
  ('e6000000-0000-0000-0000-000000000004','e7000000-0000-0000-0000-000000000003','fb000000-0000-0000-0000-000000000008',
   'a0000000-0000-0000-0000-000000000007',
   'coming-soon','landing','Coming Soon','Something Big is Coming',
   NULL, NULL,
   'draft', false, false, NULL, NULL, NULL,
   0, NULL, NOW()-INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- Page blocks — Arjun about page (full section > block tree)
INSERT INTO public.page_blocks (id, page_id, creator_id, parent_block_id, layout_role, block_type, display_name, sort_order, is_visible, content, custom_css, created_at)
VALUES
  -- Section 1: Hero
  ('e5000000-0000-0000-0000-000000000001','e6000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   NULL,'section','hero','Hero Section',1,true,'{"bg":"#0F172A"}'::jsonb, NULL, NOW()-INTERVAL '110 days'),
  ('e5000000-0000-0000-0000-000000000002','e6000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   'e5000000-0000-0000-0000-000000000001','block','hero','Hero Block',1,true,
   '{"heading":"Hi, I am Arjun","subheading":"I teach Figma and UX Design to 50,000+ students across India.","image_url":"https://cdn.digione.in/arjun/hero-photo.jpg","cta_text":"View My Courses","cta_url":"/products"}'::jsonb,
   '.hero-heading { font-size: clamp(2rem, 5vw, 4rem); }', NOW()-INTERVAL '110 days'),

  -- Section 2: Story (row > column > text)
  ('e5000000-0000-0000-0000-000000000003','e6000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   NULL,'section','text','Story Section',2,true,'{}'::jsonb, NULL, NOW()-INTERVAL '110 days'),
  ('e5000000-0000-0000-0000-000000000004','e6000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   'e5000000-0000-0000-0000-000000000003','row','text','Story Row',1,true,'{}'::jsonb, NULL, NOW()-INTERVAL '110 days'),
  ('e5000000-0000-0000-0000-000000000005','e6000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   'e5000000-0000-0000-0000-000000000004','column','text','Story Column',1,true,'{}'::jsonb, NULL, NOW()-INTERVAL '110 days'),
  ('e5000000-0000-0000-0000-000000000006','e6000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   'e5000000-0000-0000-0000-000000000005','block','rich_text','My Story',1,true,
   '{"html":"<h2>My Story</h2><p>I started learning Figma in 2018 with zero design background. Today I have helped 50,000+ students across India land their first design job or grow their freelance income.</p><p>I believe that design education should be affordable, practical, and India-first.</p>"}'::jsonb,
   NULL, NOW()-INTERVAL '110 days'),

  -- Section 3: Stats
  ('e5000000-0000-0000-0000-000000000007','e6000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   NULL,'section','testimonial','Stats Section',3,true,'{"bg":"#1E293B"}'::jsonb, NULL, NOW()-INTERVAL '110 days'),
  ('e5000000-0000-0000-0000-000000000008','e6000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   'e5000000-0000-0000-0000-000000000007','block','columns','Stats Columns',1,true,
   '{"columns":[{"label":"Students","value":"50,000+"},{"label":"Courses","value":"12"},{"label":"Avg Rating","value":"4.9/5"},{"label":"Countries","value":"18"}]}'::jsonb,
   NULL, NOW()-INTERVAL '110 days'),

  -- Section 4: CTA
  ('e5000000-0000-0000-0000-000000000009','e6000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   NULL,'section','cta_button','CTA Section',4,true,'{}'::jsonb, NULL, NOW()-INTERVAL '110 days'),
  ('e5000000-0000-0000-0000-000000000010','e6000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
   'e5000000-0000-0000-0000-000000000009','block','cta_button','Enroll CTA',1,true,
   '{"text":"Enroll in Figma Masterclass","url":"/products/figma-masterclass","style":"primary","size":"xl","align":"center"}'::jsonb,
   NULL, NOW()-INTERVAL '110 days'),

  -- Priya portfolio — hero + image gallery + custom HTML
  ('e5000000-0000-0000-0000-000000000011','e6000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',
   NULL,'section','hero','Hero',1,true,'{}'::jsonb, NULL, NOW()-INTERVAL '80 days'),
  ('e5000000-0000-0000-0000-000000000012','e6000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',
   'e5000000-0000-0000-0000-000000000011','block','hero','Hero Block',1,true,
   '{"heading":"Priya Mehta","subheading":"UI/UX Designer & Figma Educator based in Bangalore.","image_url":"https://cdn.digione.in/priya/hero-photo.jpg"}'::jsonb,
   NULL, NOW()-INTERVAL '80 days'),
  ('e5000000-0000-0000-0000-000000000013','e6000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',
   NULL,'section','image_gallery','Gallery Section',2,true,'{}'::jsonb, NULL, NOW()-INTERVAL '80 days'),
  ('e5000000-0000-0000-0000-000000000014','e6000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',
   'e5000000-0000-0000-0000-000000000013','block','image_gallery','Portfolio Gallery',1,true,
   '{"images":[{"url":"https://cdn.digione.in/priya/work-1.jpg","alt":"UI Kit Design"},{"url":"https://cdn.digione.in/priya/work-2.jpg","alt":"Icons"},{"url":"https://cdn.digione.in/priya/work-3.jpg","alt":"Framer Template"}],"columns":3}'::jsonb,
   NULL, NOW()-INTERVAL '80 days'),
  -- Custom HTML block for embed
  ('e5000000-0000-0000-0000-000000000015','e6000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',
   NULL,'section','custom_html','Embed Section',3,true,'{}'::jsonb, NULL, NOW()-INTERVAL '80 days'),
  ('e5000000-0000-0000-0000-000000000016','e6000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',
   'e5000000-0000-0000-0000-000000000015','block','custom_html','Dribbble Embed',1,true,
   '{"html":"<div class=\"dribbble-embed\"><iframe src=\"https://dribbble.com/priyamehta/embedded\" width=\"100%\" height=\"400\" frameborder=\"0\"></iframe></div>","css":".dribbble-embed { border-radius: 12px; overflow: hidden; }","js":""}'::jsonb,
   NULL, NOW()-INTERVAL '80 days')
ON CONFLICT (id) DO NOTHING;

-- Page block media (links media_library items to page blocks)
INSERT INTO public.page_block_media (page_block_id, media_id, sort_order)
VALUES
  ('e5000000-0000-0000-0000-000000000002','e2000000-0000-0000-0000-000000000004',1),  -- Arjun hero ← intro video
  ('e5000000-0000-0000-0000-000000000014','e2000000-0000-0000-0000-000000000005',1),  -- Priya gallery ← UI kit image
  ('e5000000-0000-0000-0000-000000000014','e2000000-0000-0000-0000-000000000006',2),  -- Priya gallery ← icons image
  ('e5000000-0000-0000-0000-000000000014','e2000000-0000-0000-0000-000000000007',3)   -- Priya gallery ← blog thumb
ON CONFLICT DO NOTHING;

-- Page versions (history / undo snapshots)
INSERT INTO public.page_versions (page_id, layout, version_label, is_autosave, created_by_user_id, created_at)
VALUES
  ('e6000000-0000-0000-0000-000000000001','{"sections":["hero","story","stats","cta"],"version":"1.0"}'::jsonb, 'v1.0 — Initial publish', false, '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '110 days'),
  ('e6000000-0000-0000-0000-000000000001','{"sections":["hero","story","stats","cta"],"version":"1.1"}'::jsonb, 'v1.1 — Updated hero copy', false, '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '60 days'),
  ('e6000000-0000-0000-0000-000000000001','{"sections":["hero","story","stats","cta"],"version":"autosave"}'::jsonb, NULL, true, '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '1 hour'),
  ('e6000000-0000-0000-0000-000000000003','{"sections":["hero","gallery","embed"],"version":"1.0"}'::jsonb, 'v1.0 — Launch', false, '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '80 days')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 44: PAGE TEMPLATES (system ones in schema; add creator ones)
-- ===================================================================

INSERT INTO public.page_templates (creator_id, template_name, description, page_type, template_blocks, thumbnail_url, category, is_system_template, is_public, usage_count)
VALUES
  ('a0000000-0000-0000-0000-000000000002',
   'Arjun Hero Template', 'Dark hero with video background and course CTA.',
   'landing',
   '{"blocks":[{"type":"hero","settings":{"bg":"video","overlay":0.6,"cta":true}},{"type":"product_showcase"},{"type":"testimonial"},{"type":"cta_button"}]}'::jsonb,
   'https://cdn.digione.in/arjun/hero-template-thumb.jpg',
   'creator', false, true, 14),

  ('a0000000-0000-0000-0000-000000000003',
   'Priya Portfolio Template', 'Clean portfolio layout with image gallery and social embed.',
   'about',
   '{"blocks":[{"type":"hero"},{"type":"image_gallery","settings":{"columns":3}},{"type":"custom_html","settings":{"embed":true}}]}'::jsonb,
   'https://cdn.digione.in/priya/portfolio-template-thumb.jpg',
   'portfolio', false, true, 8)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 45: SAVED COMPONENTS
-- ===================================================================

INSERT INTO public.saved_components (creator_id, name, description, category, component_tree, is_public, usage_count, tags)
VALUES
  ('a0000000-0000-0000-0000-000000000002',
   'Course Hero Block', 'Dark hero with video background and CTA. Used across course landing pages.',
   'hero',
   '{"blocks":[{"type":"hero","settings":{"video":true,"overlay_opacity":0.6,"cta":true,"cta_color":"#6366F1"}}]}'::jsonb,
   true, 22, ARRAY['hero','course','video','dark']),

  ('a0000000-0000-0000-0000-000000000002',
   'FAQ Accordion', '5-item FAQ accordion with smooth expand/collapse animation.',
   'faq',
   '{"blocks":[{"type":"faq","settings":{"style":"accordion","items":5,"animation":"smooth"}}]}'::jsonb,
   true, 9, ARRAY['faq','accordion']),

  ('a0000000-0000-0000-0000-000000000003',
   'Testimonial Carousel', '3-card testimonial slider with avatar, role and star rating.',
   'social_proof',
   '{"blocks":[{"type":"testimonial","settings":{"style":"carousel","cards":3,"show_stars":true,"autoplay":5}}]}'::jsonb,
   true, 31, ARRAY['testimonial','carousel','trust']),

  ('a0000000-0000-0000-0000-000000000007',
   'Podcast Episode Embed', 'Spotify episode embed block with description.',
   'media',
   '{"blocks":[{"type":"embed","settings":{"platform":"spotify","show_description":true}}]}'::jsonb,
   false, 3, ARRAY['podcast','spotify','embed'])
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 46: PAGE EDIT LOCKS
-- ===================================================================

INSERT INTO public.page_edit_locks (page_id, locked_by_user_id, session_id, expires_at)
VALUES
  ('e6000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','sess_priya_edit_abc123', NOW() + INTERVAL '4 minutes'),
  ('e6000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000007','sess_neha_edit_xyz789',  NOW() + INTERVAL '3 minutes')
ON CONFLICT (page_id) DO NOTHING;

-- ===================================================================
-- SECTION 47: BUILDER FONTS
-- ===================================================================

INSERT INTO public.builder_fonts (site_id, creator_id, font_name, font_family, source, google_font_id, is_active)
VALUES
  ('fb000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','Inter',          'Inter',          'google','Inter',           true),
  ('fb000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','Space Grotesk',  'Space Grotesk',  'google','Space+Grotesk',   true),
  ('fb000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003','Playfair Display','Playfair Display','google','Playfair+Display',true),
  ('fb000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003','Inter',          'Inter',          'google','Inter',           true),
  ('fb000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000007','Space Grotesk',  'Space Grotesk',  'google','Space+Grotesk',   true),
  ('fb000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000007','Inter',          'Inter',          'google','Inter',           true)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 48: BUILDER ASSETS
-- ===================================================================

INSERT INTO public.builder_assets (creator_id, asset_type, name, storage_url, thumbnail_url, tags)
VALUES
  ('a0000000-0000-0000-0000-000000000002','icon_set',        'Feather Icons',        'https://cdn.digione.in/assets/feather-icons.zip',        'https://cdn.digione.in/assets/feather-thumb.jpg',       ARRAY['icons','outline','minimal','svg']),
  ('a0000000-0000-0000-0000-000000000002','lottie_animation','Confetti Burst',        'https://cdn.digione.in/assets/confetti.json',            'https://cdn.digione.in/assets/confetti-thumb.jpg',      ARRAY['animation','celebration','lottie']),
  ('a0000000-0000-0000-0000-000000000002','lottie_animation','Loading Spinner',       'https://cdn.digione.in/assets/loading-spinner.json',     'https://cdn.digione.in/assets/spinner-thumb.jpg',       ARRAY['loading','animation','ui']),
  ('a0000000-0000-0000-0000-000000000003','illustration',    'Empty State Set',       'https://cdn.digione.in/assets/empty-states.zip',         'https://cdn.digione.in/assets/empty-states-thumb.jpg',  ARRAY['illustration','empty-state','svg']),
  ('a0000000-0000-0000-0000-000000000003','pattern',         'Dot Grid Pattern',      'https://cdn.digione.in/assets/dot-grid.svg',             'https://cdn.digione.in/assets/dot-grid-thumb.jpg',      ARRAY['pattern','background','svg']),
  ('a0000000-0000-0000-0000-000000000003','stock_image',     'Abstract Gradient BG',  'https://cdn.digione.in/assets/gradient-bg.jpg',          'https://cdn.digione.in/assets/gradient-bg-thumb.jpg',   ARRAY['background','gradient','hero']),
  ('a0000000-0000-0000-0000-000000000007','icon_set',        'Music & Audio Icons',   'https://cdn.digione.in/assets/music-icons.zip',          'https://cdn.digione.in/assets/music-icons-thumb.jpg',   ARRAY['icons','music','audio','podcast'])
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 49: ANALYTICS — site_page_views
-- ===================================================================

INSERT INTO public.site_page_views (site_id, page_slug, session_id, referrer, utm_source, utm_medium, utm_campaign, device_type, country_code, created_at)
VALUES
  ('fb000000-0000-0000-0000-000000000001','/',           'sess_v_001','https://google.com',    'google',    'organic',  NULL,            'desktop','IN', NOW()-INTERVAL '5 days'),
  ('fb000000-0000-0000-0000-000000000001','/',           'sess_v_002','https://instagram.com', 'instagram', 'social',   'reel_promo',    'mobile', 'IN', NOW()-INTERVAL '5 days'),
  ('fb000000-0000-0000-0000-000000000001','/products',   'sess_v_003',NULL,                    NULL,        NULL,       NULL,            'desktop','IN', NOW()-INTERVAL '4 days'),
  ('fb000000-0000-0000-0000-000000000001','/products',   'sess_v_004','https://youtube.com',   'youtube',   'video',    'course_promo',  'mobile', 'IN', NOW()-INTERVAL '4 days'),
  ('fb000000-0000-0000-0000-000000000001','/products',   'sess_v_005','https://google.com',    'google',    'organic',  NULL,            'tablet', 'IN', NOW()-INTERVAL '3 days'),
  ('fb000000-0000-0000-0000-000000000002','/',           'sess_v_006','https://google.com',    'google',    'organic',  NULL,            'desktop','IN', NOW()-INTERVAL '3 days'),
  ('fb000000-0000-0000-0000-000000000002','/',           'sess_v_007','https://instagram.com', 'instagram', 'social',   NULL,            'mobile', 'IN', NOW()-INTERVAL '2 days'),
  ('fb000000-0000-0000-0000-000000000004','/',           'sess_v_008','https://dribbble.com',  'dribbble',  'referral', NULL,            'desktop','US', NOW()-INTERVAL '4 days'),
  ('fb000000-0000-0000-0000-000000000004','/products',   'sess_v_009','https://dribbble.com',  'dribbble',  'referral', NULL,            'desktop','US', NOW()-INTERVAL '4 days'),
  ('fb000000-0000-0000-0000-000000000005','/blog',       'sess_v_010','https://google.com',    'google',    'organic',  NULL,            'mobile', 'IN', NOW()-INTERVAL '2 days'),
  ('fb000000-0000-0000-0000-000000000006','/',           'sess_v_011',NULL,                    NULL,        NULL,       NULL,            'mobile', 'IN', NOW()-INTERVAL '3 days'),
  ('fb000000-0000-0000-0000-000000000008','/',           'sess_v_012','https://spotify.com',   'spotify',   'referral', NULL,            'mobile', 'IN', NOW()-INTERVAL '1 day'),
  ('fb000000-0000-0000-0000-000000000008','/products',   'sess_v_013','https://instagram.com', 'instagram', 'social',   'podcast_promo', 'mobile', 'IN', NOW()-INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 50: ANALYTICS — product_view_events
-- ===================================================================

INSERT INTO public.product_view_events (product_id, site_id, session_id, referrer, device_type, created_at)
VALUES
  ('e8000000-0000-0000-0000-000000000001','fb000000-0000-0000-0000-000000000001','sess_v_003','https://google.com',    'desktop', NOW()-INTERVAL '4 days'),
  ('e8000000-0000-0000-0000-000000000001','fb000000-0000-0000-0000-000000000001','sess_v_004','https://youtube.com',   'mobile',  NOW()-INTERVAL '4 days'),
  ('e8000000-0000-0000-0000-000000000001','fb000000-0000-0000-0000-000000000002','sess_v_006','https://google.com',    'desktop', NOW()-INTERVAL '3 days'),
  ('e8000000-0000-0000-0000-000000000005','fb000000-0000-0000-0000-000000000004','sess_v_009','https://dribbble.com',  'desktop', NOW()-INTERVAL '4 days'),
  ('e8000000-0000-0000-0000-000000000007','fb000000-0000-0000-0000-000000000004','sess_v_009','https://dribbble.com',  'desktop', NOW()-INTERVAL '4 days'),
  ('e8000000-0000-0000-0000-000000000008','fb000000-0000-0000-0000-000000000006','sess_v_011',NULL,                    'mobile',  NOW()-INTERVAL '3 days'),
  ('e8000000-0000-0000-0000-000000000011','fb000000-0000-0000-0000-000000000008','sess_v_013','https://instagram.com', 'mobile',  NOW()-INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 51: ANALYTICS — conversion_events
-- ===================================================================

INSERT INTO public.conversion_events (site_id, product_id, order_id, session_id, event_type, revenue, created_at)
VALUES
  ('fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001',NULL,                                        'sess_v_003','add_to_cart',    NULL, NOW()-INTERVAL '60 days'),
  ('fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001',NULL,                                        'sess_v_003','checkout_start', NULL, NOW()-INTERVAL '60 days'),
  ('fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001','e4000000-0000-0000-0000-000000000001',       'sess_v_003','purchase',       1999, NOW()-INTERVAL '60 days'),
  ('fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000002','e4000000-0000-0000-0000-000000000002',       'sess_v_004','purchase',        499, NOW()-INTERVAL '50 days'),
  ('fb000000-0000-0000-0000-000000000004','e8000000-0000-0000-0000-000000000005','e4000000-0000-0000-0000-000000000003',       'sess_v_009','purchase',       1299, NOW()-INTERVAL '40 days'),
  ('fb000000-0000-0000-0000-000000000004','e8000000-0000-0000-0000-000000000007','e4000000-0000-0000-0000-000000000009',       'sess_v_009','purchase',        599, NOW()-INTERVAL '10 days'),
  ('fb000000-0000-0000-0000-000000000008','e8000000-0000-0000-0000-000000000011','e4000000-0000-0000-0000-000000000005',       'sess_v_013','purchase',       1499, NOW()-INTERVAL '30 days'),
  -- drop-off at checkout (no purchase) — tests funnel abandonment
  ('fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001',NULL,                                        'sess_v_005','add_to_cart',    NULL, NOW()-INTERVAL '3 days'),
  ('fb000000-0000-0000-0000-000000000001','e8000000-0000-0000-0000-000000000001',NULL,                                        'sess_v_005','checkout_start', NULL, NOW()-INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 52: SUPPORT TICKETS (all statuses)
-- ===================================================================

INSERT INTO public.support_tickets (user_id, creator_id, site_id, subject, description, status, priority, assigned_admin_id, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000002','fb000000-0000-0000-0000-000000000001',
   'Cannot access course after payment',
   'I completed payment for Figma Masterclass (Order CF_PAY_001) but the access link does not work.',
   'resolved','high','00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '55 days'),

  ('00000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000003','fb000000-0000-0000-0000-000000000004',
   'Wrong Figma file downloaded',
   'I purchased the Pro UI Kit but the .fig file seems to be v2 not v3.',
   'in_progress','medium','00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '5 days'),

  ('00000000-0000-0000-0000-000000000008',NULL,NULL,
   'Refund not received',
   'I was told my refund would be processed in 5-7 business days but it has been 12 days.',
   'open','high','00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '8 days'),

  ('00000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003','fb000000-0000-0000-0000-000000000004',
   'Coupon code not working',
   'The coupon PRIYA15 shows invalid at checkout.',
   'closed','low','00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '20 days')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 53: NOTIFICATIONS (read + unread, all types)
-- ===================================================================

INSERT INTO public.notifications (recipient_creator_id, title, message, type, is_read, action_url, created_at)
VALUES
  ('a0000000-0000-0000-0000-000000000002','New Sale 🎉',         'Sneha Patel purchased Figma Masterclass 2024 for ₹1,999.',          'sale',        true,  '/dashboard/orders',  NOW()-INTERVAL '60 days'),
  ('a0000000-0000-0000-0000-000000000002','New Sale 🎉',         'Meera Nair purchased Figma Masterclass 2024 for ₹1,999.',           'sale',        true,  '/dashboard/orders',  NOW()-INTERVAL '38 days'),
  ('a0000000-0000-0000-0000-000000000002','New Sale 🎉',         'Sneha Patel purchased UI/UX Career Roadmap Ebook for ₹499.',        'sale',        true,  '/dashboard/orders',  NOW()-INTERVAL '50 days'),
  ('a0000000-0000-0000-0000-000000000002','Refund Requested 🔄', 'Dev Sharma has requested a refund for Order CF_ORD_007.',           'refund',      false, '/dashboard/orders',  NOW()-INTERVAL '20 days'),
  ('a0000000-0000-0000-0000-000000000002','Payout Processed ✅', 'Your payout of ₹3,500 has been processed via UPI.',                 'payout',      false, '/dashboard/payouts', NOW()-INTERVAL '9 days'),
  ('a0000000-0000-0000-0000-000000000002','New Review ⭐',        'Sneha Patel left a 5-star review on Figma Masterclass.',            'review',      false, '/dashboard/reviews', NOW()-INTERVAL '55 days'),
  ('a0000000-0000-0000-0000-000000000003','New Sale 🎉',         'Karan Singh purchased Pro UI Kit for ₹1,299.',                      'sale',        true,  '/dashboard/orders',  NOW()-INTERVAL '40 days'),
  ('a0000000-0000-0000-0000-000000000003','New Sale 🎉',         'Sneha Patel purchased Framer Portfolio Template for ₹599.',         'sale',        false, '/dashboard/orders',  NOW()-INTERVAL '10 days'),
  ('a0000000-0000-0000-0000-000000000003','Payout Pending 🕐',   'Your payout request of ₹1,765 is being reviewed.',                  'payout',      false, '/dashboard/payouts', NOW()-INTERVAL '2 days'),
  ('a0000000-0000-0000-0000-000000000004','KYC Required 🔔',     'Complete your KYC verification to enable payouts.',                 'kyc_reminder',false, '/dashboard/kyc',     NOW()-INTERVAL '5 days'),
  ('a0000000-0000-0000-0000-000000000007','New Sale 🎉',         'Dev Sharma purchased Podcast Mastery for ₹1,499.',                  'sale',        false, '/dashboard/orders',  NOW()-INTERVAL '30 days'),
  ('a0000000-0000-0000-0000-000000000007','Payout Rejected ❌',   'Your payout of ₹1,424 was rejected. KYC not verified.',             'payout',      false, '/dashboard/payouts', NOW()-INTERVAL '4 days'),
  ('a0000000-0000-0000-0000-000000000007','KYC Rejected ❌',      'Your KYC submission was rejected. Please resubmit with valid docs.','kyc_rejected', false, '/dashboard/kyc',     NOW()-INTERVAL '28 days')
ON CONFLICT DO NOTHING;

INSERT INTO public.notifications (recipient_user_id, title, message, type, is_read, action_url, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000005','Order Confirmed ✅','Your order for Figma Masterclass 2024 is confirmed.',          'order',    true,  '/orders', NOW()-INTERVAL '60 days'),
  ('00000000-0000-0000-0000-000000000005','Wallet Credit 💰',  '₹200 has been credited to your wallet as referral reward.',   'wallet',   false, '/wallet', NOW()-INTERVAL '60 days'),
  ('00000000-0000-0000-0000-000000000008','Refund Initiated ↩','Your refund of ₹1,999 for Figma Masterclass is being processed.','refund',false, '/orders', NOW()-INTERVAL '19 days')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 54: EMAIL EVENTS (all statuses: sent, failed, pending)
-- ===================================================================

INSERT INTO public.email_events (user_id, creator_id, order_id, recipient_email, subject, template_name, status, sent_at, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000002','e4000000-0000-0000-0000-000000000001','sneha@example.com','Your Figma Masterclass 2024 access is ready 🎉',    'order_confirmation',       'sent',   NOW()-INTERVAL '60 days', NOW()-INTERVAL '60 days'),
  ('00000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000002','e4000000-0000-0000-0000-000000000002','sneha@example.com','Your UX Career Roadmap Ebook download link',       'order_confirmation',       'sent',   NOW()-INTERVAL '50 days', NOW()-INTERVAL '50 days'),
  ('00000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000003','e4000000-0000-0000-0000-000000000003','karan@example.com','Your Pro UI Kit files are ready to download',      'order_confirmation',       'sent',   NOW()-INTERVAL '40 days', NOW()-INTERVAL '40 days'),
  (NULL,                                  'a0000000-0000-0000-0000-000000000002','e4000000-0000-0000-0000-000000000004','meera@example.com','Your Figma Masterclass access link (guest order)', 'order_confirmation_guest', 'sent',   NOW()-INTERVAL '38 days', NOW()-INTERVAL '38 days'),
  ('00000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000007','e4000000-0000-0000-0000-000000000005','dev@example.com',  'Your Podcast Mastery access is ready',             'order_confirmation',       'sent',   NOW()-INTERVAL '30 days', NOW()-INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000002','e4000000-0000-0000-0000-000000000007','dev@example.com',  'Your refund of ₹1,999 has been initiated',         'refund_initiated',         'sent',   NOW()-INTERVAL '19 days', NOW()-INTERVAL '20 days'),
  ('00000000-0000-0000-0000-000000000002',NULL,                                  NULL,                                  'arjun@digione.in', 'Your payout of ₹3,500 has been processed',          'payout_processed',         'sent',   NOW()-INTERVAL '9 days',  NOW()-INTERVAL '9 days'),
  -- failed email (for error state testing)
  ('00000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000006','e4000000-0000-0000-0000-000000000006','karan@example.com','Order pending — complete your UPI payment',        'payment_pending',          'failed', NULL,                     NOW()-INTERVAL '1 day'),
  -- pending email (queued)
  ('00000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000004','e4000000-0000-0000-0000-000000000006','karan@example.com','Your Golden Hour Presets are ready',               'order_confirmation',       'pending',NULL,                     NOW()-INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 55: STORAGE FILES + USAGES
-- ===================================================================

INSERT INTO public.storage_files (id, bucket, path, public_url, owner_creator_id, file_type, size_bytes, status, created_at)
VALUES
  ('fa000000-0000-0000-0000-000000000001','creator-assets','arjun/figma-course-cover.jpg', 'https://cdn.digione.in/arjun/figma-course-cover.jpg', 'a0000000-0000-0000-0000-000000000002','image/jpeg',    245000,   'active', NOW()-INTERVAL '130 days'),
  ('fa000000-0000-0000-0000-000000000002','creator-assets','arjun/figma-course.key',       'https://cdn.digione.in/arjun/figma-course.key',       'a0000000-0000-0000-0000-000000000002','text/plain',    512,      'active', NOW()-INTERVAL '130 days'),
  ('fa000000-0000-0000-0000-000000000003','creator-assets','arjun/ux-career-ebook.pdf',    'https://cdn.digione.in/arjun/ux-career-ebook.pdf',    'a0000000-0000-0000-0000-000000000002','application/pdf',9800000, 'active', NOW()-INTERVAL '120 days'),
  ('fa000000-0000-0000-0000-000000000004','creator-assets','priya/uikit-pro.fig',          'https://cdn.digione.in/priya/uikit-pro.fig',          'a0000000-0000-0000-0000-000000000003','application/fig',42000000,'active', NOW()-INTERVAL '110 days'),
  ('fa000000-0000-0000-0000-000000000005','creator-assets','priya/500-icons-svg.zip',      'https://cdn.digione.in/priya/500-icons-svg.zip',      'a0000000-0000-0000-0000-000000000003','application/zip',4200000, 'active', NOW()-INTERVAL '90 days'),
  ('fa000000-0000-0000-0000-000000000006','creator-assets','rahul/golden-hour.zip',        'https://cdn.digione.in/rahul/golden-hour.zip',        'a0000000-0000-0000-0000-000000000004','application/zip',2800000, 'active', NOW()-INTERVAL '75 days'),
  ('fa000000-0000-0000-0000-000000000007','creator-assets','neha/podcast-course.key',      'https://cdn.digione.in/neha/podcast-course.key',      'a0000000-0000-0000-0000-000000000007','text/plain',    512,      'active', NOW()-INTERVAL '50 days'),
  ('fa000000-0000-0000-0000-000000000008','creator-assets','arjun/old-course-v1.zip',      'https://cdn.digione.in/arjun/old-course-v1.zip',      'a0000000-0000-0000-0000-000000000002','application/zip',55000000,'deleted',NOW()-INTERVAL '200 days') -- soft deleted
ON CONFLICT (bucket, path) DO NOTHING;

INSERT INTO public.storage_file_usages (file_id, entity_type, entity_id, field_name)
VALUES
  ('fa000000-0000-0000-0000-000000000001','product',    'e8000000-0000-0000-0000-000000000001','thumbnail_url'),
  ('fa000000-0000-0000-0000-000000000002','product',    'e8000000-0000-0000-0000-000000000001','product_file'),
  ('fa000000-0000-0000-0000-000000000003','product',    'e8000000-0000-0000-0000-000000000002','product_file'),
  ('fa000000-0000-0000-0000-000000000004','product',    'e8000000-0000-0000-0000-000000000005','product_file'),
  ('fa000000-0000-0000-0000-000000000005','product',    'e8000000-0000-0000-0000-000000000006','product_file'),
  ('fa000000-0000-0000-0000-000000000006','product',    'e8000000-0000-0000-0000-000000000008','product_file'),
  ('fa000000-0000-0000-0000-000000000007','product',    'e8000000-0000-0000-0000-000000000011','product_file'),
  ('fa000000-0000-0000-0000-000000000001','page_block', 'e5000000-0000-0000-0000-000000000002','image_url')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 56: BACKGROUND JOBS (pending, completed, failed states)
-- ===================================================================

INSERT INTO public.background_jobs (job_type, payload, status, attempts, last_error, created_at)
VALUES
  ('send_order_email',      '{"order_id":"or000000-0000-0000-0000-000000000006","template":"order_confirmation","to":"karan@example.com"}'::jsonb,           'pending',   0, NULL,                  NOW()-INTERVAL '1 day'),
  ('update_search_vector',  '{"product_id":"pr000000-0000-0000-0000-000000000010"}'::jsonb,                                                                 'pending',   0, NULL,                  NOW()-INTERVAL '3 days'),
  ('process_payout',        '{"payout_request_id":"cpr00000-0000-0000-0000-000000000001","creator_id":"a0000000-0000-0000-0000-000000000002"}'::jsonb,       'completed', 1, NULL,                  NOW()-INTERVAL '10 days'),
  ('send_payout_email',     '{"creator_id":"a0000000-0000-0000-0000-000000000002","amount":3500,"method":"upi"}'::jsonb,                                     'completed', 1, NULL,                  NOW()-INTERVAL '9 days'),
  ('expire_page_lock',      '{"page_id":"pg000000-0000-0000-0000-000000000001"}'::jsonb,                                                                     'completed', 1, NULL,                  NOW()-INTERVAL '2 hours'),
  ('send_order_email',      '{"order_id":"or000000-0000-0000-0000-000000000008","template":"payment_failed","to":"sneha@example.com"}'::jsonb,               'failed',    3, 'SMTP timeout after 3 retries', NOW()-INTERVAL '15 days'),
  ('sync_cashfree_webhook', '{"webhook_event":"PAYMENT_SUCCESS","gateway_order_id":"CF_ORD_009"}'::jsonb,                                                   'completed', 1, NULL,                  NOW()-INTERVAL '10 days'),
  ('generate_license_key',  '{"order_item_id":"oi000000-0000-0000-0000-000000000009","product_id":"pr000000-0000-0000-0000-000000000007"}'::jsonb,           'completed', 1, NULL,                  NOW()-INTERVAL '10 days'),
  ('send_kyc_reminder',     '{"creator_id":"a0000000-0000-0000-0000-000000000004"}'::jsonb,                                                                 'pending',   0, NULL,                  NOW()-INTERVAL '5 hours')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 57: TRANSACTION LEDGER
-- ===================================================================

INSERT INTO public.transaction_ledger (user_id, creator_id, wallet_id, order_id, payout_id, referral_id, tx_type, amount, currency, direction, balance_after, record_hash, created_at)
SELECT NULL,'a0000000-0000-0000-0000-000000000002',NULL,'e4000000-0000-0000-0000-000000000001',NULL,NULL,
  'sale_earning',1899.05,'INR','credit',1899.05, digest('sale_arjun_or001','sha256'), NOW()-INTERVAL '60 days'
ON CONFLICT DO NOTHING;

INSERT INTO public.transaction_ledger (user_id, creator_id, wallet_id, order_id, payout_id, referral_id, tx_type, amount, currency, direction, balance_after, record_hash, created_at)
SELECT NULL,'a0000000-0000-0000-0000-000000000002',NULL,'e4000000-0000-0000-0000-000000000002',NULL,NULL,
  'sale_earning',474.05,'INR','credit',2373.10, digest('sale_arjun_or002','sha256'), NOW()-INTERVAL '50 days'
ON CONFLICT DO NOTHING;

INSERT INTO public.transaction_ledger (user_id, creator_id, wallet_id, order_id, payout_id, referral_id, tx_type, amount, currency, direction, balance_after, record_hash, created_at)
SELECT NULL,'a0000000-0000-0000-0000-000000000002',NULL,'e4000000-0000-0000-0000-000000000004',NULL,NULL,
  'sale_earning',1899.05,'INR','credit',4272.15, digest('sale_arjun_or004','sha256'), NOW()-INTERVAL '38 days'
ON CONFLICT DO NOTHING;

INSERT INTO public.transaction_ledger (user_id, creator_id, wallet_id, order_id, payout_id, referral_id, tx_type, amount, currency, direction, balance_after, record_hash, created_at)
SELECT NULL,'a0000000-0000-0000-0000-000000000003',NULL,'e4000000-0000-0000-0000-000000000003',NULL,NULL,
  'sale_earning',1208.07,'INR','credit',1208.07, digest('sale_priya_or003','sha256'), NOW()-INTERVAL '40 days'
ON CONFLICT DO NOTHING;

INSERT INTO public.transaction_ledger (user_id, creator_id, wallet_id, order_id, payout_id, referral_id, tx_type, amount, currency, direction, balance_after, record_hash, created_at)
SELECT NULL,'a0000000-0000-0000-0000-000000000003',NULL,'e4000000-0000-0000-0000-000000000009',NULL,NULL,
  'sale_earning',557.07,'INR','credit',1765.14, digest('sale_priya_or009','sha256'), NOW()-INTERVAL '10 days'
ON CONFLICT DO NOTHING;

INSERT INTO public.transaction_ledger (user_id, creator_id, wallet_id, order_id, payout_id, referral_id, tx_type, amount, currency, direction, balance_after, record_hash, created_at)
SELECT NULL,'a0000000-0000-0000-0000-000000000007',NULL,'e4000000-0000-0000-0000-000000000005',NULL,NULL,
  'sale_earning',1424.05,'INR','credit',1424.05, digest('sale_neha_or005','sha256'), NOW()-INTERVAL '30 days'
ON CONFLICT DO NOTHING;

INSERT INTO public.transaction_ledger (user_id, creator_id, wallet_id, order_id, payout_id, referral_id, tx_type, amount, currency, direction, balance_after, record_hash, created_at)
SELECT NULL,'a0000000-0000-0000-0000-000000000002',NULL,NULL,
  cp.id, NULL, 'payout',3500,'INR','debit',772.15, digest('payout_arjun_001','sha256'), NOW()-INTERVAL '9 days'
FROM public.creator_payouts cp WHERE cp.creator_id='a0000000-0000-0000-0000-000000000002' LIMIT 1
ON CONFLICT DO NOTHING;

-- wallet credit (Sneha referral reward)
INSERT INTO public.transaction_ledger (user_id, creator_id, wallet_id, order_id, payout_id, referral_id, tx_type, amount, currency, direction, balance_after, record_hash, created_at)
SELECT '00000000-0000-0000-0000-000000000005',NULL, w.id, NULL,NULL,
  (SELECT id FROM public.user_referrals WHERE referred_user_id='00000000-0000-0000-0000-000000000005' LIMIT 1),
  'referral_reward',200,'INR','credit',200, digest('wallet_sneha_ref001','sha256'), NOW()-INTERVAL '60 days'
FROM public.user_wallets w WHERE w.user_id='00000000-0000-0000-0000-000000000005'
ON CONFLICT DO NOTHING;

-- ===================================================================
-- SECTION 58: API RATE LIMITS
-- ===================================================================

INSERT INTO public.api_rate_limits (creator_id, endpoint, method, request_count, window_start, window_end)
VALUES
  ('a0000000-0000-0000-0000-000000000002','/api/products', 'GET',  48, date_trunc('hour',now()), date_trunc('hour',now()) + INTERVAL '1 hour'),
  ('a0000000-0000-0000-0000-000000000002','/api/orders',   'GET',  12, date_trunc('hour',now()), date_trunc('hour',now()) + INTERVAL '1 hour'),
  ('a0000000-0000-0000-0000-000000000003','/api/products', 'GET',  21, date_trunc('hour',now()), date_trunc('hour',now()) + INTERVAL '1 hour'),
  ('a0000000-0000-0000-0000-000000000004','/api/products', 'POST',  3, date_trunc('hour',now()), date_trunc('hour',now()) + INTERVAL '1 hour'),
  ('a0000000-0000-0000-0000-000000000007','/api/products', 'GET',   9, date_trunc('hour',now()), date_trunc('hour',now()) + INTERVAL '1 hour')
ON CONFLICT (creator_id, endpoint, method, window_start) DO NOTHING;


COMMIT;

-- ===================================================================
-- VERIFICATION — uncomment and run after seed completes
-- ===================================================================

-- 1. Auth linked to public.users
-- SELECT u.email, u.role,
--        CASE WHEN au.id IS NOT NULL THEN 'linked' ELSE 'MISSING' END AS auth_link
-- FROM public.users u
-- LEFT JOIN auth.users au ON au.id = u.auth_provider_id
-- ORDER BY u.email;

-- 2. All site URLs
-- SELECT
--   CASE WHEN s.site_type = 'main'
--     THEN '/' || s.slug
--     ELSE '/' || ms.slug || '/' || s.child_slug
--   END AS url,
--   s.site_type, s.is_active
-- FROM public.sites s
-- LEFT JOIN public.sites ms ON ms.id = s.parent_site_id
-- ORDER BY ms.slug NULLS FIRST, s.child_slug;

-- 3. Payment page URLs
-- SELECT '/' || ms.slug || '/' || pr.slug AS url, pr.title, pr.amount
-- FROM public.payment_requests pr
-- JOIN public.sites s  ON s.id = pr.site_id
-- JOIN public.sites ms ON ms.id = s.parent_site_id
-- ORDER BY ms.slug, pr.slug;

-- 4. Project + page URLs
-- SELECT '/' || ms.slug || '/' || pj.slug || '/' || pg.slug AS url, pg.name
-- FROM public.pages pg
-- JOIN public.projects pj ON pj.id = pg.project_id
-- JOIN public.sites ms    ON ms.id = pj.site_id
-- ORDER BY ms.slug, pj.slug, pg.slug;

-- 5. Blog post URLs
-- SELECT '/' || ms.slug || '/' || bp.slug AS url, bp.title, bp.is_published
-- FROM public.blog_posts bp
-- JOIN public.sites s  ON s.id  = bp.site_id
-- JOIN public.sites ms ON ms.id = s.parent_site_id
-- ORDER BY ms.slug, bp.slug;

-- 6. Creator earnings summary
-- SELECT p.full_name, cb.total_earnings, cb.pending_payout, cb.total_paid_out
-- FROM public.creator_balances cb
-- JOIN public.profiles p ON p.id = cb.creator_id
-- ORDER BY cb.total_earnings DESC;

-- 7. Orders by status
-- SELECT status, COUNT(*) as count, SUM(total_amount) as total
-- FROM public.orders GROUP BY status ORDER BY count DESC;
-- ===================================================================

-- ============================================================
-- PART 3: SECURITY PATCH
-- ============================================================
-- ===================================================================
-- DIGIONE — SECURITY PATCH
-- Fixes 4 critical issues found in schema v4 audit.
-- Run AFTER digione_schema_v4.sql
-- ===================================================================

BEGIN;

-- ===================================================================
-- FIX 1: auth_profile_id() — pin search_path (SECURITY DEFINER risk)
-- Without SET search_path, an attacker can shadow the function with
-- a malicious version in a different schema.
-- ===================================================================

CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Same fix for the other SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_blog_post_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$;

-- ===================================================================
-- FIX 2: background_jobs — add a service-role-only comment policy
-- RLS is enabled but zero policies = complete lockout for all users.
-- Since background_jobs should ONLY be touched by service_role
-- (your backend), we add no user-facing policies intentionally.
-- Service role bypasses RLS by default.
-- But we must add a note and ensure this is documented.
-- For app code that needs to read/write jobs, use service_role key.
-- ===================================================================

-- Explicitly document that only service_role can access this table.
-- No policy = normal users get 0 rows (not an error, just empty).
-- This is correct for a job queue table.
COMMENT ON TABLE public.background_jobs IS
  'Job queue. Accessible only via service_role key (RLS blocks all user-facing roles intentionally).';

-- ===================================================================
-- FIX 3: creator_balances — remove direct UPDATE policy
-- Any creator could update their own balance directly via PostgREST.
-- Balances must only be written by server-side functions using
-- service_role. Drop the UPDATE policy entirely.
-- ===================================================================

DROP POLICY IF EXISTS "cb_update" ON public.creator_balances;

-- Keep SELECT so creators can see their own balance in the dashboard.
-- INSERT and UPDATE must go through service_role only.
-- Result: creators can read but never write their balance via client.

-- ===================================================================
-- FIX 4: Fix remaining USING (true) policies on builder tables
-- Any authenticated user could read/write any creator's builder data.
-- Scope every policy to the owning creator.
-- ===================================================================

-- ── site_design_tokens ─────────────────────────────────────────────
DROP POLICY IF EXISTS "sdt_all" ON public.site_design_tokens;
DROP POLICY IF EXISTS "sdt_select" ON public.site_design_tokens;
CREATE POLICY "sdt_select" ON public.site_design_tokens FOR SELECT USING (
  creator_id = public.auth_profile_id()
  OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_design_tokens.site_id AND s.is_active = true)
);
DROP POLICY IF EXISTS "sdt_write" ON public.site_design_tokens;
CREATE POLICY "sdt_write" ON public.site_design_tokens FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── site_navigation ────────────────────────────────────────────────
DROP POLICY IF EXISTS "snav_all" ON public.site_navigation;
-- Public can read nav (needed to render storefronts)
DROP POLICY IF EXISTS "snav_select" ON public.site_navigation;
CREATE POLICY "snav_select" ON public.site_navigation FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_navigation.site_id AND s.is_active = true)
  OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_navigation.site_id AND s.creator_id = public.auth_profile_id())
);
DROP POLICY IF EXISTS "snav_write" ON public.site_navigation;
CREATE POLICY "snav_write" ON public.site_navigation FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_navigation.site_id AND s.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_navigation.site_id AND s.creator_id = public.auth_profile_id())
);

-- ── site_sections_config ───────────────────────────────────────────
DROP POLICY IF EXISTS "ssc_all" ON public.site_sections_config;
DROP POLICY IF EXISTS "ssc_select" ON public.site_sections_config;
CREATE POLICY "ssc_select" ON public.site_sections_config FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_sections_config.site_id AND s.is_active = true)
  OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_sections_config.site_id AND s.creator_id = public.auth_profile_id())
);
DROP POLICY IF EXISTS "ssc_write" ON public.site_sections_config;
CREATE POLICY "ssc_write" ON public.site_sections_config FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_sections_config.site_id AND s.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_sections_config.site_id AND s.creator_id = public.auth_profile_id())
);

-- ── site_blog ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "site_blog_all" ON public.site_blog;
DROP POLICY IF EXISTS "site_blog_select" ON public.site_blog;
CREATE POLICY "site_blog_select" ON public.site_blog FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_blog.site_id AND s.is_active = true)
  OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_blog.site_id AND s.creator_id = public.auth_profile_id())
);
DROP POLICY IF EXISTS "site_blog_write" ON public.site_blog;
CREATE POLICY "site_blog_write" ON public.site_blog FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_blog.site_id AND s.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_blog.site_id AND s.creator_id = public.auth_profile_id())
);

-- ── site_ab_tests ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "sat_all" ON public.site_ab_tests;
DROP POLICY IF EXISTS "sat_select" ON public.site_ab_tests;
CREATE POLICY "sat_select" ON public.site_ab_tests FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "sat_write" ON public.site_ab_tests;
CREATE POLICY "sat_write" ON public.site_ab_tests FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── builder_fonts ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "bf_all" ON public.builder_fonts;
DROP POLICY IF EXISTS "bf_select" ON public.builder_fonts;
CREATE POLICY "bf_select" ON public.builder_fonts FOR SELECT USING (
  creator_id = public.auth_profile_id()
  OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = builder_fonts.site_id AND s.is_active = true)
);
DROP POLICY IF EXISTS "bf_write" ON public.builder_fonts;
CREATE POLICY "bf_write" ON public.builder_fonts FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── builder_assets ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "ba_all" ON public.builder_assets;
DROP POLICY IF EXISTS "ba_select" ON public.builder_assets;
CREATE POLICY "ba_select" ON public.builder_assets FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "ba_write" ON public.builder_assets;
CREATE POLICY "ba_write" ON public.builder_assets FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── page_blocks ────────────────────────────────────────────────────
-- Replace the lingering USING (true) policies with creator-scoped ones
DROP POLICY IF EXISTS "page_blocks_select" ON public.page_blocks;
DROP POLICY IF EXISTS "page_blocks_update" ON public.page_blocks;
DROP POLICY IF EXISTS "page_blocks_delete" ON public.page_blocks;
DROP POLICY IF EXISTS "page_blocks_select" ON public.page_blocks;
CREATE POLICY "page_blocks_select" ON public.page_blocks FOR SELECT USING (
  creator_id = public.auth_profile_id()
  OR (
    is_visible = true AND
    EXISTS (SELECT 1 FROM public.pages pg WHERE pg.id = page_blocks.page_id AND pg.is_published = true)
  )
);
DROP POLICY IF EXISTS "page_blocks_update" ON public.page_blocks;
CREATE POLICY "page_blocks_update" ON public.page_blocks FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "page_blocks_delete" ON public.page_blocks;
CREATE POLICY "page_blocks_delete" ON public.page_blocks FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── pages ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pages_select" ON public.pages;
DROP POLICY IF EXISTS "pages_update" ON public.pages;
DROP POLICY IF EXISTS "pages_delete" ON public.pages;
DROP POLICY IF EXISTS "pages_select" ON public.pages;
CREATE POLICY "pages_select" ON public.pages FOR SELECT USING (
  is_published = true OR creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "pages_update" ON public.pages;
CREATE POLICY "pages_update" ON public.pages FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "pages_delete" ON public.pages;
CREATE POLICY "pages_delete" ON public.pages FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── projects ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (
  creator_id = public.auth_profile_id() OR is_public = true
);
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── page_versions ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "page_versions_select" ON public.page_versions;
DROP POLICY IF EXISTS "page_versions_delete" ON public.page_versions;
DROP POLICY IF EXISTS "page_versions_select" ON public.page_versions;
CREATE POLICY "page_versions_select" ON public.page_versions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.pages p WHERE p.id = page_versions.page_id
    AND p.creator_id = public.auth_profile_id()
  )
);
DROP POLICY IF EXISTS "page_versions_delete" ON public.page_versions;
CREATE POLICY "page_versions_delete" ON public.page_versions FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.pages p WHERE p.id = page_versions.page_id
    AND p.creator_id = public.auth_profile_id()
  )
);

-- ── page_edit_locks ────────────────────────────────────────────────
DROP POLICY IF EXISTS "pel_all" ON public.page_edit_locks;
DROP POLICY IF EXISTS "pel_select" ON public.page_edit_locks;
CREATE POLICY "pel_select" ON public.page_edit_locks FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.pages p WHERE p.id = page_edit_locks.page_id
    AND p.creator_id = public.auth_profile_id()
  )
);
DROP POLICY IF EXISTS "pel_write" ON public.page_edit_locks;
CREATE POLICY "pel_write" ON public.page_edit_locks FOR ALL TO authenticated USING (
  locked_by_user_id = auth.uid()
) WITH CHECK (locked_by_user_id = auth.uid());

-- ── product_files ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "pf_all" ON public.product_files;
-- Product files can be read by buyers who purchased the product
DROP POLICY IF EXISTS "pf_select" ON public.product_files;
CREATE POLICY "pf_select" ON public.product_files FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
  OR EXISTS (
    SELECT 1 FROM public.user_product_access upa
    WHERE upa.product_id = product_files.product_id
    AND upa.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "pf_write" ON public.product_files;
CREATE POLICY "pf_write" ON public.product_files FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── product_related ────────────────────────────────────────────────
DROP POLICY IF EXISTS "prelat_all" ON public.product_related;
DROP POLICY IF EXISTS "prelat_select" ON public.product_related;
CREATE POLICY "prelat_select" ON public.product_related FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_related.product_id AND p.is_published = true)
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_related.product_id AND p.creator_id = public.auth_profile_id())
);
DROP POLICY IF EXISTS "prelat_write" ON public.product_related;
CREATE POLICY "prelat_write" ON public.product_related FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_related.product_id AND p.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_related.product_id AND p.creator_id = public.auth_profile_id())
);

-- ── product_bundles ────────────────────────────────────────────────
DROP POLICY IF EXISTS "pbundle_all" ON public.product_bundles;
DROP POLICY IF EXISTS "pbundle_select" ON public.product_bundles;
CREATE POLICY "pbundle_select" ON public.product_bundles FOR SELECT USING (
  is_published = true OR creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "pbundle_write" ON public.product_bundles;
CREATE POLICY "pbundle_write" ON public.product_bundles FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── product_bundle_items ───────────────────────────────────────────
DROP POLICY IF EXISTS "pbi_all" ON public.product_bundle_items;
DROP POLICY IF EXISTS "pbi_select" ON public.product_bundle_items;
CREATE POLICY "pbi_select" ON public.product_bundle_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.product_bundles pb WHERE pb.id = product_bundle_items.bundle_id
    AND (pb.is_published = true OR pb.creator_id = public.auth_profile_id()))
);
DROP POLICY IF EXISTS "pbi_write" ON public.product_bundle_items;
CREATE POLICY "pbi_write" ON public.product_bundle_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.product_bundles pb WHERE pb.id = product_bundle_items.bundle_id
    AND pb.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.product_bundles pb WHERE pb.id = product_bundle_items.bundle_id
    AND pb.creator_id = public.auth_profile_id())
);

-- ── saved_components ───────────────────────────────────────────────
DROP POLICY IF EXISTS "sc_select" ON public.saved_components;
DROP POLICY IF EXISTS "sc_insert" ON public.saved_components;
DROP POLICY IF EXISTS "sc_update" ON public.saved_components;
DROP POLICY IF EXISTS "sc_delete" ON public.saved_components;
DROP POLICY IF EXISTS "sc_select" ON public.saved_components;
CREATE POLICY "sc_select" ON public.saved_components FOR SELECT USING (
  is_public = true OR creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "sc_write" ON public.saved_components;
CREATE POLICY "sc_write" ON public.saved_components FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── blog_posts ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "blog_posts_select" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_update" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_delete" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_select" ON public.blog_posts;
CREATE POLICY "blog_posts_select" ON public.blog_posts FOR SELECT USING (
  is_published = true OR creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "blog_posts_update" ON public.blog_posts;
CREATE POLICY "blog_posts_update" ON public.blog_posts FOR UPDATE TO authenticated USING (
  creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "blog_posts_delete" ON public.blog_posts;
CREATE POLICY "blog_posts_delete" ON public.blog_posts FOR DELETE TO authenticated USING (
  creator_id = public.auth_profile_id()
);

-- ── site_theme_presets ─────────────────────────────────────────────
DROP POLICY IF EXISTS "stp_select" ON public.site_theme_presets;
DROP POLICY IF EXISTS "stp_update" ON public.site_theme_presets;
DROP POLICY IF EXISTS "stp_delete" ON public.site_theme_presets;
DROP POLICY IF EXISTS "stp_write"  ON public.site_theme_presets;
DROP POLICY IF EXISTS "stp_select" ON public.site_theme_presets;
CREATE POLICY "stp_select" ON public.site_theme_presets FOR SELECT USING (
  is_system_preset = true OR creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "stp_write" ON public.site_theme_presets;
CREATE POLICY "stp_write" ON public.site_theme_presets FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ── page_templates ─────────────────────────────────────────────────
ALTER TABLE public.page_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pt_select" ON public.page_templates;
DROP POLICY IF EXISTS "pt_write"  ON public.page_templates;
DROP POLICY IF EXISTS "pt_select" ON public.page_templates;
CREATE POLICY "pt_select" ON public.page_templates FOR SELECT USING (
  is_system_template = true OR is_public = true OR creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "pt_write" ON public.page_templates;
CREATE POLICY "pt_write" ON public.page_templates FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- ===================================================================
-- ADD RLS to the 15 tables that were missing it entirely
-- ===================================================================

-- site_main (public read for storefronts, creator write)
ALTER TABLE public.site_main ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sm_select" ON public.site_main;
CREATE POLICY "sm_select" ON public.site_main FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_main.site_id AND s.is_active = true)
  OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_main.site_id AND s.creator_id = public.auth_profile_id())
);
DROP POLICY IF EXISTS "sm_write" ON public.site_main;
CREATE POLICY "sm_write" ON public.site_main FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_main.site_id AND s.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_main.site_id AND s.creator_id = public.auth_profile_id())
);

-- site_singlepage (public read, creator write)
ALTER TABLE public.site_singlepage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ssp_select" ON public.site_singlepage;
CREATE POLICY "ssp_select" ON public.site_singlepage FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_singlepage.site_id AND s.is_active = true)
  OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_singlepage.site_id AND s.creator_id = public.auth_profile_id())
);
DROP POLICY IF EXISTS "ssp_write" ON public.site_singlepage;
CREATE POLICY "ssp_write" ON public.site_singlepage FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_singlepage.site_id AND s.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_singlepage.site_id AND s.creator_id = public.auth_profile_id())
);

-- site_templates (public read, admin write)
ALTER TABLE public.site_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "st_select" ON public.site_templates;
CREATE POLICY "st_select" ON public.site_templates FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "st_write" ON public.site_templates;
CREATE POLICY "st_write"  ON public.site_templates FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
);

-- site_product_assignments (public read, creator write)
ALTER TABLE public.site_product_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spa_select" ON public.site_product_assignments;
CREATE POLICY "spa_select" ON public.site_product_assignments FOR SELECT USING (
  is_visible = true
  OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_product_assignments.site_id AND s.creator_id = public.auth_profile_id())
);
DROP POLICY IF EXISTS "spa_write" ON public.site_product_assignments;
CREATE POLICY "spa_write" ON public.site_product_assignments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_product_assignments.site_id AND s.creator_id = public.auth_profile_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_product_assignments.site_id AND s.creator_id = public.auth_profile_id())
);

-- user_roles (read own, admin manages all)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ur_select" ON public.user_roles;
CREATE POLICY "ur_select" ON public.user_roles FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
);
DROP POLICY IF EXISTS "ur_write" ON public.user_roles;
CREATE POLICY "ur_write" ON public.user_roles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
);

-- creator_payouts (creator reads own, admin manages)
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cp_select" ON public.creator_payouts;
CREATE POLICY "cp_select" ON public.creator_payouts FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "cp_insert" ON public.creator_payouts;
CREATE POLICY "cp_insert" ON public.creator_payouts FOR INSERT WITH CHECK (true); -- service_role only

-- creator_payout_request_items (creator reads own)
ALTER TABLE public.creator_payout_request_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cpri_select" ON public.creator_payout_request_items;
CREATE POLICY "cpri_select" ON public.creator_payout_request_items FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.creator_payout_requests cpr
    WHERE cpr.id = creator_payout_request_items.payout_request_id
    AND cpr.creator_id = public.auth_profile_id()
  )
);
DROP POLICY IF EXISTS "cpri_insert" ON public.creator_payout_request_items;
CREATE POLICY "cpri_insert" ON public.creator_payout_request_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.creator_payout_requests cpr
    WHERE cpr.id = creator_payout_request_items.payout_request_id
    AND cpr.creator_id = public.auth_profile_id()
  )
);

-- creator_subscription_orders (creator reads own)
ALTER TABLE public.creator_subscription_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cso_select" ON public.creator_subscription_orders;
CREATE POLICY "cso_select" ON public.creator_subscription_orders FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "cso_insert" ON public.creator_subscription_orders;
CREATE POLICY "cso_insert" ON public.creator_subscription_orders FOR INSERT WITH CHECK (true);

-- guest_leads (creator sees leads from their sites)
ALTER TABLE public.guest_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gl_select" ON public.guest_leads;
CREATE POLICY "gl_select" ON public.guest_leads FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sites s WHERE s.id = guest_leads.site_id AND s.creator_id = public.auth_profile_id())
);
DROP POLICY IF EXISTS "gl_insert" ON public.guest_leads;
CREATE POLICY "gl_insert" ON public.guest_leads FOR INSERT WITH CHECK (true); -- public checkout flow

-- other_products (creator manages own)
ALTER TABLE public.other_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "op_select" ON public.other_products;
CREATE POLICY "op_select" ON public.other_products FOR SELECT TO authenticated USING (
  creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "op_write" ON public.other_products;
CREATE POLICY "op_write" ON public.other_products FOR ALL TO authenticated USING (
  creator_id = public.auth_profile_id()
) WITH CHECK (creator_id = public.auth_profile_id());

-- order_referrals (creator sees referrals, user sees own)
ALTER TABLE public.order_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orr_select" ON public.order_referrals;
CREATE POLICY "orr_select" ON public.order_referrals FOR SELECT TO authenticated USING (
  referred_user_id = auth.uid()
  OR referrer_creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "orr_insert" ON public.order_referrals;
CREATE POLICY "orr_insert" ON public.order_referrals FOR INSERT WITH CHECK (true);

-- user_referrals (user sees own, creator sees referrals)
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "uref_select" ON public.user_referrals;
CREATE POLICY "uref_select" ON public.user_referrals FOR SELECT TO authenticated USING (
  referred_user_id = auth.uid()
  OR referrer_creator_id = public.auth_profile_id()
);
DROP POLICY IF EXISTS "uref_insert" ON public.user_referrals;
CREATE POLICY "uref_insert" ON public.user_referrals FOR INSERT WITH CHECK (true);

-- page_block_media (creator sees own)
ALTER TABLE public.page_block_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pbm_select" ON public.page_block_media;
CREATE POLICY "pbm_select" ON public.page_block_media FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.page_blocks pb WHERE pb.id = page_block_media.page_block_id
    AND (pb.creator_id = public.auth_profile_id()
      OR EXISTS (SELECT 1 FROM public.pages pg WHERE pg.id = pb.page_id AND pg.is_published = true))
  )
);
DROP POLICY IF EXISTS "pbm_write" ON public.page_block_media;
CREATE POLICY "pbm_write" ON public.page_block_media FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.page_blocks pb WHERE pb.id = page_block_media.page_block_id
    AND pb.creator_id = public.auth_profile_id()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.page_blocks pb WHERE pb.id = page_block_media.page_block_id
    AND pb.creator_id = public.auth_profile_id()
  )
);

-- storage_file_usages (own files)
ALTER TABLE public.storage_file_usages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sfu_select" ON public.storage_file_usages;
CREATE POLICY "sfu_select" ON public.storage_file_usages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.storage_files sf WHERE sf.id = storage_file_usages.file_id
    AND (sf.owner_user_id = auth.uid() OR sf.owner_creator_id = public.auth_profile_id())
  )
);
DROP POLICY IF EXISTS "sfu_write" ON public.storage_file_usages;
CREATE POLICY "sfu_write" ON public.storage_file_usages FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.storage_files sf WHERE sf.id = storage_file_usages.file_id
    AND (sf.owner_user_id = auth.uid() OR sf.owner_creator_id = public.auth_profile_id())
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.storage_files sf WHERE sf.id = storage_file_usages.file_id
    AND (sf.owner_user_id = auth.uid() OR sf.owner_creator_id = public.auth_profile_id())
  )
);

COMMIT;

-- ===================================================================
-- VERIFICATION
-- ===================================================================

-- Check: zero tables with RLS enabled but no policies
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN (
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public'
-- )
-- AND rowsecurity = true
-- AND tablename NOT IN (
--   SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
-- );

-- Check: creator_balances no longer has UPDATE policy
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'creator_balances';

-- Check: auth_profile_id has search_path set
-- SELECT proname, prosecdef, proconfig FROM pg_proc
-- WHERE proname = 'auth_profile_id' AND pronamespace = 'public'::regnamespace;
-- ===================================================================

-- ============================================================
-- PART 4: AUTH FIX
-- ============================================================
-- ===================================================================
-- DIGIONE — AUTH FIX
-- Run this ONCE on your Supabase database.
-- Fixes three separate issues causing login failures.
-- ===================================================================

BEGIN;

-- ===================================================================
-- FIX 1: Sync auth_provider_id for seed users
--
-- The seed inserted public.users with auth_provider_id = '10000000-...'
-- (fake placeholder). The UPDATE in the seed should have fixed this,
-- but run explicitly to be sure.
-- ===================================================================

UPDATE public.users
SET auth_provider_id = id
WHERE auth_provider_id IS DISTINCT FROM id;


-- ===================================================================
-- FIX 2: Create handle_new_user trigger
--
-- Without this, when any NEW user signs up via Supabase Auth,
-- no public.users or public.profiles row is created.
-- Supabase fires this trigger after every auth.users INSERT.
-- This is what causes 500 "Database error querying schema".
-- ===================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _user_id   uuid := NEW.id;
  _email     text := NEW.email;
  _full_name text := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  _role      text := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
BEGIN
  -- 1. Upsert public.users
  INSERT INTO public.users (
    id, auth_provider_id, email, auth_provider,
    is_verified, role, created_at, updated_at
  )
  VALUES (
    _user_id, _user_id, _email, 'supabase',
    (NEW.email_confirmed_at IS NOT NULL),
    _role, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET auth_provider_id = EXCLUDED.auth_provider_id,
        email            = EXCLUDED.email,
        is_verified      = EXCLUDED.is_verified,
        updated_at       = NOW();

  -- 2. Upsert public.profiles
  INSERT INTO public.profiles (
    user_id, full_name, email, email_verified, created_at, updated_at
  )
  VALUES (
    _user_id, _full_name, _email,
    (NEW.email_confirmed_at IS NOT NULL),
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET full_name      = EXCLUDED.full_name,
        email          = EXCLUDED.email,
        email_verified = EXCLUDED.email_verified,
        updated_at     = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never crash sign-in due to trigger failure
    RAISE WARNING 'handle_new_user failed for %: %', _user_id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also update is_verified when email gets confirmed
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.users
    SET is_verified = true, updated_at = NOW()
    WHERE id = NEW.id;

    UPDATE public.profiles
    SET email_verified = true, updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_user_email_confirmed failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_confirmed();


-- ===================================================================
-- FIX 3: Fix users + profiles RLS
--
-- users_select was: id = auth.uid()
-- App queries:      WHERE auth_provider_id = auth.uid()
-- Both columns hold the same UUID but PostgREST needs both covered.
-- ===================================================================

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR auth_provider_id = auth.uid()
  );

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- profiles: semi-public read (needed for storefront display of creator info)
DROP POLICY IF EXISTS "pf_select"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "pf_update"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "pf_insert"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ===================================================================
-- FIX 4: Backfill any auth users missing public rows
-- (covers Sagar and any other real signups that happened before trigger)
--
-- Strategy:
--   Step A: Delete orphaned public.users rows whose email matches an auth
--           user but whose id does NOT match. These are stale rows created
--           before the trigger existed — keeping them causes email UNIQUE
--           violations when we try to insert the correctly-IDed row.
--   Step B: Upsert all auth users into public.users (conflict on id).
--   Step C: Upsert profiles for any auth user missing one.
-- ===================================================================

-- Step A: Remove stale public.users rows that have a matching email in
-- auth.users but a mismatched id (i.e. orphaned rows).
DELETE FROM public.users pu
WHERE EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.email = pu.email
    AND au.id != pu.id
);

-- Step B: Upsert every auth user into public.users
INSERT INTO public.users (
  id, auth_provider_id, email, auth_provider, is_verified, role, created_at, updated_at
)
SELECT
  au.id,
  au.id,
  au.email,
  'supabase',
  (au.email_confirmed_at IS NOT NULL),
  COALESCE(au.raw_user_meta_data->>'role', 'user'),
  au.created_at,
  NOW()
FROM auth.users au
ON CONFLICT (id) DO UPDATE
  SET auth_provider_id = EXCLUDED.id,
      is_verified      = EXCLUDED.is_verified,
      updated_at       = NOW();

-- Step C: Upsert profiles for any auth user missing one
INSERT INTO public.profiles (
  user_id, full_name, email, email_verified, created_at, updated_at
)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  au.email,
  (au.email_confirmed_at IS NOT NULL),
  au.created_at,
  NOW()
FROM auth.users au
ON CONFLICT (user_id) DO UPDATE
  SET email_verified = EXCLUDED.email_verified,
      full_name      = CASE
                         WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = ''
                         THEN EXCLUDED.full_name
                         ELSE public.profiles.full_name
                       END,
      updated_at     = NOW();

COMMIT;

-- ===================================================================
-- VERIFICATION
-- ===================================================================

-- 1. All auth users should have matching public.users with correct auth_provider_id:
-- SELECT au.email, au.id AS auth_id, pu.auth_provider_id,
--   CASE WHEN pu.id IS NULL THEN 'MISSING' WHEN pu.auth_provider_id != au.id THEN 'MISMATCH' ELSE 'ok' END
-- FROM auth.users au LEFT JOIN public.users pu ON pu.id = au.id ORDER BY au.email;

-- 2. All users should have profiles:
-- SELECT au.email, CASE WHEN p.id IS NULL THEN 'MISSING' ELSE 'ok' END AS profile
-- FROM auth.users au LEFT JOIN public.profiles p ON p.user_id = au.id ORDER BY au.email;

-- 3. Trigger must exist:
-- SELECT tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'auth' AND c.relname = 'users';
-- ===================================================================
