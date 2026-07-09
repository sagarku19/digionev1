// Pure helpers for post-purchase access links. A product's links come from two
// places: the single primary `post_purchase_url`, and the labelled `access_links`
// jsonb array ([{ label, url }]). These normalise + combine them safely (the jsonb
// is untyped at the boundary). Unit-tested in access-links.test.ts.

export interface AccessLink {
  label: string;
  url: string;
}

/** Coerce the products.access_links jsonb (typed Json / unknown) into a clean list. */
export function normalizeAccessLinks(raw: unknown): AccessLink[] {
  if (!Array.isArray(raw)) return [];
  const out: AccessLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rawUrl = (item as { url?: unknown }).url;
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    if (!url) continue;
    const rawLabel = (item as { label?: unknown }).label;
    const label = typeof rawLabel === 'string' ? rawLabel.trim() : '';
    out.push({ label: label || 'Access link', url });
  }
  return out;
}

/**
 * Combined post-purchase links: the primary `post_purchase_url` (labelled "Access")
 * followed by the labelled `access_links` array, deduped by url.
 */
export function buildAccessLinks(opts: {
  postPurchaseUrl?: string | null;
  accessLinks?: unknown;
}): AccessLink[] {
  const combined: AccessLink[] = [];
  const primary = typeof opts.postPurchaseUrl === 'string' ? opts.postPurchaseUrl.trim() : '';
  if (primary) combined.push({ label: 'Access', url: primary });
  for (const link of normalizeAccessLinks(opts.accessLinks)) {
    if (!combined.some((c) => c.url === link.url)) combined.push(link);
  }
  return combined;
}
