import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { toWebp, cropToWebp, probe } from './images';

async function redPng(w: number, h: number): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
}

describe('images', () => {
  it('probe returns source dimensions', async () => {
    const dim = await probe(await redPng(120, 80));
    expect(dim).toEqual({ width: 120, height: 80 });
  });
  it('toWebp converts and caps width', async () => {
    const out = await toWebp(await redPng(4000, 2000), { maxWidth: 1600 });
    expect(out.contentType).toBe('image/webp');
    expect(out.width).toBe(1600);
    expect(out.size).toBeGreaterThan(0);
  });
  it('cropToWebp extracts the requested box', async () => {
    const out = await cropToWebp(await redPng(200, 200), { x: 10, y: 10, width: 50, height: 40, aspect: null });
    expect(out.width).toBe(50);
    expect(out.height).toBe(40);
    expect(out.contentType).toBe('image/webp');
  });
});
