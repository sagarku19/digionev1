// Sanitizes creator-supplied values interpolated into <style> tags (finding #8).
// Invalid values fall back to the existing defaults — never throw.

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const COLOR_FUNCTION = /^(rgb|rgba|hsl|hsla)\(\s*[\d.\s,%/]+\)$/;
const NAMED_COLOR = /^[a-zA-Z]+$/;
const FONT_FAMILY = /^[\w\s,'-]+$/;

export function safeCssColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (HEX_COLOR.test(v) || COLOR_FUNCTION.test(v) || NAMED_COLOR.test(v)) return v;
  return fallback;
}

export function safeFontFamily(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  return FONT_FAMILY.test(v) ? v : fallback;
}
