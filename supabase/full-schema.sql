--
-- PostgreSQL database dump
--

\restrict l74psg1oO9UQaAH8pBBNnsKVsJLygrfBUvWwZWhCvf1B7gsogvPItI2TZUlKC5a

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: ab_test_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ab_test_status AS ENUM (
    'draft',
    'running',
    'paused',
    'concluded'
);


--
-- Name: builder_asset_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.builder_asset_type AS ENUM (
    'icon_set',
    'font',
    'lottie_animation',
    'pattern',
    'illustration',
    'stock_image'
);


--
-- Name: content_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.content_status AS ENUM (
    'draft',
    'published',
    'archived'
);


--
-- Name: conversion_event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.conversion_event_type AS ENUM (
    'add_to_cart',
    'checkout_start',
    'purchase'
);


--
-- Name: device_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.device_type AS ENUM (
    'desktop',
    'mobile',
    'tablet'
);


--
-- Name: discount_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.discount_type AS ENUM (
    'percentage',
    'fixed'
);


--
-- Name: font_source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.font_source_type AS ENUM (
    'google',
    'custom_upload',
    'system'
);


--
-- Name: kyc_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kyc_status AS ENUM (
    'pending',
    'verified',
    'rejected',
    'expired'
);


--
-- Name: layout_role_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.layout_role_type AS ENUM (
    'section',
    'row',
    'column',
    'block'
);


--
-- Name: offer_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.offer_type AS ENUM (
    'percentage',
    'fixed_amount',
    'free_period'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded',
    'cancelled'
);


--
-- Name: page_block_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.page_block_type AS ENUM (
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


--
-- Name: page_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.page_type AS ENUM (
    'landing',
    'product',
    'about',
    'contact',
    'blog',
    'custom'
);


--
-- Name: payout_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payout_status AS ENUM (
    'pending',
    'initiated',
    'processed',
    'failed'
);


--
-- Name: payout_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payout_type AS ENUM (
    'upi',
    'bank_transfer'
);


--
-- Name: product_relation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_relation_type AS ENUM (
    'upsell',
    'cross_sell',
    'bundle'
);


--
-- Name: site_section_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.site_section_type AS ENUM (
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


--
-- Name: storage_provider_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.storage_provider_type AS ENUM (
    'supabase',
    'digitalocean',
    'aws_s3',
    'cloudflare_r2',
    'gcs',
    'bunny'
);


--
-- Name: subscription_plan_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_plan_type AS ENUM (
    'free',
    'plus',
    'pro'
);


--
-- Name: user_role_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role_type AS ENUM (
    'super_admin',
    'creator',
    'user'
);


--
-- Name: wallet_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_direction AS ENUM (
    'credit',
    'debit'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
DECLARE
  _user_id   uuid := NEW.id;
  _email     text := NEW.email;
  _full_name text := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  _role text := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
BEGIN
  -- 1. Create public.users row — id matches auth.users.id exactly
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

  -- 2. Create public.profiles row
  INSERT INTO public.profiles (
    user_id, full_name, email, email_verified, created_at, updated_at
  )
  VALUES (
    _user_id, _full_name, _email,
    (NEW.email_confirmed_at IS NOT NULL),
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET full_name      = CASE
                           WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = ''
                           THEN EXCLUDED.full_name
                           ELSE public.profiles.full_name
                         END,
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


--
-- Name: handle_user_email_confirmed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_user_email_confirmed() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
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


--
-- Name: update_blog_post_search_vector(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_blog_post_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END; $$;


--
-- Name: update_product_search_vector(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.category, '')
  );
  RETURN NEW;
END; $$;


--
-- Name: update_projects_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_projects_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: affiliates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    affiliate_user_id uuid NOT NULL,
    commission_percent numeric DEFAULT 10 NOT NULL,
    is_active boolean DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT affiliates_commission_percent_check CHECK (((commission_percent > (0)::numeric) AND (commission_percent <= (100)::numeric)))
);


--
-- Name: community_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'General'::text NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    reaction text DEFAULT 'like'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conversion_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversion_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    product_id uuid,
    order_id uuid,
    session_id text,
    event_type public.conversion_event_type NOT NULL,
    revenue numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    code text NOT NULL,
    discount_type public.discount_type NOT NULL,
    discount_value numeric NOT NULL,
    max_uses integer,
    current_uses integer DEFAULT 0,
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT coupons_current_uses_check CHECK ((current_uses >= 0)),
    CONSTRAINT coupons_discount_value_check CHECK ((discount_value > (0)::numeric))
);


--
-- Name: creator_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creator_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    total_earnings numeric DEFAULT 0 NOT NULL,
    total_platform_fees numeric DEFAULT 0 NOT NULL,
    total_paid_out numeric DEFAULT 0 NOT NULL,
    pending_payout numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'INR'::text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: creator_kyc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creator_kyc (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    kyc_level text DEFAULT 'none'::text NOT NULL,
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
    pan_verified_at timestamp with time zone,
    pan_name text,
    pan_verification_provider text,
    pan_verification_ref text,
    bank_last4 text,
    bank_verified boolean DEFAULT false,
    bank_verified_at timestamp with time zone,
    bank_account_name text,
    bank_verification_provider text,
    bank_verification_ref text,
    beneficiary_id text,
    beneficiary_metadata jsonb DEFAULT '{}'::jsonb,
    upi_verified boolean DEFAULT false,
    upi_verified_at timestamp with time zone,
    upi_verification_provider text,
    upi_verification_ref text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    postal_code text,
    country text DEFAULT 'IN'::text,
    document_urls jsonb DEFAULT '{}'::jsonb,
    document_hashes jsonb DEFAULT '{}'::jsonb,
    verification_provider text,
    rejection_reason text,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT creator_kyc_kyc_level_check CHECK ((kyc_level = ANY (ARRAY['none'::text, 'basic'::text, 'full'::text]))),
    CONSTRAINT creator_kyc_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: creator_payout_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creator_payout_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    type public.payout_type NOT NULL,
    is_default boolean DEFAULT false,
    upi_id text,
    account_holder_name text,
    account_number text,
    ifsc_code text,
    bank_name text,
    branch_name text,
    status text DEFAULT 'pending'::text NOT NULL,
    metadata jsonb,
    version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT creator_payout_methods_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text]))),
    CONSTRAINT creator_payout_methods_version_check CHECK ((version > 0))
);


