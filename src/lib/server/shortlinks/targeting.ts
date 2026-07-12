// Chooses the destination for a click: geo match → device match → default. Pure.

export interface TargetableLink {
  destination_url: string;
  ios_url: string | null;
  android_url: string | null;
  geo: unknown; // jsonb: { [countryCode: string]: string } | null
}

export function pickDestination(
  link: TargetableLink,
  ctx: { country: string | null; os: string }
): string {
  if (link.geo && typeof link.geo === 'object' && ctx.country) {
    const map = link.geo as Record<string, unknown>;
    const url = map[ctx.country.toUpperCase()];
    if (typeof url === 'string' && url) return url;
  }
  if (ctx.os === 'iOS' && link.ios_url) return link.ios_url;
  if (ctx.os === 'Android' && link.android_url) return link.android_url;
  return link.destination_url;
}
