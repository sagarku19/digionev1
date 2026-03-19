-- =====================================================================
-- DigiOne — Clean Schema (No RLS · No Policies · No Seed)
-- Version: v5 — Migration-safe storage + auth triggers
-- Run on a fresh Supabase project or drop all tables first.
-- All DDL is idempotent (IF NOT EXISTS).
--
-- Changes from v4:
--   STORAGE: storage_files now has provider + provider_bucket +
--            provider_path + cdn_url + mime_type + checksum_sha256
--            Migrating to DigitalOcean = update provider/cdn_url only.
--            media_library + product_files gain storage_file_id FK.
--   AUTH:    RLS disabled on all tables — no policies at all.
--            handle_new_user + handle_user_email_confirmed triggers kept.
--            These auto-create public.users + public.profiles on signup.
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- =====================================================================
-- SECTION 1: ENUMS
-- =====================================================================
DO $$ BEGIN CREATE TYPE order_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded',
    'cancelled'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE payout_status AS ENUM ('pending', 'initiated', 'processed', 'failed');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE kyc_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE subscription_plan_type AS ENUM ('free', 'plus', 'pro');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE user_role_type AS ENUM ('super_admin', 'creator', 'user');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE wallet_direction AS ENUM ('credit', 'debit');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE payout_type AS ENUM ('upi', 'bank_transfer');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE page_block_type AS ENUM (
    'hero',
    'text',
    'image',
    'image_gallery',
    'video',
    'product_showcase',
    'cta_button',
    'testimonial',
    'faq',
    'newsletter',
    'columns',
    'divider',
    'pricing_table',
    'form',
    'countdown',
    'rich_text',
    'embed',
    'custom_html'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE page_type AS ENUM (
    'landing',
    'product',
    'about',
    'contact',
    'blog',
    'custom'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE offer_type AS ENUM ('percentage', 'fixed_amount', 'free_period');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE layout_role_type AS ENUM ('section', 'row', 'column', 'block');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE site_section_type AS ENUM (
    'hero_banner',
    'featured_products',
    'product_grid',
    'testimonials',
    'about_creator',
    'faq_accordion',
    'countdown_timer',
    'social_proof',
    'email_capture',
    'video_showcase',
    'rich_text',
    'image_gallery',
    'product_comparison',
    'pricing_table',
    'announcement_bar',
    'sticky_cta',
    'trust_badges',
    'custom_html'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE ab_test_status AS ENUM ('draft', 'running', 'paused', 'concluded');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE builder_asset_type AS ENUM (
    'icon_set',
    'font',
    'lottie_animation',
    'pattern',
    'illustration',
    'stock_image'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE font_source_type AS ENUM ('google', 'custom_upload', 'system');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE device_type AS ENUM ('desktop', 'mobile', 'tablet');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE conversion_event_type AS ENUM ('add_to_cart', 'checkout_start', 'purchase');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE product_relation_type AS ENUM ('upsell', 'cross_sell', 'bundle');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- NEW: storage provider enum — add new providers here when needed
DO $$ BEGIN CREATE TYPE storage_provider_type AS ENUM (
    'supabase',
    'digitalocean',
    'aws_s3',
    'cloudflare_r2',
    'gcs',
    'bunny'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- =====================================================================
-- SECTION 2: CORE TABLES
-- =====================================================================
-- Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type subscription_plan_type NOT NULL UNIQUE,
    plan_name text NOT NULL,
    platform_fee_percent numeric NOT NULL CHECK (
        platform_fee_percent >= 0
        AND platform_fee_percent <= 100
    ),
    monthly_price numeric NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
    yearly_price numeric NOT NULL DEFAULT 0 CHECK (yearly_price >= 0),
    description text,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
INSERT INTO public.subscription_plans (
        plan_type,
        plan_name,
        platform_fee_percent,
        monthly_price,
        yearly_price,
        description,
        features,
        is_active
    )
VALUES (
        'free',
        'Free Plan',
        10.0,
        0,
        0,
        'Perfect for getting started',
        '["basic_analytics","up_to_10_products"]'::jsonb,
        true
    ),
    (
        'plus',
        'Plus Plan',
        7.0,
        500,
        5500,
        'Great for growing creators',
        '["advanced_analytics","up_to_100_products","email_support","custom_domain"]'::jsonb,
        true
    ),
    (
        'pro',
        'Pro Plan',
        5.0,
        1000,
        10000,
        'Best for professionals',
        '["full_analytics","unlimited_products","priority_support","custom_domain","api_access","advanced_marketing"]'::jsonb,
        true
    ) ON CONFLICT (plan_type) DO NOTHING;
-- Subscription Offers
CREATE TABLE IF NOT EXISTS public.subscription_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_plan_id uuid NOT NULL,
    offer_name text NOT NULL,
    offer_type offer_type NOT NULL,
    discount_value numeric NOT NULL CHECK (discount_value > 0),
    description text,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    max_redemptions integer,
    redeemed_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    apply_to_new_only boolean DEFAULT false,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Subscription Offer Redemptions
CREATE TABLE IF NOT EXISTS public.subscription_offer_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id uuid NOT NULL,
    offer_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    discount_amount numeric NOT NULL CHECK (discount_amount > 0),
    applied_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);
-- =====================================================================
-- STORAGE: Migration-safe file storage
-- =====================================================================
-- HOW TO MIGRATE TO DIGITALOCEAN SPACES (or any other provider):
--   1. Copy files from Supabase bucket to DigitalOcean bucket
--   2. UPDATE public.storage_files
--      SET provider = 'digitalocean',
--          provider_bucket = 'digione-prod',
--          provider_path = provider_path,  -- same path structure
--          cdn_url = 'https://digione-prod.blr1.cdn.digitaloceanspaces.com/' || provider_path
--      WHERE provider = 'supabase';
--   3. UPDATE public.media_library SET storage_url = sf.cdn_url
--      FROM public.storage_files sf WHERE sf.id = media_library.storage_file_id;
--   4. Done. All apps reading cdn_url get the new URL automatically.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.storage_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Provider abstraction — the migration pivot point
    provider storage_provider_type NOT NULL DEFAULT 'supabase',
    provider_bucket text NOT NULL,
    provider_path text NOT NULL,
    -- cdn_url is what ALL application code reads — update this on migration
    -- For Supabase:       https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
    -- For DigitalOcean:   https://<bucket>.<region>.cdn.digitaloceanspaces.com/<path>
    -- For Cloudflare R2:  https://<custom>.r2.dev/<path>
    cdn_url text NOT NULL,
    -- Keep for backward compat with any code that still reads public_url
    -- Deprecated: use cdn_url instead
    public_url text GENERATED ALWAYS AS (cdn_url) STORED,
    -- File metadata
    owner_user_id uuid,
    owner_creator_id uuid,
    file_name text,
    file_type text,
    mime_type text,
    size_bytes bigint CHECK (size_bytes > 0),
    -- Migration integrity — SHA-256 of file content
    -- Verify this matches after copying to new provider
    checksum_sha256 text,
    -- Status
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'migrating')),
    metadata jsonb DEFAULT '{}'::jsonb,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT uq_storage_file UNIQUE (provider, provider_bucket, provider_path)
);
-- Storage File Usages — track where each file is used
CREATE TABLE IF NOT EXISTS public.storage_file_usages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    field_name text,
    created_at timestamptz DEFAULT now()
);
-- =====================================================================
-- Media Library
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.media_library (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    -- storage_file_id links to the migration-safe storage record
    -- NULL for legacy records; set for all new uploads
    storage_file_id uuid,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size bigint NOT NULL CHECK (file_size > 0),
    media_type text NOT NULL CHECK (
        media_type IN ('image', 'video', 'document', 'other')
    ),
    -- storage_url reads from storage_files.cdn_url via app layer
    -- Keep this column for direct access; keep in sync with storage_files.cdn_url
    storage_url text NOT NULL,
    thumbnail_url text,
    duration_seconds integer,
    width integer,
    height integer,
    alt_text text,
    description text,
    tags text [],
    is_favorite boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Users
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_provider_id uuid UNIQUE,
    email text UNIQUE,
    phone text UNIQUE,
    auth_provider text DEFAULT 'supabase',
    is_verified boolean DEFAULT false,
    role text DEFAULT 'user',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    full_name text,
    avatar_url text,
    mobile text,
    mobile_verified boolean DEFAULT false,
    email text UNIQUE,
    email_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role user_role_type NOT NULL,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);