--
-- Name: creator_payout_request_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creator_payout_request_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payout_request_id uuid NOT NULL,
    revenue_share_id uuid NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: creator_payout_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creator_payout_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    payout_method_id uuid,
    amount numeric NOT NULL,
    currency text DEFAULT 'INR'::text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    rejection_reason text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT creator_payout_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'processed'::text])))
);


--
-- Name: creator_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creator_payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    payout_request_id uuid,
    payout_method_id uuid,
    amount numeric NOT NULL,
    currency text DEFAULT 'INR'::text,
    status text DEFAULT 'initiated'::text NOT NULL,
    gateway_name text DEFAULT 'cashfree'::text,
    gateway_payout_id text,
    gateway_batch_id text,
    gateway_metadata jsonb,
    initiated_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    failure_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT creator_payouts_status_check CHECK ((status = ANY (ARRAY['initiated'::text, 'processed'::text, 'failed'::text])))
);


--
-- Name: creator_revenue_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creator_revenue_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    subscription_id uuid,
    product_id uuid NOT NULL,
    gross_amount numeric NOT NULL,
    platform_fee_percent numeric NOT NULL,
    platform_fee_amount numeric NOT NULL,
    creator_earnings_amount numeric NOT NULL,
    currency text DEFAULT 'INR'::text,
    status text DEFAULT 'pending'::text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT creator_revenue_shares_creator_earnings_amount_check CHECK ((creator_earnings_amount >= (0)::numeric)),
    CONSTRAINT creator_revenue_shares_gross_amount_check CHECK ((gross_amount > (0)::numeric)),
    CONSTRAINT creator_revenue_shares_platform_fee_amount_check CHECK ((platform_fee_amount >= (0)::numeric)),
    CONSTRAINT creator_revenue_shares_platform_fee_percent_check CHECK (((platform_fee_percent >= (0)::numeric) AND (platform_fee_percent <= (100)::numeric))),
    CONSTRAINT creator_revenue_shares_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'settled'::text, 'refunded'::text])))
);


--
-- Name: creator_subscription_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creator_subscription_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    plan_id text NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'INR'::text,
    status text DEFAULT 'created'::text,
    gateway_name text DEFAULT 'cashfree'::text,
    gateway_order_id text,
    gateway_payment_id text,
    gateway_signature text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    paid_at timestamp with time zone,
    CONSTRAINT creator_subscription_orders_status_check CHECK ((status = ANY (ARRAY['created'::text, 'paid'::text, 'failed'::text])))
);


--
-- Name: email_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    creator_id uuid,
    order_id uuid,
    payout_request_id uuid,
    recipient_email text NOT NULL,
    subject text NOT NULL,
    template_name text NOT NULL,
    status text DEFAULT 'pending'::text,
    sent_at timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT email_events_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'bounced'::text])))
);


--
-- Name: forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: guest_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guest_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    product_id uuid,
    full_name text,
    email text,
    mobile text,
    status text DEFAULT 'pending'::text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT guest_leads_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'converted'::text])))
);


--
-- Name: lead_form; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_form (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid NOT NULL,
    site_id uuid NOT NULL,
    full_name text,
    email text,
    mobile text,
    other jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: linkinbio_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linkinbio_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid NOT NULL,
    type text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    style jsonb DEFAULT '{}'::jsonb NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: linkinbio_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linkinbio_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    block_id uuid NOT NULL,
    type text DEFAULT 'link'::text NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    url text DEFAULT ''::text NOT NULL,
    thumbnail_url text DEFAULT ''::text NOT NULL,
    product_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    click_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: linkinbio_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linkinbio_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    display_name text DEFAULT ''::text NOT NULL,
    bio text,
    avatar_url text,
    cover_url text,
    theme jsonb DEFAULT '{}'::jsonb NOT NULL,
    layout jsonb DEFAULT '{}'::jsonb NOT NULL,
    seo jsonb DEFAULT '{"title": "", "description": ""}'::jsonb NOT NULL,
    settings jsonb DEFAULT '{"showWatermark": true, "showShareButton": true}'::jsonb NOT NULL,
    published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: media_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_library (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    storage_file_id uuid,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size bigint NOT NULL,
    media_type text NOT NULL,
    storage_url text NOT NULL,
    thumbnail_url text,
    duration_seconds integer,
    width integer,
    height integer,
    alt_text text,
    description text,
    tags text[],
    is_favorite boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT media_library_file_size_check CHECK ((file_size > 0)),
    CONSTRAINT media_library_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'other'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_user_id uuid,
    recipient_creator_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    is_read boolean DEFAULT false,
    action_url text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['sale'::text, 'refund'::text, 'payout'::text, 'review'::text, 'kyc_reminder'::text, 'kyc_rejected'::text, 'order'::text, 'wallet'::text])))
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    price_at_purchase numeric NOT NULL,
    quantity integer DEFAULT 1,
    origin_site_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    site_id uuid
);


