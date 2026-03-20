// API Route: POST /api/sites/create
// Creates a new site with all required sub-tables.
// DB tables written: sites, site_main OR site_singlepage OR site_blog,
//                    site_sections_config, site_design_tokens, site_navigation
// Auth via createClient (anon) — all DB writes via createServiceClient (service role, bypasses RLS).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const DEFAULT_PALETTE = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  accent: '#EC4899',
  surface: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  background: '#FFFFFF',
};

const DEFAULT_TYPOGRAPHY = {
  heading_font: 'Inter',
  body_font: 'Inter',
  base_size_px: 16,
};

const DEFAULT_BORDER_RADIUS = { sm: '6px', md: '12px', lg: '16px' };
const DEFAULT_SPACING_SCALE  = { xs: '4px', sm: '8px', md: '16px', lg: '32px', xl: '64px' };

const DEFAULT_SECTIONS_MAIN = [
  { id: crypto.randomUUID(), type: 'hero_banner',       sort_order: 1, is_visible: true,  settings: { title: 'Welcome to my store', subtitle: 'Discover premium digital products', alignment: 'center' } },
  { id: crypto.randomUUID(), type: 'featured_products', sort_order: 2, is_visible: true,  settings: { title: 'Featured Products', max_items: 6 } },
  { id: crypto.randomUUID(), type: 'trust_badges',      sort_order: 3, is_visible: true,  settings: {} },
  { id: crypto.randomUUID(), type: 'testimonials',      sort_order: 4, is_visible: false, settings: {} },
  { id: crypto.randomUUID(), type: 'faq_accordion',     sort_order: 5, is_visible: false, settings: { items: [] } },
];

const DEFAULT_SECTIONS_SINGLE = [
  { id: crypto.randomUUID(), type: 'hero_banner',   sort_order: 1, is_visible: true, settings: { layout: 'left_aligned' } },
  { id: crypto.randomUUID(), type: 'trust_badges',  sort_order: 2, is_visible: true, settings: {} },
  { id: crypto.randomUUID(), type: 'faq_accordion', sort_order: 3, is_visible: true, settings: { items: [] } },
  { id: crypto.randomUUID(), type: 'testimonials',  sort_order: 4, is_visible: true, settings: {} },
];

const DEFAULT_SECTIONS_BLOG = [
  { id: crypto.randomUUID(), type: 'hero_banner', sort_order: 1, is_visible: true, settings: { title: 'My Blog', subtitle: 'Insights and tutorials' } },
];

const DEFAULT_SECTIONS_PAYMENT = [
  { id: crypto.randomUUID(), type: 'trust_badges', sort_order: 1, is_visible: true, settings: {} },
];