-- Site Templates
CREATE TABLE IF NOT EXISTS public.site_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_type text NOT NULL CHECK (site_type IN ('main', 'single', 'payment', 'blog')),
    template_key text NOT NULL,
    name text NOT NULL,
    description text,
    preview_image_url text,
    is_active boolean DEFAULT true,
    default_theme jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Sites
CREATE TABLE IF NOT EXISTS public.sites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    slug text,
    child_slug text,
    parent_site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
    site_type text DEFAULT 'main' CHECK (site_type IN ('main', 'single', 'payment', 'blog')),
    is_active boolean DEFAULT true,
    custom_domain text,
    domain_verified boolean DEFAULT false,
    ssl_status text DEFAULT 'none' CHECK (
        ssl_status IN ('none', 'pending', 'active', 'failed')
    ),
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT uq_sites_slug UNIQUE (slug),
    CONSTRAINT uq_sites_parent_child_slug UNIQUE (parent_site_id, child_slug),
    CONSTRAINT chk_sites_parent_slug_consistency CHECK (
        (
            site_type = 'main'
            AND slug IS NOT NULL
            AND parent_site_id IS NULL
            AND child_slug IS NULL
        )
        OR (
            site_type != 'main'
            AND child_slug IS NOT NULL
            AND parent_site_id IS NOT NULL
            AND slug IS NULL
        )
    )
);
-- Site Main
CREATE TABLE IF NOT EXISTS public.site_main (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL UNIQUE,
    title text NOT NULL,
    description text,
    logo_url text,
    banner_url text,
    template_name text DEFAULT 'default',
    theme jsonb DEFAULT '{"primaryColor":"#6366F1","backgroundColor":"#F9FAFB"}'::jsonb,
    contact_mobile text,
    contact_email text,
    social_links jsonb DEFAULT '{}'::jsonb,
    legal_pages jsonb DEFAULT '{"about_us":false,"terms":false,"privacy":false,"refund":false}'::jsonb,
    meta_keywords text,
    meta_description text,
    custom_css text,
    custom_js text,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Site Single Page
CREATE TABLE IF NOT EXISTS public.site_singlepage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL UNIQUE,
    product_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    hero_image_url text,
    template_name text DEFAULT 'modern',
    theme jsonb DEFAULT '{"accentColor":"#8B5CF6","primaryColor":"#6366F1"}'::jsonb,
    contact_mobile text,
    contact_email text,
    social_links jsonb DEFAULT '{}'::jsonb,
    legal_pages jsonb DEFAULT '{"about_us":false,"terms":false,"privacy":false,"refund":false}'::jsonb,
    show_add_to_cart boolean DEFAULT true,
    show_buy_now boolean DEFAULT true,
    enable_reviews boolean DEFAULT true,
    meta_description text,
    sections_config jsonb,
    countdown_end_at timestamptz,
    social_proof_config jsonb,
    upsell_product_ids uuid [],
    guarantee_badges jsonb DEFAULT '[]'::jsonb,
    faq_items jsonb DEFAULT '[]'::jsonb,
    testimonials jsonb DEFAULT '[]'::jsonb,
    custom_css text,
    custom_js text,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Site Blog
CREATE TABLE IF NOT EXISTS public.site_blog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL UNIQUE,
    title text NOT NULL,
    description text,
    banner_url text,
    logo_url text,
    template_name text DEFAULT 'blog_default',
    theme jsonb DEFAULT '{"primaryColor":"#6366F1","backgroundColor":"#F9FAFB"}'::jsonb,
    contact_mobile text,
    contact_email text,
    social_links jsonb DEFAULT '{}'::jsonb,
    legal_pages jsonb DEFAULT '{"about_us":false,"terms":false,"privacy":false,"refund":false}'::jsonb,
    meta_description text,
    custom_css text,
    custom_js text,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Blog Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    content text,
    thumbnail_url text,
    video_url text,
    video_embed_url text,
    video_source text CHECK (
        video_source IN ('youtube', 'vimeo', 'upload', 'other')
    ),
    duration_seconds integer,
    is_published boolean DEFAULT false,
    is_free boolean DEFAULT true,
    product_id uuid,
    tags text [],
    view_count integer DEFAULT 0,
    sort_order integer DEFAULT 0,
    search_vector tsvector,
    published_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT uq_blog_posts_site_slug UNIQUE (site_id, slug)
);
-- Site Product Assignments
CREATE TABLE IF NOT EXISTS public.site_product_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL,
    product_id uuid NOT NULL,
    placement text NOT NULL DEFAULT 'front_main',
    is_visible boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE (site_id, product_id, placement)
);
-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    stock_count integer,
    thumbnail_url text,
    category text,
    is_published boolean DEFAULT false,
    is_on_discover_page boolean DEFAULT false,
    images jsonb DEFAULT '[]'::jsonb,
    content jsonb,
    metadata jsonb,
    product_link text,
    post_purchase_url text,
    post_purchase_instructions text,
    is_licensable boolean DEFAULT false,
    license_type text,
    license_terms text,
    license_metadata jsonb,
    search_vector tsvector,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);