--
-- Name: order_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    referral_code_id uuid NOT NULL,
    referrer_creator_id uuid,
    referred_user_id uuid,
    commission_amount numeric,
    status text DEFAULT 'pending'::text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_referrals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'settled'::text])))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    origin_site_id uuid,
    guest_lead_id uuid,
    total_amount numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    customer_name text,
    customer_email text,
    customer_phone text,
    payment_method text,
    gateway_name text DEFAULT 'cashfree'::text,
    gateway_order_id text,
    gateway_payment_id text,
    gateway_signature text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    creator_id uuid,
    payment_verified_at timestamp with time zone,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'cancelled'::text])))
);


--
-- Name: payment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    slug text,
    title text NOT NULL,
    description text,
    amount numeric,
    is_fixed_amount boolean DEFAULT true,
    status text DEFAULT 'active'::text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_requests_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: payment_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_request_id uuid NOT NULL,
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    customer_phone text NOT NULL,
    amount numeric NOT NULL,
    payment_status text DEFAULT 'pending'::text,
    payment_method text,
    transaction_id text,
    gateway_name text DEFAULT 'cashfree'::text,
    gateway_order_id text,
    gateway_payment_id text,
    gateway_signature text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_submissions_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text])))
);


--
-- Name: product_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    file_label text NOT NULL,
    storage_url text NOT NULL,
    storage_file_id uuid,
    file_type text,
    file_size_bytes bigint,
    version text DEFAULT '1.0'::text,
    is_primary boolean DEFAULT false,
    download_count integer DEFAULT 0,
    checksum text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    user_id uuid,
    product_id uuid NOT NULL,
    license_key text,
    license_type text,
    status text DEFAULT 'active'::text NOT NULL,
    issued_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    snapshot jsonb,
    CONSTRAINT product_licenses_status_check CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text, 'expired'::text])))
);


--
-- Name: product_view_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_view_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    site_id uuid,
    session_id text,
    referrer text,
    device_type public.device_type,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric DEFAULT 0.00 NOT NULL,
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
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    mobile text,
    mobile_verified boolean DEFAULT false,
    email text,
    email_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: public_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.public_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    url text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    width integer,
    height integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    owner_user_id uuid,
    owner_creator_id uuid,
    is_active boolean DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: service_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    customer_name text,
    customer_email text,
    customer_phone text,
    status text DEFAULT 'pending'::text NOT NULL,
    booked_at timestamp with time zone,
    notes text,
    amount_paid numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    service_type text DEFAULT '1on1'::text NOT NULL,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    duration_minutes integer,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_design_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_design_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    color_palette jsonb DEFAULT '{"text": "#111827", "muted": "#6B7280", "accent": "#EC4899", "primary": "#6366F1", "surface": "#F9FAFB", "secondary": "#8B5CF6"}'::jsonb NOT NULL,
    typography jsonb DEFAULT '{"body_font": "Inter", "scale_ratio": 1.25, "base_size_px": 16, "heading_font": "Inter"}'::jsonb NOT NULL,
    spacing_scale jsonb DEFAULT '{"lg": 24, "md": 16, "sm": 8, "xl": 32, "xs": 4, "2xl": 48, "base_px": 4}'::jsonb NOT NULL,
    border_radius_scale jsonb DEFAULT '{"lg": "12px", "md": "8px", "sm": "4px", "xl": "16px", "full": "9999px"}'::jsonb NOT NULL,
    shadow_presets jsonb DEFAULT '[]'::jsonb,
    custom_css_variables jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: site_main; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_main (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    logo_url text,
    banner_url text,
    template_name text DEFAULT 'default'::text,
    theme jsonb DEFAULT '{"primaryColor": "#6366F1", "backgroundColor": "#F9FAFB"}'::jsonb,
    contact_mobile text,
    contact_email text,
    social_links jsonb DEFAULT '{}'::jsonb,
    legal_pages jsonb DEFAULT '{"terms": false, "refund": false, "privacy": false, "about_us": false}'::jsonb,
    meta_keywords text,
    meta_description text,
    custom_css text,
    custom_js text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: site_navigation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_navigation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    header_logo_url text,
    header_logo_alt text,
    nav_items jsonb DEFAULT '[]'::jsonb,
    show_cart_icon boolean DEFAULT true,
    show_search boolean DEFAULT false,
    sticky_header boolean DEFAULT true,
    footer_columns jsonb DEFAULT '[]'::jsonb,
    footer_bottom_text text,
    social_links jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: site_page_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_page_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    page_slug text,
    session_id text,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device_type public.device_type,
    country_code character(2),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_product_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_product_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    product_id uuid NOT NULL,
    placement text DEFAULT 'front_main'::text NOT NULL,
    is_visible boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: site_sections_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_sections_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    site_type text NOT NULL,
    sections jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT site_sections_config_site_type_check CHECK (((site_type IS NULL) OR (site_type = ANY (ARRAY['main'::text, 'single'::text, 'payment'::text, 'linkinbio'::text]))))
);


--
-- Name: site_singlepage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_singlepage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    product_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    hero_image_url text,
    template_name text DEFAULT 'modern'::text,
    theme jsonb DEFAULT '{"accentColor": "#8B5CF6", "primaryColor": "#6366F1"}'::jsonb,
    contact_mobile text,
    contact_email text,
    social_links jsonb DEFAULT '{}'::jsonb,
    legal_pages jsonb DEFAULT '{"terms": false, "refund": false, "privacy": false, "about_us": false}'::jsonb,
    show_add_to_cart boolean DEFAULT true,
    show_buy_now boolean DEFAULT true,
    enable_reviews boolean DEFAULT true,
    meta_description text,
    sections_config jsonb,
    countdown_end_at timestamp with time zone,
    social_proof_config jsonb,
    upsell_product_ids uuid[],
    guarantee_badges jsonb DEFAULT '[]'::jsonb,
    faq_items jsonb DEFAULT '[]'::jsonb,
    testimonials jsonb DEFAULT '[]'::jsonb,
    custom_css text,
    custom_js text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: site_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_type text NOT NULL,
    template_key text NOT NULL,
    name text NOT NULL,
    description text,
    preview_image_url text,
    is_active boolean DEFAULT true,
    default_theme jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT site_templates_site_type_check CHECK ((site_type = ANY (ARRAY['main'::text, 'single'::text, 'payment'::text, 'linkinbio'::text])))
);


