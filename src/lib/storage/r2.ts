// R2 implementation of StorageProvider. R2 is S3-compatible; the endpoint is
// derived from R2_ACCOUNT_ID. Server-only — never import in a client component.
import {
  S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider } from './index';

const DEFAULT_TTL = 600; // 10 minutes

function client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('[storage/r2] missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export const r2Storage: StorageProvider = {
  async createUploadUrl({ bucket, objectKey, contentType, ttlSeconds }) {
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType });
    return getSignedUrl(client(), cmd, { expiresIn: ttlSeconds ?? DEFAULT_TTL });
  },
  async createDownloadUrl({ bucket, objectKey, ttlSeconds }) {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
    return getSignedUrl(client(), cmd, { expiresIn: ttlSeconds ?? DEFAULT_TTL });
  },
  async putObject({ bucket, objectKey, body, contentType }) {
    await client().send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: body, ContentType: contentType }));
  },
  async headObject({ bucket, objectKey }) {
    const res = await client().send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
    return { size: res.ContentLength ?? 0, contentType: res.ContentType ?? null };
  },
  async delete({ bucket, objectKey }) {
    await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
  },
};
