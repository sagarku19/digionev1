// Server-only sharp helpers. Originals are converted to WebP (capped width);
// derivatives are cropped from the original then converted. One lossy pass.
import sharp from 'sharp';
import type { Crop } from './crop';

export interface WebpResult { data: Buffer; contentType: 'image/webp'; width: number; height: number; size: number }

const DEFAULT_MAX_WIDTH = 2048;
const QUALITY = 82;

export async function probe(input: Buffer): Promise<{ width: number; height: number }> {
  const m = await sharp(input).metadata();
  if (!m.width || !m.height) throw new Error('unreadable image');
  return { width: m.width, height: m.height };
}

export async function toWebp(input: Buffer, opts?: { maxWidth?: number }): Promise<WebpResult> {
  const pipeline = sharp(input).rotate().resize({
    width: opts?.maxWidth ?? DEFAULT_MAX_WIDTH,
    withoutEnlargement: true,
  }).webp({ quality: QUALITY });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { data, contentType: 'image/webp', width: info.width, height: info.height, size: info.size };
}

export async function cropToWebp(input: Buffer, crop: Crop): Promise<WebpResult> {
  const { data, info } = await sharp(input)
    .rotate()
    .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
    .webp({ quality: QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { data, contentType: 'image/webp', width: info.width, height: info.height, size: info.size };
}
