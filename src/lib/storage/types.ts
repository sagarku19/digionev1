// Storage provider interface. Lives in its own module so r2.ts and index.ts
// both depend on it (a DAG) instead of importing types through the barrel.

export interface StorageProvider {
  createUploadUrl(a: { bucket: string; objectKey: string; contentType: string; ttlSeconds?: number }): Promise<string>;
  createDownloadUrl(a: { bucket: string; objectKey: string; ttlSeconds?: number }): Promise<string>;
  putObject(a: { bucket: string; objectKey: string; body: Buffer; contentType: string }): Promise<void>;
  headObject(a: { bucket: string; objectKey: string }): Promise<{ size: number; contentType: string | null }>;
  delete(a: { bucket: string; objectKey: string }): Promise<void>;
}