function sectionsFor(type: string) {
  if (type === 'single')  return DEFAULT_SECTIONS_SINGLE;
  if (type === 'blog')    return DEFAULT_SECTIONS_BLOG;
  if (type === 'payment') return DEFAULT_SECTIONS_PAYMENT;
  return DEFAULT_SECTIONS_MAIN;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate with the user-session client (anon key + cookies)
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Use service-role client for ALL DB reads and writes (bypasses RLS)
    const db = createServiceClient();

    // Resolve auth user → public users → profiles
    // sites.creator_id FK references profiles.id
    const { data: publicUser, error: userErr } = await db
      .from('users')
      .select('id')
      .eq('auth_provider_id', user.id)
      .maybeSingle();

    if (userErr) {
      console.error('[sites/create] users lookup error:', userErr.message);
      return NextResponse.json({ error: 'Failed to resolve user record' }, { status: 500 });
    }

    if (!publicUser) {
      // Fallback: try matching by email (covers edge cases in auth setup)
      const { data: userByEmail } = await db
        .from('users')
        .select('id')
        .eq('email', user.email ?? '')
        .maybeSingle();

      if (!userByEmail) {
        console.error('[sites/create] No public user found for auth id:', user.id);
        return NextResponse.json({ error: 'User record not found. Please complete your profile setup.' }, { status: 404 });
      }

      // Use the email-matched user
      const { data: profile } = await db
        .from('profiles')
        .select('id')
        .eq('user_id', userByEmail.id)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
      }

      return await createSite(req, db, profile.id);
    }

    const { data: profile, error: profileErr } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', publicUser.id)
      .maybeSingle();

    if (profileErr) {
      console.error('[sites/create] profile lookup error:', profileErr.message);
      return NextResponse.json({ error: 'Failed to resolve creator profile' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    return await createSite(req, db, profile.id);
  } catch (err: unknown) {
    console.error('[sites/create] unhandled error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function createSite(
  req: NextRequest,
  db: ReturnType<typeof createServiceClient>,
  creatorId: string
): Promise<NextResponse> {
  const body = await req.json() as {
    site_type?: string;
    slug?: string;
    title?: string;
    description?: string;
    product_id?: string;
  };

  const { site_type, slug, title, description, product_id } = body;

  if (!site_type || !slug || !title) {
    return NextResponse.json({ error: 'Missing required fields: site_type, slug, title' }, { status: 400 });
  }

  // 1. Determine correct slug/child_slug routing
  let finalSlug: string | null = slug;
  let finalChildSlug: string | null = null;
  let parentSiteId: string | null = null;
  let responseUrlPath = slug;

  if (site_type !== 'main') {
    const { data: mainSite } = await db
      .from('sites')
      .select('id, slug')
      .eq('creator_id', creatorId)
      .eq('site_type', 'main')
      .maybeSingle();

    if (mainSite) {
      // User HAS a main site.
      // Constraint: parent_site_id IS NOT NULL => child_slug IS NOT NULL AND slug IS NULL
      finalSlug = null;
      finalChildSlug = slug;
      parentSiteId = mainSite.id;
      responseUrlPath = `${mainSite.slug}/${slug}`;
    } else {
      // User DOES NOT have a main site.
      // Constraint: parent_site_id IS NULL => slug IS NOT NULL AND child_slug IS NULL
      // To support the user's requested mental model of nested links even without a main site,
      // we generate a random prefix for display, but store the site as a top-level `slug`
      // because `app/(storefront)/[slug]/[childslug]/page.tsx`'s fallback ignores the first segment.
      finalSlug = slug;
      finalChildSlug = null;
      parentSiteId = null;
      
      const randomPrefix = Math.random().toString(36).substring(2, 10);
      responseUrlPath = `${randomPrefix}/${slug}`;
    }
  }

  // 2. Verify availability
  const query = db.from('sites').select('id');
  if (finalSlug) {
    query.eq('slug', finalSlug);
  } else if (finalChildSlug) {
    query.eq('child_slug', finalChildSlug).eq('parent_site_id', parentSiteId!);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
  }

  // 3. Insert the site row
  const { data: site, error: siteErr } = await db
    .from('sites')
    .insert({
      creator_id: creatorId,
      site_type,
      slug: finalSlug,
      child_slug: finalChildSlug,
      parent_site_id: parentSiteId,
      is_active: true
    })
    .select('id')
    .single();

  if (siteErr || !site) {
    console.error('[sites/create] sites insert error:', siteErr?.message);
    throw siteErr ?? new Error('Failed to create site');
  }

  const siteId = site.id;

  // 3. Insert type-specific sub-table
  if (site_type === 'main' || site_type === 'payment') {
    const { error: smErr } = await db.from('site_main').insert({
      site_id: siteId,
      title,
      meta_description: description ?? null,
    });
    if (smErr) console.error('[sites/create] site_main insert error:', smErr.message);
  } else if (site_type === 'single') {
    const { error: ssErr } = await db.from('site_singlepage').insert({
      site_id: siteId,
      title,
      product_id: product_id ?? '', // required by schema FK
    });
    if (ssErr) console.error('[sites/create] site_singlepage insert error:', ssErr.message);
  } else if (site_type === 'blog') {
    const { error: sbErr } = await db.from('site_blog').insert({
      site_id: siteId,
      title,
      description: description ?? null,
    });
    if (sbErr) console.error('[sites/create] site_blog insert error:', sbErr.message);
  }

  // 4. Default sections config
  const { error: secErr } = await db.from('site_sections_config').insert({
    site_id: siteId,
    site_type,
    sections: sectionsFor(site_type) as unknown as import('@/types/database.types').Database['public']['Tables']['site_sections_config']['Insert']['sections'],
  });
  if (secErr) console.error('[sites/create] sections_config insert error:', secErr.message);

  // 5. Default design tokens
  const { error: tokErr } = await db.from('site_design_tokens').insert({
    site_id: siteId,
    creator_id: creatorId,
    color_palette: DEFAULT_PALETTE,
    typography: DEFAULT_TYPOGRAPHY,
    border_radius_scale: DEFAULT_BORDER_RADIUS,
    spacing_scale: DEFAULT_SPACING_SCALE,
  });
  if (tokErr) console.error('[sites/create] design_tokens insert error:', tokErr.message);

  // 6. Default navigation
  const { error: navErr } = await db.from('site_navigation').insert({
    site_id: siteId,
    nav_items: [
      { label: 'Home',     url: '/',         type: 'link' },
      { label: 'Products', url: '#products', type: 'link' },
      { label: 'About',    url: '#about',    type: 'link' },
    ],
  });
  if (navErr) console.error('[sites/create] navigation insert error:', navErr.message);

  return NextResponse.json({ siteId, slug: responseUrlPath }, { status: 201 });
}