--
-- Name: sites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    slug text,
    child_slug text,
    parent_site_id uuid,
    site_type text DEFAULT 'main'::text,
    is_active boolean DEFAULT true,
    custom_domain text,
    domain_verified boolean DEFAULT false,
    ssl_status text DEFAULT 'none'::text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT chk_sites_parent_slug_consistency CHECK (((site_type IS NULL) OR (site_type = ANY (ARRAY['main'::text, 'single'::text, 'payment'::text, 'blog'::text, 'builder'::text, 'linkinbio'::text])))),
    CONSTRAINT sites_site_type_check CHECK (((site_type IS NULL) OR (site_type = ANY (ARRAY['main'::text, 'single'::text, 'payment'::text, 'linkinbio'::text])))),
    CONSTRAINT sites_ssl_status_check CHECK ((ssl_status = ANY (ARRAY['none'::text, 'pending'::text, 'active'::text, 'failed'::text])))
);


--
-- Name: storage_file_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_file_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    field_name text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: storage_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider public.storage_provider_type DEFAULT 'supabase'::public.storage_provider_type NOT NULL,
    provider_bucket text NOT NULL,
    provider_path text NOT NULL,
    cdn_url text NOT NULL,
    public_url text GENERATED ALWAYS AS (cdn_url) STORED,
    owner_user_id uuid,
    owner_creator_id uuid,
    file_name text,
    file_type text,
    mime_type text,
    size_bytes bigint,
    checksum_sha256 text,
    status text DEFAULT 'active'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT storage_files_size_bytes_check CHECK ((size_bytes > 0)),
    CONSTRAINT storage_files_status_check CHECK ((status = ANY (ARRAY['active'::text, 'deleted'::text, 'migrating'::text])))
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_type public.subscription_plan_type NOT NULL,
    plan_name text NOT NULL,
    platform_fee_percent numeric NOT NULL,
    monthly_price numeric DEFAULT 0 NOT NULL,
    yearly_price numeric DEFAULT 0 NOT NULL,
    description text,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscription_plans_monthly_price_check CHECK ((monthly_price >= (0)::numeric)),
    CONSTRAINT subscription_plans_platform_fee_percent_check CHECK (((platform_fee_percent >= (0)::numeric) AND (platform_fee_percent <= (100)::numeric))),
    CONSTRAINT subscription_plans_yearly_price_check CHECK ((yearly_price >= (0)::numeric))
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    subscription_plan_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    billing_cycle text DEFAULT 'monthly'::text NOT NULL,
    current_price numeric DEFAULT 0 NOT NULL,
    current_platform_fee_percent numeric NOT NULL,
    start_date timestamp with time zone DEFAULT now(),
    end_date timestamp with time zone,
    renewal_date timestamp with time zone,
    auto_renew boolean DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscriptions_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text]))),
    CONSTRAINT subscriptions_current_platform_fee_percent_check CHECK (((current_platform_fee_percent >= (0)::numeric) AND (current_platform_fee_percent <= (100)::numeric))),
    CONSTRAINT subscriptions_current_price_check CHECK ((current_price >= (0)::numeric)),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text, 'paused'::text])))
);