-- Other Products
CREATE TABLE IF NOT EXISTS public.other_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    product_id uuid,
    is_active boolean DEFAULT true,
    is_other_product boolean DEFAULT true,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Guest Leads
CREATE TABLE IF NOT EXISTS public.guest_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL,
    product_id uuid,
    full_name text,
    email text,
    mobile text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'converted')),
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    origin_site_id uuid,
    guest_lead_id uuid,
    total_amount numeric NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'completed',
            'failed',
            'refunded',
            'cancelled'
        )
    ),
    customer_name text,
    customer_email text,
    customer_phone text,
    payment_method text,
    gateway_name text DEFAULT 'cashfree',
    gateway_order_id text,
    gateway_payment_id text,
    gateway_signature text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL,
    product_id uuid,
    price_at_purchase numeric NOT NULL,
    quantity integer DEFAULT 1,
    origin_site_id uuid,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Creator Revenue Shares
CREATE TABLE IF NOT EXISTS public.creator_revenue_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    subscription_id uuid,
    product_id uuid NOT NULL,
    gross_amount numeric NOT NULL CHECK (gross_amount > 0),
    platform_fee_percent numeric NOT NULL CHECK (
        platform_fee_percent >= 0
        AND platform_fee_percent <= 100
    ),
    platform_fee_amount numeric NOT NULL CHECK (platform_fee_amount >= 0),
    creator_earnings_amount numeric NOT NULL CHECK (creator_earnings_amount >= 0),
    currency text DEFAULT 'INR',
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'refunded')),
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Creator Balances (server-write only — no direct client writes)
CREATE TABLE IF NOT EXISTS public.creator_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL UNIQUE,
    total_earnings numeric NOT NULL DEFAULT 0,
    total_platform_fees numeric NOT NULL DEFAULT 0,
    total_paid_out numeric NOT NULL DEFAULT 0,
    pending_payout numeric NOT NULL DEFAULT 0,
    currency text DEFAULT 'INR',
    updated_at timestamptz DEFAULT now()
);
-- Creator Payout Methods
CREATE TABLE IF NOT EXISTS public.creator_payout_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    type payout_type NOT NULL,
    is_default boolean DEFAULT false,
    upi_id text,
    account_holder_name text,
    account_number text,
    ifsc_code text,
    bank_name text,
    branch_name text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    metadata jsonb,
    version integer DEFAULT 1 CHECK (version > 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Creator Payout Requests
CREATE TABLE IF NOT EXISTS public.creator_payout_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    payout_method_id uuid,
    amount numeric NOT NULL,
    currency text DEFAULT 'INR',
    status text NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'processed')
    ),
    admin_notes text,
    rejection_reason text,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Creator Payout Request Items
CREATE TABLE IF NOT EXISTS public.creator_payout_request_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_request_id uuid NOT NULL,
    revenue_share_id uuid NOT NULL,
    amount numeric NOT NULL,
    created_at timestamptz DEFAULT now()
);
-- Creator Payouts
CREATE TABLE IF NOT EXISTS public.creator_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    payout_request_id uuid,
    payout_method_id uuid,
    amount numeric NOT NULL,
    currency text DEFAULT 'INR',
    status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'processed', 'failed')),
    gateway_name text DEFAULT 'cashfree',
    gateway_payout_id text,
    gateway_batch_id text,
    gateway_metadata jsonb,
    initiated_at timestamptz DEFAULT now(),
    processed_at timestamptz,
    failure_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    subscription_plan_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'cancelled', 'expired', 'paused')
    ),
    billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_price numeric NOT NULL DEFAULT 0 CHECK (current_price >= 0),
    current_platform_fee_percent numeric NOT NULL CHECK (
        current_platform_fee_percent >= 0
        AND current_platform_fee_percent <= 100
    ),
    start_date timestamptz DEFAULT now(),
    end_date timestamptz,
    renewal_date timestamptz,
    auto_renew boolean DEFAULT true,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Creator Subscription Orders
