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

/**
 * Merge the creator's CURRENT (live) links with the buyer's purchased SNAPSHOT so
 * a link a buyer paid for never silently disappears:
 * - keyed by label (case-insensitive): a live link REPLACES the same-label snapshot
 *   link (so an edited/fixed URL updates in place — no stale duplicate),
 * - snapshot-only labels (a link the creator later removed) are RETAINED,
 * - live-only labels (a link added after purchase) are included,
 * - finally deduped by url.
 * Snapshot order is preserved for shared labels; live-only links append after.
 */
export function mergeAccessLinks(live: AccessLink[], snapshot: AccessLink[]): AccessLink[] {
  const byLabel = new Map<string, AccessLink>();
  for (const link of snapshot) byLabel.set(link.label.toLowerCase(), link);
  for (const link of live) byLabel.set(link.label.toLowerCase(), link); // live wins per label
  const seenUrl = new Set<string>();
  const out: AccessLink[] = [];
  for (const link of byLabel.values()) {
    if (seenUrl.has(link.url)) continue;
    seenUrl.add(link.url);
    out.push(link);
  }
  return out;
}