--
-- Name: transaction_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transaction_ledger (
    id bigint NOT NULL,
    user_id uuid,
    creator_id uuid,
    wallet_id uuid,
    order_id uuid,
    payout_id uuid,
    referral_id uuid,
    tx_type text NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    direction public.wallet_direction NOT NULL,
    balance_after numeric,
    meta jsonb,
    prev_hash bytea,
    record_hash bytea NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transaction_ledger_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: transaction_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transaction_ledger_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transaction_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transaction_ledger_id_seq OWNED BY public.transaction_ledger.id;


--
-- Name: upsell_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upsell_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    primary_product_id uuid NOT NULL,
    upsell_product_ids uuid[] DEFAULT '{}'::uuid[],
    config jsonb DEFAULT '{"theme": {"bg_color": "#FFFFFF", "text_color": "#0F172A", "primary_color": "#6366F1"}, "logo_url": "", "meta_title": "", "buy_now_label": "Buy Now", "contact_fields": {"show_name": true, "show_email": true, "show_phone": false}, "meta_description": "", "show_guarantee_badge": true}'::jsonb NOT NULL,
    is_published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_product_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_product_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    order_item_id uuid,
    product_id uuid NOT NULL,
    product_name text NOT NULL,
    product_price numeric NOT NULL,
    product_link text NOT NULL,
    snapshot_metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_code_id uuid NOT NULL,
    referrer_user_id uuid,
    referrer_creator_id uuid,
    referred_user_id uuid NOT NULL,
    reward_status text DEFAULT 'pending'::text,
    reward_amount numeric,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_referrals_reward_status_check CHECK ((reward_status = ANY (ARRAY['pending'::text, 'rewarded'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.user_role_type NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    related_order_id uuid,
    related_order_referral_id uuid,
    tx_type text NOT NULL,
    amount numeric NOT NULL,
    direction public.wallet_direction NOT NULL,
    balance_after numeric NOT NULL,
    status text DEFAULT 'completed'::text,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_wallet_transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT user_wallet_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: user_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'INR'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_wallets_balance_check CHECK ((balance >= (0)::numeric))
);


--
-- Name: user_wishlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_wishlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auth_provider_id uuid,
    email text,
    phone text,
    auth_provider text DEFAULT 'supabase'::text,
    is_verified boolean DEFAULT false,
    role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: transaction_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_ledger ALTER COLUMN id SET DEFAULT nextval('public.transaction_ledger_id_seq'::regclass);


--
-- Name: affiliates affiliates_creator_id_affiliate_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_creator_id_affiliate_user_id_key UNIQUE (creator_id, affiliate_user_id);


--
-- Name: affiliates affiliates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_pkey PRIMARY KEY (id);


--
-- Name: community_posts community_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);


--
-- Name: community_reactions community_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_reactions
    ADD CONSTRAINT community_reactions_pkey PRIMARY KEY (id);


--
-- Name: community_reactions community_reactions_post_id_creator_id_reaction_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_reactions
    ADD CONSTRAINT community_reactions_post_id_creator_id_reaction_key UNIQUE (post_id, creator_id, reaction);


--
-- Name: conversion_events conversion_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversion_events
    ADD CONSTRAINT conversion_events_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: creator_balances creator_balances_creator_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_balances
    ADD CONSTRAINT creator_balances_creator_id_key UNIQUE (creator_id);


--
-- Name: creator_balances creator_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_balances
    ADD CONSTRAINT creator_balances_pkey PRIMARY KEY (id);


--
-- Name: creator_kyc creator_kyc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_kyc
    ADD CONSTRAINT creator_kyc_pkey PRIMARY KEY (id);


--
-- Name: creator_payout_methods creator_payout_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_payout_methods
    ADD CONSTRAINT creator_payout_methods_pkey PRIMARY KEY (id);


--
-- Name: creator_payout_request_items creator_payout_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_payout_request_items
    ADD CONSTRAINT creator_payout_request_items_pkey PRIMARY KEY (id);


--
-- Name: creator_payout_requests creator_payout_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_payout_requests
    ADD CONSTRAINT creator_payout_requests_pkey PRIMARY KEY (id);


--
-- Name: creator_payouts creator_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_payouts
    ADD CONSTRAINT creator_payouts_pkey PRIMARY KEY (id);


--
-- Name: creator_revenue_shares creator_revenue_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_revenue_shares
    ADD CONSTRAINT creator_revenue_shares_pkey PRIMARY KEY (id);


--
-- Name: creator_subscription_orders creator_subscription_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_subscription_orders
    ADD CONSTRAINT creator_subscription_orders_pkey PRIMARY KEY (id);


--
-- Name: email_events email_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_pkey PRIMARY KEY (id);


--
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- Name: guest_leads guest_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_leads
    ADD CONSTRAINT guest_leads_pkey PRIMARY KEY (id);


--
-- Name: lead_form lead_form_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_form
    ADD CONSTRAINT lead_form_pkey PRIMARY KEY (id);


--
-- Name: linkinbio_blocks linkinbio_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkinbio_blocks
    ADD CONSTRAINT linkinbio_blocks_pkey PRIMARY KEY (id);


--
-- Name: linkinbio_items linkinbio_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkinbio_items
    ADD CONSTRAINT linkinbio_items_pkey PRIMARY KEY (id);


--
-- Name: linkinbio_pages linkinbio_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkinbio_pages
    ADD CONSTRAINT linkinbio_pages_pkey PRIMARY KEY (id);


--
-- Name: linkinbio_pages linkinbio_pages_site_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkinbio_pages
    ADD CONSTRAINT linkinbio_pages_site_id_key UNIQUE (site_id);


--
-- Name: media_library media_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_library
    ADD CONSTRAINT media_library_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_referrals order_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_referrals
    ADD CONSTRAINT order_referrals_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_requests payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_pkey PRIMARY KEY (id);


--
-- Name: payment_requests payment_requests_site_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_site_id_slug_key UNIQUE (site_id, slug);


--
-- Name: payment_submissions payment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_submissions
    ADD CONSTRAINT payment_submissions_pkey PRIMARY KEY (id);


--
-- Name: product_files product_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_files
    ADD CONSTRAINT product_files_pkey PRIMARY KEY (id);


--
-- Name: product_files product_files_product_id_file_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_files
    ADD CONSTRAINT product_files_product_id_file_label_key UNIQUE (product_id, file_label);


--
-- Name: product_licenses product_licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_licenses
    ADD CONSTRAINT product_licenses_pkey PRIMARY KEY (id);


--
-- Name: product_view_events product_view_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_view_events
    ADD CONSTRAINT product_view_events_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: public_images public_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_images
    ADD CONSTRAINT public_images_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_code_key UNIQUE (code);


--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);


--
-- Name: service_bookings service_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: site_design_tokens site_design_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_design_tokens
    ADD CONSTRAINT site_design_tokens_pkey PRIMARY KEY (id);


--
-- Name: site_design_tokens site_design_tokens_site_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_design_tokens
    ADD CONSTRAINT site_design_tokens_site_id_key UNIQUE (site_id);


--
-- Name: site_main site_main_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_main
    ADD CONSTRAINT site_main_pkey PRIMARY KEY (id);


--
-- Name: site_main site_main_site_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_main
    ADD CONSTRAINT site_main_site_id_key UNIQUE (site_id);


--
-- Name: site_navigation site_navigation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_navigation
    ADD CONSTRAINT site_navigation_pkey PRIMARY KEY (id);


--
-- Name: site_navigation site_navigation_site_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_navigation
    ADD CONSTRAINT site_navigation_site_id_key UNIQUE (site_id);


--
-- Name: site_page_views site_page_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_page_views
    ADD CONSTRAINT site_page_views_pkey PRIMARY KEY (id);


--
-- Name: site_product_assignments site_product_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_product_assignments
    ADD CONSTRAINT site_product_assignments_pkey PRIMARY KEY (id);


--
-- Name: site_product_assignments site_product_assignments_site_id_product_id_placement_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_product_assignments
    ADD CONSTRAINT site_product_assignments_site_id_product_id_placement_key UNIQUE (site_id, product_id, placement);


--
-- Name: site_sections_config site_sections_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_sections_config
    ADD CONSTRAINT site_sections_config_pkey PRIMARY KEY (id);


--
-- Name: site_sections_config site_sections_config_site_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_sections_config
    ADD CONSTRAINT site_sections_config_site_id_key UNIQUE (site_id);


--
-- Name: site_singlepage site_singlepage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_singlepage
    ADD CONSTRAINT site_singlepage_pkey PRIMARY KEY (id);


--
-- Name: site_singlepage site_singlepage_site_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_singlepage
    ADD CONSTRAINT site_singlepage_site_id_key UNIQUE (site_id);


--
-- Name: site_templates site_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_templates
    ADD CONSTRAINT site_templates_pkey PRIMARY KEY (id);


--
-- Name: sites sites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_pkey PRIMARY KEY (id);


--
-- Name: storage_file_usages storage_file_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_file_usages
    ADD CONSTRAINT storage_file_usages_pkey PRIMARY KEY (id);


--
-- Name: storage_files storage_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_files
    ADD CONSTRAINT storage_files_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_plan_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_plan_type_key UNIQUE (plan_type);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: transaction_ledger transaction_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_ledger
    ADD CONSTRAINT transaction_ledger_pkey PRIMARY KEY (id);


--
-- Name: upsell_pages upsell_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upsell_pages
    ADD CONSTRAINT upsell_pages_pkey PRIMARY KEY (id);


--
-- Name: upsell_pages upsell_pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upsell_pages
    ADD CONSTRAINT upsell_pages_slug_key UNIQUE (slug);


--
-- Name: coupons uq_coupons_creator_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT uq_coupons_creator_code UNIQUE (creator_id, code);


--
-- Name: sites uq_sites_slug; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT uq_sites_slug UNIQUE (slug);


--
-- Name: storage_files uq_storage_file; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_files
    ADD CONSTRAINT uq_storage_file UNIQUE (provider, provider_bucket, provider_path);


--
-- Name: user_carts user_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_carts
    ADD CONSTRAINT user_carts_pkey PRIMARY KEY (id);


--
-- Name: user_carts user_carts_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_carts
    ADD CONSTRAINT user_carts_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: user_product_access user_product_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_product_access
    ADD CONSTRAINT user_product_access_pkey PRIMARY KEY (id);


--
-- Name: user_referrals user_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_referrals
    ADD CONSTRAINT user_referrals_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_wallet_transactions user_wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallet_transactions
    ADD CONSTRAINT user_wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: user_wallets user_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_pkey PRIMARY KEY (id);


--
-- Name: user_wallets user_wallets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_user_id_key UNIQUE (user_id);


--
-- Name: user_wishlist user_wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wishlist
    ADD CONSTRAINT user_wishlist_pkey PRIMARY KEY (id);


--
-- Name: user_wishlist user_wishlist_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wishlist
    ADD CONSTRAINT user_wishlist_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: users users_auth_provider_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_auth_provider_id_key UNIQUE (auth_provider_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: gin_products_images; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gin_products_images ON public.products USING gin (images);


--
-- Name: idx_ce_site_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_site_type ON public.conversion_events USING btree (site_id, event_type, created_at DESC);


--
-- Name: idx_coupons_creator_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_creator_active ON public.coupons USING btree (creator_id, is_active, valid_until);


--
-- Name: idx_crs_creator_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crs_creator_status ON public.creator_revenue_shares USING btree (creator_id, status);


--
-- Name: idx_crs_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crs_order_id ON public.creator_revenue_shares USING btree (order_id);


--
-- Name: idx_kyc_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_kyc_creator ON public.creator_kyc USING btree (creator_id);


--
-- Name: idx_linkinbio_blocks_page_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linkinbio_blocks_page_order ON public.linkinbio_blocks USING btree (page_id, sort_order);


--
-- Name: idx_linkinbio_items_block_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linkinbio_items_block_order ON public.linkinbio_items USING btree (block_id, sort_order);


--
-- Name: idx_linkinbio_pages_site_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linkinbio_pages_site_id ON public.linkinbio_pages USING btree (site_id);


--
-- Name: idx_media_library_creator_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_library_creator_type ON public.media_library USING btree (creator_id, media_type);


--
-- Name: idx_media_library_favorite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_library_favorite ON public.media_library USING btree (creator_id, is_favorite) WHERE (is_favorite = true);


--
-- Name: idx_media_library_storage_file; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_library_storage_file ON public.media_library USING btree (storage_file_id) WHERE (storage_file_id IS NOT NULL);


--
-- Name: idx_media_library_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_library_tags ON public.media_library USING gin (tags);


--
-- Name: idx_notifications_creator_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_creator_unread ON public.notifications USING btree (recipient_creator_id, is_read, created_at DESC);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (recipient_user_id, is_read, created_at DESC);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_orders_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_creator ON public.orders USING btree (user_id);


--
-- Name: idx_orders_creator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_creator_id ON public.orders USING btree (creator_id);


--
-- Name: idx_orders_creator_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_creator_status ON public.orders USING btree (creator_id, status, created_at DESC);


--
-- Name: idx_orders_guest_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_guest_lead ON public.orders USING btree (guest_lead_id) WHERE (guest_lead_id IS NOT NULL);


--
-- Name: idx_orders_origin_site_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_origin_site_id ON public.orders USING btree (origin_site_id);


--
-- Name: idx_orders_user_status_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_status_date ON public.orders USING btree (user_id, status, created_at DESC);


--
-- Name: idx_pl_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pl_order_id ON public.product_licenses USING btree (order_id);


--
-- Name: idx_pl_user_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pl_user_product ON public.product_licenses USING btree (user_id, product_id);


--
-- Name: idx_product_files_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_files_product ON public.product_files USING btree (product_id);


--
-- Name: idx_product_files_storage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_files_storage ON public.product_files USING btree (storage_file_id) WHERE (storage_file_id IS NOT NULL);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category, is_published);


--
-- Name: idx_products_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_creator ON public.products USING btree (creator_id);


--
-- Name: idx_products_creator_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_creator_published ON public.products USING btree (creator_id, is_published, created_at DESC) WHERE (is_published = true);


--
-- Name: idx_products_discover; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_discover ON public.products USING btree (is_on_discover_page, created_at DESC) WHERE (is_on_discover_page = true);


--
-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_search ON public.products USING gin (search_vector);


--
-- Name: idx_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);


--
-- Name: idx_public_images_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_images_category ON public.public_images USING btree (category);


--
-- Name: idx_public_images_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_images_tags ON public.public_images USING gin (tags);


--
-- Name: idx_pve_product_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pve_product_created ON public.product_view_events USING btree (product_id, created_at DESC);


--
-- Name: idx_sites_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sites_creator ON public.sites USING btree (creator_id);


--
-- Name: idx_sites_creator_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sites_creator_type ON public.sites USING btree (creator_id, site_type);


--
-- Name: idx_sites_custom_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sites_custom_domain ON public.sites USING btree (custom_domain) WHERE (custom_domain IS NOT NULL);


--
-- Name: idx_sites_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_sites_slug ON public.sites USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_sites_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sites_type ON public.sites USING btree (creator_id, site_type);


--
-- Name: idx_spv_site_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spv_site_created ON public.site_page_views USING btree (site_id, created_at DESC);


--
-- Name: idx_spv_utm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spv_utm ON public.site_page_views USING btree (site_id, utm_source, utm_medium);


--
-- Name: idx_storage_file_usages_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_file_usages_entity ON public.storage_file_usages USING btree (entity_type, entity_id);


--
-- Name: idx_storage_file_usages_file; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_file_usages_file ON public.storage_file_usages USING btree (file_id);


--
-- Name: idx_storage_files_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_files_owner ON public.storage_files USING btree (owner_creator_id);


--
-- Name: idx_storage_files_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_files_provider ON public.storage_files USING btree (provider, status);


--
-- Name: idx_subscriptions_creator_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_creator_active ON public.subscriptions USING btree (creator_id, status);


--
-- Name: idx_tl_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tl_creator ON public.transaction_ledger USING btree (creator_id, created_at DESC);


--
-- Name: idx_tl_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tl_order ON public.transaction_ledger USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: idx_unique_active_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_active_subscription ON public.subscriptions USING btree (creator_id) WHERE (status = 'active'::text);


--
-- Name: idx_upa_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upa_order_id ON public.user_product_access USING btree (order_id);


--
-- Name: idx_upa_user_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upa_user_product ON public.user_product_access USING btree (user_id, product_id);


--
-- Name: idx_upsell_pages_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upsell_pages_creator ON public.upsell_pages USING btree (creator_id);


--
-- Name: idx_users_auth_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_auth_provider ON public.users USING btree (auth_provider_id);


--
-- Name: products trg_product_search_vector; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_product_search_vector BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_product_search_vector();


--
-- Name: linkinbio_blocks update_linkinbio_blocks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_linkinbio_blocks_updated_at BEFORE UPDATE ON public.linkinbio_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: linkinbio_items update_linkinbio_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_linkinbio_items_updated_at BEFORE UPDATE ON public.linkinbio_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: linkinbio_pages update_linkinbio_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_linkinbio_pages_updated_at BEFORE UPDATE ON public.linkinbio_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: community_posts community_posts_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: community_reactions community_reactions_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_reactions
    ADD CONSTRAINT community_reactions_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: community_reactions community_reactions_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_reactions
    ADD CONSTRAINT community_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;


--
-- Name: affiliates fk_affiliates_affiliate_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT fk_affiliates_affiliate_user FOREIGN KEY (affiliate_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: affiliates fk_affiliates_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT fk_affiliates_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_carts fk_cart_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_carts
    ADD CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: user_carts fk_cart_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_carts
    ADD CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: creator_payout_methods fk_cpm_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_payout_methods
    ADD CONSTRAINT fk_cpm_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: creator_payout_requests fk_cpr_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_payout_requests
    ADD CONSTRAINT fk_cpr_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: creator_payout_request_items fk_cpri_request; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_payout_request_items
    ADD CONSTRAINT fk_cpri_request FOREIGN KEY (payout_request_id) REFERENCES public.creator_payout_requests(id) ON DELETE CASCADE;


--
-- Name: creator_balances fk_creator_balances_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_balances
    ADD CONSTRAINT fk_creator_balances_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: creator_revenue_shares fk_crs_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_revenue_shares
    ADD CONSTRAINT fk_crs_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: creator_revenue_shares fk_crs_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_revenue_shares
    ADD CONSTRAINT fk_crs_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: creator_revenue_shares fk_crs_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_revenue_shares
    ADD CONSTRAINT fk_crs_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: creator_subscription_orders fk_cso_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_subscription_orders
    ADD CONSTRAINT fk_cso_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: site_design_tokens fk_design_tokens_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_design_tokens
    ADD CONSTRAINT fk_design_tokens_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: email_events fk_email_events_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT fk_email_events_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: email_events fk_email_events_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT fk_email_events_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: guest_leads fk_guest_leads_site; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_leads
    ADD CONSTRAINT fk_guest_leads_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: creator_kyc fk_kyc_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_kyc
    ADD CONSTRAINT fk_kyc_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: transaction_ledger fk_ledger_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_ledger
    ADD CONSTRAINT fk_ledger_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: transaction_ledger fk_ledger_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_ledger
    ADD CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: linkinbio_blocks fk_linkinbio_blocks_page; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkinbio_blocks
    ADD CONSTRAINT fk_linkinbio_blocks_page FOREIGN KEY (page_id) REFERENCES public.linkinbio_pages(id) ON DELETE CASCADE;


--
-- Name: linkinbio_items fk_linkinbio_items_block; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkinbio_items
    ADD CONSTRAINT fk_linkinbio_items_block FOREIGN KEY (block_id) REFERENCES public.linkinbio_blocks(id) ON DELETE CASCADE;


--
-- Name: linkinbio_items fk_linkinbio_items_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkinbio_items
    ADD CONSTRAINT fk_linkinbio_items_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: linkinbio_pages fk_linkinbio_pages_site; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkinbio_pages
    ADD CONSTRAINT fk_linkinbio_pages_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: media_library fk_media_library_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_library
    ADD CONSTRAINT fk_media_library_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: media_library fk_media_library_storage; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_library
    ADD CONSTRAINT fk_media_library_storage FOREIGN KEY (storage_file_id) REFERENCES public.storage_files(id) ON DELETE SET NULL;


--
-- Name: notifications fk_notif_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notif_creator FOREIGN KEY (recipient_creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications fk_notif_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notif_user FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items fk_oi_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items fk_oi_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: order_referrals fk_order_referrals_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_referrals
    ADD CONSTRAINT fk_order_referrals_creator FOREIGN KEY (referrer_creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: order_referrals fk_order_referrals_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_referrals
    ADD CONSTRAINT fk_order_referrals_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders fk_orders_guest_lead; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_guest_lead FOREIGN KEY (guest_lead_id) REFERENCES public.guest_leads(id) ON DELETE SET NULL;


--
-- Name: orders fk_orders_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: payment_submissions fk_payment_submission_request; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_submissions
    ADD CONSTRAINT fk_payment_submission_request FOREIGN KEY (payment_request_id) REFERENCES public.payment_requests(id) ON DELETE CASCADE;


--
-- Name: creator_payouts fk_payout_request; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_payouts
    ADD CONSTRAINT fk_payout_request FOREIGN KEY (payout_request_id) REFERENCES public.creator_payout_requests(id) ON DELETE SET NULL;


--
-- Name: product_files fk_pf_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_files
    ADD CONSTRAINT fk_pf_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: product_files fk_pf_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_files
    ADD CONSTRAINT fk_pf_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_files fk_pf_storage; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_files
    ADD CONSTRAINT fk_pf_storage FOREIGN KEY (storage_file_id) REFERENCES public.storage_files(id) ON DELETE SET NULL;


--
-- Name: products fk_products_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles fk_profiles_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: storage_files fk_sf_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_files
    ADD CONSTRAINT fk_sf_creator FOREIGN KEY (owner_creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: storage_files fk_sf_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_files
    ADD CONSTRAINT fk_sf_user FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: storage_file_usages fk_sfu_file; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_file_usages
    ADD CONSTRAINT fk_sfu_file FOREIGN KEY (file_id) REFERENCES public.storage_files(id) ON DELETE CASCADE;


--
-- Name: site_main fk_site_main_site; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_main
    ADD CONSTRAINT fk_site_main_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: sites fk_sites_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT fk_sites_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: site_singlepage fk_sp_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_singlepage
    ADD CONSTRAINT fk_sp_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: site_singlepage fk_sp_site; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_singlepage
    ADD CONSTRAINT fk_sp_site FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: subscriptions fk_sub_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT fk_sub_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: subscriptions fk_sub_plan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT fk_sub_plan FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: user_roles fk_user_roles_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_wallet_transactions fk_uwt_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallet_transactions
    ADD CONSTRAINT fk_uwt_order FOREIGN KEY (related_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: user_wallet_transactions fk_uwt_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallet_transactions
    ADD CONSTRAINT fk_uwt_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_wallet_transactions fk_uwt_wallet; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallet_transactions
    ADD CONSTRAINT fk_uwt_wallet FOREIGN KEY (wallet_id) REFERENCES public.user_wallets(id) ON DELETE CASCADE;


--
-- Name: user_wallets fk_wallet_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_wishlist fk_wishlist_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wishlist
    ADD CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: user_wishlist fk_wishlist_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wishlist
    ADD CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: forms forms_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: lead_form lead_form_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_form
    ADD CONSTRAINT lead_form_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;


--
-- Name: orders orders_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: service_bookings service_bookings_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: service_bookings service_bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bookings
    ADD CONSTRAINT service_bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: services services_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sites sites_parent_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_parent_site_id_fkey FOREIGN KEY (parent_site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: upsell_pages upsell_pages_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upsell_pages
    ADD CONSTRAINT upsell_pages_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: upsell_pages upsell_pages_primary_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upsell_pages
    ADD CONSTRAINT upsell_pages_primary_product_id_fkey FOREIGN KEY (primary_product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: public_images Public images are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public images are viewable by everyone" ON public.public_images FOR SELECT USING (true);


--
-- Name: public_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.public_images ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict l74psg1oO9UQaAH8pBBNnsKVsJLygrfBUvWwZWhCvf1B7gsogvPItI2TZUlKC5a