CREATE TABLE IF NOT EXISTS public.creator_subscription_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    plan_id text NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'INR',
    status text DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
    gateway_name text DEFAULT 'cashfree',
    gateway_order_id text,
    gateway_payment_id text,
    gateway_signature text,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    paid_at timestamptz
);
-- API Rate Limits
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    endpoint text NOT NULL,
    method text NOT NULL DEFAULT 'GET',
    request_count integer DEFAULT 1,
    window_start timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
    window_end timestamptz NOT NULL DEFAULT date_trunc('hour', now()) + interval '1 hour',
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT uq_api_rate_limit UNIQUE (creator_id, endpoint, method, window_start)
);
-- Payment Requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL,
    slug text,
    title text NOT NULL,
    description text,
    amount numeric,
    is_fixed_amount boolean DEFAULT true,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (site_id, slug)
);
-- Payment Submissions
CREATE TABLE IF NOT EXISTS public.payment_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_request_id uuid NOT NULL,
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    customer_phone text NOT NULL,
    amount numeric NOT NULL,
    payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    payment_method text,
    transaction_id text,
    gateway_name text DEFAULT 'cashfree',
    gateway_order_id text,
    gateway_payment_id text,
    gateway_signature text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);
-- User Carts
CREATE TABLE IF NOT EXISTS public.user_carts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (user_id, product_id)
);
-- User Wishlist
CREATE TABLE IF NOT EXISTS public.user_wishlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb,
    UNIQUE (user_id, product_id)
);
-- User Product Access
CREATE TABLE IF NOT EXISTS public.user_product_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    order_item_id uuid,
    product_id uuid NOT NULL,
    product_name text NOT NULL,
    product_price numeric NOT NULL,
    product_link text NOT NULL,
    snapshot_metadata jsonb,
    created_at timestamptz DEFAULT now()
);
-- Product Licenses
CREATE TABLE IF NOT EXISTS public.product_licenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    user_id uuid,
    product_id uuid NOT NULL,
    license_key text,
    license_type text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    issued_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    snapshot jsonb
);
-- Product Ratings
CREATE TABLE IF NOT EXISTS public.product_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL CHECK (
        rating BETWEEN 1 AND 5
    ),
    review_title text,
    review_text text,
    is_verified_purchase boolean DEFAULT false,
    is_approved boolean DEFAULT false,
    helpful_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (product_id, user_id)
);
-- Affiliates
CREATE TABLE IF NOT EXISTS public.affiliates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    affiliate_user_id uuid NOT NULL,
    commission_percent numeric NOT NULL DEFAULT 10 CHECK (
        commission_percent > 0
        AND commission_percent <= 100
    ),
    is_active boolean DEFAULT true,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (creator_id, affiliate_user_id)
);
-- Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    code text NOT NULL,
    discount_type discount_type NOT NULL,
    discount_value numeric NOT NULL CHECK (discount_value > 0),
    max_uses integer,
    current_uses integer DEFAULT 0 CHECK (current_uses >= 0),
    valid_from timestamptz DEFAULT now(),
    valid_until timestamptz,
    is_active boolean DEFAULT true,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT uq_coupons_creator_code UNIQUE (creator_id, code)
);
-- Referral Codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    owner_user_id uuid,
    owner_creator_id uuid,
    is_active boolean DEFAULT true,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- User Referrals
CREATE TABLE IF NOT EXISTS public.user_referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id uuid NOT NULL,
    referrer_user_id uuid,
    referrer_creator_id uuid,
    referred_user_id uuid NOT NULL,
    reward_status text DEFAULT 'pending' CHECK (reward_status IN ('pending', 'rewarded')),
    reward_amount numeric,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);
-- Order Referrals
CREATE TABLE IF NOT EXISTS public.order_referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL,
    referral_code_id uuid NOT NULL,
    referrer_creator_id uuid,
    referred_user_id uuid,
    commission_amount numeric,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);
-- User Wallets
CREATE TABLE IF NOT EXISTS public.user_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency text DEFAULT 'INR',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- User Wallet Transactions
CREATE TABLE IF NOT EXISTS public.user_wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    related_order_id uuid,
    related_order_referral_id uuid,
    tx_type text NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0),
    direction wallet_direction NOT NULL,
    balance_after numeric NOT NULL,
    status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    description text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);
-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    creator_id uuid,
    site_id uuid,
    subject text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'open' CHECK (
        status IN ('open', 'in_progress', 'resolved', 'closed')
    ),
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_admin_id uuid,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id uuid,
    recipient_creator_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL CHECK (
        type IN (
            'sale',
            'refund',
            'payout',
            'review',
            'kyc_reminder',
            'kyc_rejected',
            'order',
            'wallet'
        )
    ),
    is_read boolean DEFAULT false,
    action_url text,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Email Events
CREATE TABLE IF NOT EXISTS public.email_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    creator_id uuid,
    order_id uuid,
    payout_request_id uuid,
    recipient_email text NOT NULL,
    subject text NOT NULL,
    template_name text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at timestamptz,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);
