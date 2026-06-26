// Per-creator storage quota for the creator-content (digione-products) bucket.
// Hardcoded default until per-plan quotas land (creator_subscriptions + a numeric
// quota schema). Shared by /api/upload and /api/products/[productId]/files so the
// two never drift.
export const CREATOR_CONTENT_QUOTA_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB
