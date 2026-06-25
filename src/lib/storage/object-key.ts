import type { LogicalBucket } from './buckets';

interface KeyArgs {
  ts: number;
  safeName: string;       // already sanitized by lib/upload-validators
  creatorId: string;
  productId?: string;
  kind?: string;          // cover | avatar | banner | linkinbio | gallery | other
  category?: string;      // kyc | contracts | other (creator-private)
  derived?: boolean;      // media derivatives live under a derived/ segment
}

export function buildObjectKey(bucket: LogicalBucket, a: KeyArgs): string {
  const tail = `${a.ts}_${a.safeName}`;
  switch (bucket) {
    case 'public-asset':
      return `digione/${a.kind ?? 'other'}/${tail}`;
    case 'creator-public':
      return a.derived
        ? `${a.creatorId}/${a.kind ?? 'other'}/derived/${tail}`
        : `${a.creatorId}/${a.kind ?? 'other'}/${tail}`;
    case 'creator-content':
      return a.productId
        ? `${a.creatorId}/${a.productId}/${tail}`
        : `${a.creatorId}/unassigned/${tail}`;
    case 'creator-private':
      return `${a.creatorId}/${a.category ?? 'other'}/${tail}`;
  }
}