-- Creator KYC
CREATE TABLE IF NOT EXISTS public.creator_kyc (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'verified', 'rejected', 'expired')
    ),
    kyc_level text NOT NULL DEFAULT 'none' CHECK (kyc_level IN ('none', 'basic', 'full')),
    full_name text,
    legal_name text,
    dob date,
    gender text,
    pan_enc bytea,
    aadhaar_last4 text,
    upi_id_enc bytea,
    bank_account_enc bytea,
    ifsc_code text,
    pan_last4 text,
    pan_verified boolean DEFAULT false,
    pan_verified_at timestamptz,
    pan_name text,
    pan_verification_provider text,
    pan_verification_ref text,
    bank_last4 text,
    bank_verified boolean DEFAULT false,
    bank_verified_at timestamptz,
    bank_account_name text,
    bank_verification_provider text,
    bank_verification_ref text,
    beneficiary_id text,
    beneficiary_metadata jsonb DEFAULT '{}'::jsonb,
    upi_verified boolean DEFAULT false,
    upi_verified_at timestamptz,
    upi_verification_provider text,
    upi_verification_ref text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    postal_code text,
    country text DEFAULT 'IN',
    document_urls jsonb DEFAULT '{}'::jsonb,
    document_hashes jsonb DEFAULT '{}'::jsonb,
    verification_provider text,
    rejection_reason text,
    admin_notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Transaction Ledger (append-only — never UPDATE or DELETE)
CREATE TABLE IF NOT EXISTS public.transaction_ledger (
    id bigserial PRIMARY KEY,
    user_id uuid,
    creator_id uuid,
    wallet_id uuid,
    order_id uuid,
    payout_id uuid,
    referral_id uuid,
    tx_type text NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'INR',
    direction wallet_direction NOT NULL,
    balance_after numeric,
    meta jsonb,
    prev_hash bytea,
    record_hash bytea NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
-- Background Jobs
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending' CHECK (
        status IN ('pending', 'running', 'completed', 'failed')
    ),
    attempts integer DEFAULT 0,
    last_error text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Projects (Visual Builder)
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    site_id uuid,
    name text NOT NULL,
    slug text,
    description text,
    is_public boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);
-- Pages
CREATE TABLE IF NOT EXISTS public.pages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    site_id uuid,
    creator_id uuid,
    slug text NOT NULL,
    page_type page_type NOT NULL DEFAULT 'custom',
    name text NOT NULL,
    title text,
    description text,
    seo_title text,
    seo_description text,
    seo_keywords text,
    status content_status DEFAULT 'draft',
    layout jsonb DEFAULT '{}'::jsonb,
    layout_type text DEFAULT 'custom' CHECK (
        layout_type IN (
            'custom',
            'single_column',
            'two_column',
            'grid',
            'masonry'
        )
    ),
    is_published boolean DEFAULT false,
    is_homepage boolean DEFAULT false,
    view_count integer DEFAULT 0,
    custom_head_html text,
    custom_css text,
    custom_js text,
    thumbnail_url text,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (project_id, slug)
);
-- Page Versions
CREATE TABLE IF NOT EXISTS public.page_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id uuid NOT NULL,
    layout jsonb NOT NULL,
    version_label text,
    is_autosave boolean DEFAULT false,
    created_by_user_id uuid,
    created_at timestamptz DEFAULT now()
);
-- Page Blocks
CREATE TABLE IF NOT EXISTS public.page_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    parent_block_id uuid,
    layout_role layout_role_type NOT NULL DEFAULT 'block',
    block_type page_block_type NOT NULL,
    display_name text,
    sort_order integer NOT NULL DEFAULT 0,
    is_visible boolean DEFAULT true,
    is_locked boolean DEFAULT false,
    padding jsonb,
    margin jsonb,
    background_color text,
    background_image_url text,
    background_video_url text,
    custom_css text,
    custom_id text,
    custom_classes text,
    custom_styles jsonb DEFAULT '{}'::jsonb,
    html_attributes jsonb DEFAULT '{}'::jsonb,
    content jsonb DEFAULT '{}'::jsonb,
    style jsonb DEFAULT '{}'::jsonb,
    animations jsonb DEFAULT '{}'::jsonb,
    responsive_overrides jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Page Block Media
CREATE TABLE IF NOT EXISTS public.page_block_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_block_id uuid NOT NULL,
    media_id uuid NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);
-- Page Templates
CREATE TABLE IF NOT EXISTS public.page_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid,
    template_name text NOT NULL,
    description text,
    page_type page_type NOT NULL,
    template_blocks jsonb NOT NULL,
    thumbnail_url text,
    category text,
    is_system_template boolean DEFAULT false,
    is_public boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    tags text [],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- =====================================================================
-- SECTION 3: VISUAL BUILDER ENHANCEMENTS
-- =====================================================================
-- Site Design Tokens
CREATE TABLE IF NOT EXISTS public.site_design_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL UNIQUE,
    creator_id uuid NOT NULL,
    color_palette jsonb NOT NULL DEFAULT '{"primary":"#6366F1","secondary":"#8B5CF6","accent":"#EC4899","surface":"#F9FAFB","text":"#111827","muted":"#6B7280"}'::jsonb,
    typography jsonb NOT NULL DEFAULT '{"heading_font":"Inter","body_font":"Inter","base_size_px":16,"scale_ratio":1.25}'::jsonb,
    spacing_scale jsonb NOT NULL DEFAULT '{"base_px":4,"xs":4,"sm":8,"md":16,"lg":24,"xl":32,"2xl":48}'::jsonb,
    border_radius_scale jsonb NOT NULL DEFAULT '{"sm":"4px","md":"8px","lg":"12px","xl":"16px","full":"9999px"}'::jsonb,
    shadow_presets jsonb DEFAULT '[]'::jsonb,
    custom_css_variables jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Saved Components
CREATE TABLE IF NOT EXISTS public.saved_components (
    creator_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    component_tree jsonb NOT NULL,
    thumbnail_url text,
    is_public boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    tags text [],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
-- Page Edit Locks (for collaborative editing)
CREATE TABLE IF NOT EXISTS public.page_edit_locks (
    page_id uuid NOT NULL,
    locked_by_user_id uuid NOT NULL,
    session_id text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (page_id)
);
-- Builder Fonts
CREATE TABLE IF NOT EXISTS public.builder_fonts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid,
    creator_id uuid NOT NULL,
    font_name text NOT NULL,
    font_family text NOT NULL,
    source font_source_type NOT NULL DEFAULT 'google',
    google_font_id text,
    custom_url text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);
