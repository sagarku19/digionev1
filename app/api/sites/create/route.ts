// API Route: POST /api/sites/create
// Creates a new site with all required sub-tables.
// DB tables written: sites, site_main OR site_singlepage,
//                    site_sections_config, site_design_tokens, site_navigation
// Auth via createClient (anon) — all DB writes via createServiceClient (service role, bypasses RLS).
//
// URL scheme:
//   main    → /store/{slug}
//   payment → /pay/{siteId}          (not renamable)
//   single  → /site/{slug}           (renamable)

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

const DEFAULT_SECTIONS_PAYMENT = [
  { id: crypto.randomUUID(), type: 'trust_badges', sort_order: 1, is_visible: true, settings: {} },
];

const DEFAULT_SECTIONS_LINKINBIO: any[] = [];

function sectionsFor(type: string) {
  if (type === 'single')    return DEFAULT_SECTIONS_SINGLE;
  if (type === 'payment')   return DEFAULT_SECTIONS_PAYMENT;
  if (type === 'linkinbio') return DEFAULT_SECTIONS_LINKINBIO;
  return DEFAULT_SECTIONS_MAIN;
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createServiceClient();

    // Resolve auth user → public users → profiles
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
      const { data: userByEmail } = await db
        .from('users')
        .select('id')
        .eq('email', user.email ?? '')
        .maybeSingle();

      if (!userByEmail) {
        console.error('[sites/create] No public user found for auth id:', user.id);
        return NextResponse.json({ error: 'User record not found. Please complete your profile setup.' }, { status: 404 });
      }

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

  if (!site_type || !title) {
    return NextResponse.json({ error: 'Missing required fields: site_type, title' }, { status: 400 });
  }

  // Slug is required for: main, single, linkinbio
  // Not required for: payment (URL uses siteId)
  const needsSlug = site_type === 'main' || site_type === 'single' || site_type === 'linkinbio';

  if (needsSlug && !slug) {
    return NextResponse.json({ error: `Slug is required for ${site_type} sites` }, { status: 400 });
  }

  // For non-main types, check that the creator doesn't already have one of this type
  if (site_type !== 'main') {
    const { data: existing } = await db
      .from('sites')
      .select('id')
      .eq('creator_id', creatorId)
      .eq('site_type', site_type)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: `You already have a ${site_type} site. Each creator can have one per type.`,
        existingSiteId: existing.id,
      }, { status: 409 });
    }
  }

  // Verify slug availability for types that use slugs
  if (needsSlug && slug) {
    const { data: slugTaken } = await db
      .from('sites')
      .select('id')
      .eq('slug', slug!)
      .maybeSingle();

    if (slugTaken) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
    }
  }

  // Insert the site row
  const { data: site, error: siteErr } = await db
    .from('sites')
    .insert({
      creator_id: creatorId,
      site_type,
      slug: needsSlug ? slug! : null,
      child_slug: null,
      parent_site_id: null,
      is_active: true,
    })
    .select('id')
    .single();

  if (siteErr || !site) {
    console.error('[sites/create] sites insert error:', siteErr?.message, siteErr?.details, siteErr?.hint, siteErr?.code);
    return NextResponse.json({
      error: siteErr?.message ?? 'Failed to create site',
      details: siteErr?.details,
      hint: siteErr?.hint,
      code: siteErr?.code,
    }, { status: 500 });
  }

  const siteId = site.id;

  // Insert type-specific sub-table
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
      product_id: product_id ?? '',
    });
    if (ssErr) console.error('[sites/create] site_singlepage insert error:', ssErr.message);
  } else if (site_type === 'linkinbio') {
    const { error: slErr } = await db.from('linkinbio_pages' as any).insert({
      site_id: siteId,
      display_name: title,
      bio: description ?? null,
      theme: {},
      layout: { style: 'classic' },
      seo: { title: title, description: description ?? '' },
      settings: { showWatermark: true, showShareButton: true, socialLinks: [] },
    } as any);
    if (slErr) console.error('[sites/create] linkinbio_pages insert error:', slErr.message, slErr.details, slErr.hint, slErr.code);
  }

  // Default sections config
  const { error: secErr } = await db.from('site_sections_config').insert({
    site_id: siteId,
    site_type,
    sections: sectionsFor(site_type) as unknown as import('@/types/database.types').Database['public']['Tables']['site_sections_config']['Insert']['sections'],
  });
  if (secErr) console.error('[sites/create] sections_config insert error:', secErr.message);

  // Default design tokens
  const { error: tokErr } = await db.from('site_design_tokens').insert({
    site_id: siteId,
    creator_id: creatorId,
    color_palette: DEFAULT_PALETTE,
    typography: DEFAULT_TYPOGRAPHY,
    border_radius_scale: DEFAULT_BORDER_RADIUS,
    spacing_scale: DEFAULT_SPACING_SCALE,
  });
  if (tokErr) console.error('[sites/create] design_tokens insert error:', tokErr.message);

  // Default navigation
  const navItems = site_type === 'main'
    ? [
        { label: 'Home',     url: '/',         type: 'link' },
        { label: 'Products', url: '#products', type: 'link' },
        { label: 'About',    url: '#about',    type: 'link' },
      ]
    : [
        { label: 'Home', url: '/', type: 'link' },
      ];

  const { error: navErr } = await db.from('site_navigation').insert({
    site_id: siteId,
    nav_items: navItems,
  });
  if (navErr) console.error('[sites/create] navigation insert error:', navErr.message);

  // Build the response URL path based on new scheme
  let responseUrlPath: string;
  switch (site_type) {
    case 'main':
      responseUrlPath = `store/${slug}`;
      break;
    case 'payment':
      responseUrlPath = `pay/${siteId}`;
      break;
    case 'single':
      responseUrlPath = `site/${slug}`;
      break;
    case 'linkinbio':
      responseUrlPath = `link/${slug}`;
      break;
    default:
      responseUrlPath = `p/${slug}`;
  }

  return NextResponse.json({ siteId, slug: responseUrlPath, creatorId }, { status: 201 });
}
