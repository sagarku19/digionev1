// Centralised URL helpers for all site types.
//
// URL scheme:
//   Main store   → /p/{slug}
//   Product      → /p/product/{productId}
//   Payment      → /pay/{siteId}           (not renamable)
//   Blog         → /blog/{siteId}          (not renamable)
//   Blog post    → /blog/{siteId}/{post}   (not renamable)
//   Single page  → /s/{slug}               (renamable)
//   Builder      → /w/{slug}               (renamable)

export type SiteUrlInfo = {
  id: string;
  site_type: string;
  slug: string | null;
  creator_id: string;
  custom_domain: string | null;
};

/** Returns the public path for a site */
export function getSitePublicPath(site: SiteUrlInfo): string {
  if (site.custom_domain) return `https://${site.custom_domain}`;

  switch (site.site_type) {
    case 'main':
      return `/p/${site.slug}`;
    case 'payment':
      return `/pay/${site.id}`;
    case 'blog':
      return `/blog/${site.id}`;
    case 'single':
      return `/s/${site.slug ?? site.id}`;
    case 'builder':
      return `/w/${site.slug ?? site.id}`;
    case 'linkinbio':
      return `/link/${site.slug ?? site.id}`;
    default:
      return `/p/${site.slug}`;
  }
}

/** Returns a display-friendly URL string for dashboards */
export function getSiteDisplayUrl(site: SiteUrlInfo): string {
  if (site.custom_domain) return site.custom_domain;

  switch (site.site_type) {
    case 'main':
      return `digione.ai/p/${site.slug}`;
    case 'payment':
      return `digione.ai/pay/${shortId(site.id)}`;
    case 'blog':
      return `digione.ai/blog/${shortId(site.id)}`;
    case 'single':
      return `digione.ai/s/${site.slug ?? shortId(site.id)}`;
    case 'builder':
      return `digione.ai/w/${site.slug ?? shortId(site.id)}`;
    case 'linkinbio':
      return `digione.ai/link/${site.slug ?? shortId(site.id)}`;
    default:
      return `digione.ai/p/${site.slug}`;
  }
}

/** Shorten a UUID for display (first 8 chars) */
function shortId(id: string): string {
  return id.substring(0, 8);
}

// ── Upsell page helpers ─────────────────────────────────────────

/** Returns the public path for an upsell page */
export function getUpsellPublicPath(slug: string): string {
  return `/upsells/${slug}`;
}

/** Returns a display-friendly URL string for upsell pages */
export function getUpsellDisplayUrl(slug: string): string {
  return `digione.ai/upsells/${slug}`;
}

// ── Legacy helpers (kept for old-route redirects) ─────────────────

const DB_TO_URL_LEGACY: Record<string, string> = {
  single: 'singlepage',
  payment: 'payment',
  blog: 'blog',
  builder: 'app',
};

const URL_TO_DB_LEGACY: Record<string, string> = {
  singlepage: 'single',
  payment: 'payment',
  blog: 'blog',
  app: 'builder',
};

/** Converts a legacy URL segment to DB site_type */
export function urlTypeToDbType(urlType: string): string | null {
  return URL_TO_DB_LEGACY[urlType] ?? null;
}

/** Converts a DB site_type to legacy URL segment */
export function dbTypeToUrlSegment(dbType: string): string | null {
  return DB_TO_URL_LEGACY[dbType] ?? null;
}