-- Builder Assets
CREATE TABLE IF NOT EXISTS public.builder_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    asset_type builder_asset_type NOT NULL,
    name text NOT NULL,
    -- storage_url reads from storage_files.cdn_url — update on migration
    storage_url text NOT NULL,
    storage_file_id uuid,
    thumbnail_url text,
    source text,
    metadata jsonb,
    tags text [],
    created_at timestamptz DEFAULT now()
);
-- =====================================================================
-- SECTION 4: SHOPIFY-LIKE BUILDER ENHANCEMENTS
-- =====================================================================
-- Site Sections Config
CREATE TABLE IF NOT EXISTS public.site_sections_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL,
    site_type text NOT NULL CHECK (site_type IN ('main', 'single', 'payment', 'blog')),
    sections jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (site_id)
);
-- Site Theme Presets
CREATE TABLE IF NOT EXISTS public.site_theme_presets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid,
    site_id uuid,
    preset_name text NOT NULL,
    description text,
    theme_data jsonb NOT NULL,
    thumbnail_url text,
    is_system_preset boolean DEFAULT false,
    is_favorite boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Site Navigation
CREATE TABLE IF NOT EXISTS public.site_navigation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL UNIQUE,
    header_logo_url text,
    header_logo_alt text,
    nav_items jsonb DEFAULT '[]'::jsonb,
    show_cart_icon boolean DEFAULT true,
    show_search boolean DEFAULT false,
    sticky_header boolean DEFAULT true,
    footer_columns jsonb DEFAULT '[]'::jsonb,
    footer_bottom_text text,
    social_links jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Site A/B Tests
CREATE TABLE IF NOT EXISTS public.site_ab_tests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    test_name text NOT NULL,
    section_key text NOT NULL,
    variant_a jsonb NOT NULL,
    variant_b jsonb NOT NULL,
    traffic_split_percent integer NOT NULL DEFAULT 50 CHECK (
        traffic_split_percent BETWEEN 1 AND 99
    ),
    status ab_test_status NOT NULL DEFAULT 'draft',
    winner text CHECK (winner IN ('a', 'b')),
    start_at timestamptz,
    end_at timestamptz,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- =====================================================================
-- SECTION 5: PRODUCT ENHANCEMENTS
-- =====================================================================
-- Product Files
CREATE TABLE IF NOT EXISTS public.product_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    file_label text NOT NULL,
    -- storage_url reads from storage_files.cdn_url — update on migration
    storage_url text NOT NULL,
    storage_file_id uuid,
    file_type text,
    file_size_bytes bigint,
    version text DEFAULT '1.0',
    is_primary boolean DEFAULT false,
    download_count integer DEFAULT 0,
    checksum text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (product_id, file_label)
);
-- Product Related
CREATE TABLE IF NOT EXISTS public.product_related (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    related_product_id uuid NOT NULL,
    relation_type product_relation_type NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE (product_id, related_product_id, relation_type)
);
-- Product Bundles
CREATE TABLE IF NOT EXISTS public.product_bundles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    thumbnail_url text,
    bundle_price numeric NOT NULL CHECK (bundle_price >= 0),
    compare_at_price numeric,
    is_published boolean DEFAULT false,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Product Bundle Items
