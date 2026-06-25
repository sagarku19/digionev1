// Public surface of the storage layer. Routes import `storage` and the helpers
// here — never the aws-sdk directly.
import { r2Storage } from './r2';

export interface StorageProvider {
  createUploadUrl(a: { bucket: string; objectKey: string; contentType: string; ttlSeconds?: number }): Promise<string>;
  createDownloadUrl(a: { bucket: string; objectKey: string; ttlSeconds?: number }): Promise<string>;
  putObject(a: { bucket: string; objectKey: string; body: Buffer; contentType: string }): Promise<void>;
  headObject(a: { bucket: string; objectKey: string }): Promise<{ size: number; contentType: string | null }>;
  delete(a: { bucket: string; objectKey: string }): Promise<void>;
}

export const storage: StorageProvider = r2Storage;

export { resolveBucket, publicUrlFor, LOGICAL_BUCKETS } from './buckets';
export type { LogicalBucket, BucketConfig } from './buckets';
export { buildObjectKey } from './object-key';
export { parseCrop } from './crop';
export type { Crop, CropInput } from './crop';
export { toWebp, cropToWebp, probe } from './images';
