// Logical bucket names are the stable client/route contract. They map to the
// four R2 buckets + their visibility + public base URL. Routes resolve a
// logical bucket, then hand the resolved R2 name to the storage provider.

export type LogicalBucket =
  | 'public-asset'
  | 'creator-public'
  | 'creator-content'
  | 'creator-private';

export const LOGICAL_BUCKETS: ReadonlySet<LogicalBucket> = new Set([
  'public-asset',
  'creator-public',
  'creator-content',
  'creator-private',
]);

export interface BucketConfig {
  name: string;                 // the R2 bucket name
  visibility: 'public' | 'private';
  publicBaseUrl: string | null; // null for private buckets
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[storage] missing env ${name}`);
  return v;
}

export function resolveBucket(logical: LogicalBucket): BucketConfig {
  switch (logical) {
    case 'public-asset':
      return { name: env('R2_BUCKET_PUBLIC'), visibility: 'public', publicBaseUrl: env('NEXT_PUBLIC_R2_BUCKET_PUBLIC_URL') };
    case 'creator-public':
      return { name: env('R2_BUCKET_MEDIA'), visibility: 'public', publicBaseUrl: env('NEXT_PUBLIC_R2_MEDIA_URL') };
    case 'creator-content':
      return { name: env('R2_BUCKET_PRODUCTS'), visibility: 'private', publicBaseUrl: null };
    case 'creator-private':
      return { name: env('R2_BUCKET_KYC'), visibility: 'private', publicBaseUrl: null };
    default: {
      const _exhaustive: never = logical;
      throw new Error(`[storage] unknown logical bucket ${String(_exhaustive)}`);
    }
  }
}

export function publicUrlFor(logical: LogicalBucket, objectKey: string): string | null {
  const cfg = resolveBucket(logical);
  if (cfg.visibility !== 'public' || !cfg.publicBaseUrl) return null;
  return `${cfg.publicBaseUrl}/${objectKey}`;
}