CREATE TABLE IF NOT EXISTS public.product_bundle_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id uuid NOT NULL,
    product_id uuid NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE (bundle_id, product_id)
);
-- =====================================================================
-- SECTION 6: ANALYTICS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.site_page_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL,
    page_slug text,
    session_id text,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device_type device_type,
    country_code char(2),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.product_view_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    site_id uuid,
    session_id text,
    referrer text,
    device_type device_type,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.conversion_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL,
    product_id uuid,
    order_id uuid,
    session_id text,
    event_type conversion_event_type NOT NULL,
    revenue numeric,
    created_at timestamptz NOT NULL DEFAULT now()
);
-- =====================================================================
-- SECTION 7: FOREIGN KEY CONSTRAINTS
-- =====================================================================
DO $$ BEGIN -- Auth / users / profiles
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.user_roles
ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN -- Storage
ALTER TABLE public.storage_files
ADD CONSTRAINT fk_sf_user FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE
SET NULL;
ALTER TABLE public.storage_files
ADD CONSTRAINT fk_sf_creator FOREIGN KEY (owner_creator_id) REFERENCES public.profiles(id) ON DELETE
SET NULL;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.storage_file_usages
ADD CONSTRAINT fk_sfu_file FOREIGN KEY (file_id) REFERENCES public.storage_files(id) ON DELETE CASCADE;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.media_library
ADD CONSTRAINT fk_media_library_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.media_library
ADD CONSTRAINT fk_media_library_storage FOREIGN KEY (storage_file_id) REFERENCES public.storage_files(id) ON DELETE
SET NULL;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN -- Sites
ALTER TABLE public.sites
ADD CONSTRAINT fk_sites_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.site_main
ADD CONSTRAINT fk_site_main_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.site_singlepage
ADD CONSTRAINT fk_sp_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
ALTER TABLE public.site_singlepage
ADD CONSTRAINT fk_sp_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.site_blog
ADD CONSTRAINT fk_site_blog_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.blog_posts
ADD CONSTRAINT fk_blog_posts_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
ALTER TABLE public.blog_posts
ADD CONSTRAINT fk_blog_posts_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN -- Products
ALTER TABLE public.products
ADD CONSTRAINT fk_products_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.product_files
ADD CONSTRAINT fk_pf_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.product_files
ADD CONSTRAINT fk_pf_storage FOREIGN KEY (storage_file_id) REFERENCES public.storage_files(id) ON DELETE
SET NULL;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN -- Orders
ALTER TABLE public.order_items
ADD CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_items
ADD CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE
SET NULL;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN -- Subscriptions
ALTER TABLE public.subscriptions
ADD CONSTRAINT fk_sub_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions
ADD CONSTRAINT fk_sub_plan FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN -- Payouts
ALTER TABLE public.creator_payout_request_items
ADD CONSTRAINT fk_cpri_request FOREIGN KEY (payout_request_id) REFERENCES public.creator_payout_requests(id) ON DELETE CASCADE;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN -- Wallets
ALTER TABLE public.user_wallet_transactions
ADD CONSTRAINT fk_uwt_wallet FOREIGN KEY (wallet_id) REFERENCES public.user_wallets(id) ON DELETE CASCADE;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN -- Visual builder
ALTER TABLE public.page_blocks
ADD CONSTRAINT fk_pb_page FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;
ALTER TABLE public.page_block_media
ADD CONSTRAINT fk_pbm_block FOREIGN KEY (page_block_id) REFERENCES public.page_blocks(id) ON DELETE CASCADE;
ALTER TABLE public.page_block_media
ADD CONSTRAINT fk_pbm_media FOREIGN KEY (media_id) REFERENCES public.media_library(id) ON DELETE CASCADE;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.builder_assets
ADD CONSTRAINT fk_ba_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.builder_assets
ADD CONSTRAINT fk_ba_storage FOREIGN KEY (storage_file_id) REFERENCES public.storage_files(id) ON DELETE
SET NULL;
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- =====================================================================
-- SECTION 8: INDEXES
-- =====================================================================
-- Auth
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users (auth_provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
-- Storage
CREATE INDEX IF NOT EXISTS idx_storage_files_provider ON public.storage_files (provider, status);
CREATE INDEX IF NOT EXISTS idx_storage_files_owner ON public.storage_files (owner_creator_id);
CREATE INDEX IF NOT EXISTS idx_storage_file_usages_file ON public.storage_file_usages (file_id);
CREATE INDEX IF NOT EXISTS idx_storage_file_usages_entity ON public.storage_file_usages (entity_type, entity_id);
-- Media Library
CREATE INDEX IF NOT EXISTS idx_media_library_creator_type ON public.media_library (creator_id, media_type);
CREATE INDEX IF NOT EXISTS idx_media_library_storage_file ON public.media_library (storage_file_id)
WHERE storage_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_library_tags ON public.media_library USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_media_library_favorite ON public.media_library (creator_id, is_favorite)
WHERE is_favorite = true;
-- Sites
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_slug ON public.sites (slug)
WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sites_creator_type ON public.sites (creator_id, site_type);
CREATE INDEX IF NOT EXISTS idx_sites_custom_domain ON public.sites (custom_domain)
WHERE custom_domain IS NOT NULL;
-- Products
CREATE INDEX IF NOT EXISTS idx_products_creator_published ON public.products (creator_id, is_published, created_at DESC)
WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_products_discover ON public.products (is_on_discover_page, created_at DESC)
WHERE is_on_discover_page = true;
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category, is_published);
CREATE INDEX IF NOT EXISTS gin_products_images ON public.products USING GIN (images);
-- Product Files
CREATE INDEX IF NOT EXISTS idx_product_files_product ON public.product_files (product_id);
CREATE INDEX IF NOT EXISTS idx_product_files_storage ON public.product_files (storage_file_id)
WHERE storage_file_id IS NOT NULL;
-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_user_status_date ON public.orders (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_origin_site_id ON public.orders (origin_site_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_lead ON public.orders (guest_lead_id)
WHERE guest_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_crs_order_id ON public.creator_revenue_shares (order_id);
CREATE INDEX IF NOT EXISTS idx_crs_creator_status ON public.creator_revenue_shares (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_upa_user_product ON public.user_product_access (user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_upa_order_id ON public.user_product_access (order_id);
CREATE INDEX IF NOT EXISTS idx_pl_order_id ON public.product_licenses (order_id);
CREATE INDEX IF NOT EXISTS idx_pl_user_product ON public.product_licenses (user_id, product_id);
-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator_active ON public.subscriptions (creator_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_subscription ON public.subscriptions (creator_id)
WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscription_offers_active ON public.subscription_offers (is_active, start_date, end_date)
WHERE is_active = true;
-- Blog
CREATE INDEX IF NOT EXISTS idx_blog_posts_site_published ON public.blog_posts (site_id, is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_blog_posts_search ON public.blog_posts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON public.blog_posts USING GIN (tags);
-- Pages
CREATE INDEX IF NOT EXISTS idx_pages_project_id ON public.pages (project_id);
CREATE INDEX IF NOT EXISTS idx_pages_site_slug ON public.pages (site_id, slug);
CREATE INDEX IF NOT EXISTS idx_pages_creator_status ON public.pages (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_pages_site_homepage ON public.pages (site_id, is_homepage);
CREATE INDEX IF NOT EXISTS idx_page_blocks_page_sort ON public.page_blocks (page_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_page_blocks_parent ON public.page_blocks (parent_block_id)
WHERE parent_block_id IS NOT NULL;
-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_creator_unread ON public.notifications (recipient_creator_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (recipient_user_id, is_read, created_at DESC);
-- Analytics
CREATE INDEX IF NOT EXISTS idx_spv_site_created ON public.site_page_views (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spv_utm ON public.site_page_views (site_id, utm_source, utm_medium);
CREATE INDEX IF NOT EXISTS idx_pve_product_created ON public.product_view_events (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_site_type ON public.conversion_events (site_id, event_type, created_at DESC);
-- Coupons
CREATE INDEX IF NOT EXISTS idx_coupons_creator_active ON public.coupons (creator_id, is_active, valid_until);
-- Transaction ledger
CREATE INDEX IF NOT EXISTS idx_tl_creator ON public.transaction_ledger (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tl_order ON public.transaction_ledger (order_id)
WHERE order_id IS NOT NULL;
-- Support
CREATE INDEX IF NOT EXISTS idx_support_creator ON public.support_tickets (creator_id, status);
-- KYC
CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_creator ON public.creator_kyc (creator_id);
-- =====================================================================
-- SECTION 9: SEARCH VECTOR TRIGGERS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_product_search_vector() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.search_vector := to_tsvector(
        'english',
        coalesce(NEW.name, '') || ' ' || coalesce(NEW.description, '') || ' ' || coalesce(NEW.category, '')
    );
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_product_search_vector ON public.products;
CREATE TRIGGER trg_product_search_vector BEFORE
INSERT
    OR
UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_product_search_vector();
CREATE OR REPLACE FUNCTION public.update_blog_post_search_vector() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.search_vector := to_tsvector(
        'english',
        coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '') || ' ' || coalesce(array_to_string(NEW.tags, ' '), '')
    );
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_blog_search_vector ON public.blog_posts;
CREATE TRIGGER trg_blog_search_vector BEFORE
INSERT
    OR
UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_blog_post_search_vector();
-- =====================================================================
-- SECTION 10: AUTH TRIGGERS
-- These create public.users + public.profiles automatically on signup.
-- This is why authentication works — without these, signup creates a
-- row in auth.users but nothing in your public schema.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,
    auth AS $$
DECLARE _user_id uuid := NEW.id;
_email text := NEW.email;
_full_name text := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
);
_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
BEGIN -- 1. Create public.users row — id matches auth.users.id exactly
INSERT INTO public.users (
        id,
        auth_provider_id,
        email,
        auth_provider,
        is_verified,
        role,
        created_at,
        updated_at
    )
VALUES (
        _user_id,
        _user_id,
        _email,
        'supabase',
        (NEW.email_confirmed_at IS NOT NULL),
        _role,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO
UPDATE
SET auth_provider_id = EXCLUDED.auth_provider_id,
    email = EXCLUDED.email,
    is_verified = EXCLUDED.is_verified,
    updated_at = NOW();
-- 2. Create public.profiles row
INSERT INTO public.profiles (
        user_id,
        full_name,
        email,
        email_verified,
        created_at,
        updated_at
    )
VALUES (
        _user_id,
        _full_name,
        _email,
        (NEW.email_confirmed_at IS NOT NULL),
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO
UPDATE
SET full_name = CASE
        WHEN public.profiles.full_name IS NULL
        OR public.profiles.full_name = '' THEN EXCLUDED.full_name
        ELSE public.profiles.full_name
    END,
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();
RETURN NEW;
EXCEPTION
WHEN OTHERS THEN -- Never crash sign-in due to trigger failure
RAISE WARNING 'handle_new_user failed for %: %',
_user_id,
SQLERRM;
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Mark is_verified = true when email gets confirmed
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,
    auth AS $$ BEGIN IF OLD.email_confirmed_at IS NULL
    AND NEW.email_confirmed_at IS NOT NULL THEN
UPDATE public.users
SET is_verified = true,
    updated_at = NOW()
WHERE id = NEW.id;
UPDATE public.profiles
SET email_verified = true,
    updated_at = NOW()
WHERE user_id = NEW.id;
END IF;
RETURN NEW;
EXCEPTION
WHEN OTHERS THEN RAISE WARNING 'handle_user_email_confirmed failed for %: %',
NEW.id,
SQLERRM;
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER
UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();
-- =====================================================================
-- SECTION 11: BACKFILL existing auth.users (run once)
-- Syncs any auth.users rows that existed before the trigger was created.
-- Safe to re-run — uses ON CONFLICT DO UPDATE.
-- =====================================================================
-- Step A: Remove stale public.users rows whose email matches auth.users
-- but whose id does NOT match (orphaned rows from before trigger existed)
DELETE FROM public.users pu
WHERE EXISTS (
        SELECT 1
        FROM auth.users au
        WHERE au.email = pu.email
            AND au.id != pu.id
    );
-- Step B: Upsert all auth.users into public.users
INSERT INTO public.users (
        id,
        auth_provider_id,
        email,
        auth_provider,
        is_verified,
        role,
        created_at,
        updated_at
    )
SELECT au.id,
    au.id,
    au.email,
    'supabase',
    (au.email_confirmed_at IS NOT NULL),
    COALESCE(au.raw_user_meta_data->>'role', 'user'),
    au.created_at,
    NOW()
FROM auth.users au ON CONFLICT (id) DO
UPDATE
SET auth_provider_id = EXCLUDED.id,
    is_verified = EXCLUDED.is_verified,
    updated_at = NOW();
-- Step C: Upsert profiles for all auth.users
INSERT INTO public.profiles (
        user_id,
        full_name,
        email,
        email_verified,
        created_at,
        updated_at
    )
SELECT au.id,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        split_part(au.email, '@', 1)
    ),
    au.email,
    (au.email_confirmed_at IS NOT NULL),
    au.created_at,
    NOW()
FROM auth.users au ON CONFLICT (user_id) DO
UPDATE
SET email_verified = EXCLUDED.email_verified,
    full_name = CASE
        WHEN public.profiles.full_name IS NULL
        OR public.profiles.full_name = '' THEN EXCLUDED.full_name
        ELSE public.profiles.full_name
    END,
    updated_at = NOW();
-- =====================================================================
-- DONE
-- Verify with:
--   SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';
--   -- Expected: 72
--
--   SELECT au.email, pu.id IS NOT NULL AS has_user, p.id IS NOT NULL AS has_profile
--   FROM auth.users au
--   LEFT JOIN public.users pu ON pu.id = au.id
--   LEFT JOIN public.profiles p ON p.user_id = au.id;
--   -- Expected: has_user=true AND has_profile=true for all rows
-- =====================================================================