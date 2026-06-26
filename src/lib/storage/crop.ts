// Crop box in SOURCE pixels (react-easy-crop croppedAreaPixels), validated +
// clamped against the source image dimensions. Stored verbatim in storage_files.crop.

export interface CropInput {
  x: number; y: number; width: number; height: number; aspect?: number | null;
}
export interface Crop {
  x: number; y: number; width: number; height: number; aspect: number | null;
}

export function parseCrop(raw: unknown, source: { width: number; height: number }): Crop {
  if (typeof raw !== 'object' || raw === null) throw new Error('crop required');
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, n: string): number => {
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`crop.${n} must be a finite number`);
    return v;
  };
  const x = Math.max(0, Math.floor(num(r.x, 'x')));
  const y = Math.max(0, Math.floor(num(r.y, 'y')));
  if (x >= source.width || y >= source.height) throw new Error('crop origin out of bounds');
  let width = Math.floor(num(r.width, 'width'));
  let height = Math.floor(num(r.height, 'height'));
  width = Math.min(width, source.width - x);
  height = Math.min(height, source.height - y);
  if (width <= 0 || height <= 0) throw new Error('crop has zero area');
  const aspect = typeof r.aspect === 'number' && Number.isFinite(r.aspect) && r.aspect > 0 ? r.aspect : null;
  return { x, y, width, height, aspect };
}
