// Public surface of the storage layer. Routes import `storage` and the helpers
// here — never the aws-sdk directly.
import { r2Storage } from './r2';
import type { StorageProvider } from './types';

export const storage: StorageProvider = r2Storage;

export type { StorageProvider } from './types';

export { resolveBucket, publicUrlFor, LOGICAL_BUCKETS } from './buckets';
export type { LogicalBucket, BucketConfig } from './buckets';
export { buildObjectKey } from './object-key';
export { parseCrop } from './crop';
export type { Crop, CropInput } from './crop';
export { toWebp, cropToWebp, probe } from './images';
