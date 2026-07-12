// Builds the final redirect URL by appending the link's set UTM params
// to the destination (without clobbering params already present).

export interface UtmParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}

export function appendUtmParams(destination: string, utm: UtmParams): string {
  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return destination;
  }
  const entries: Array<[string, string | null | undefined]> = [
    ['utm_source', utm.utm_source],
    ['utm_medium', utm.utm_medium],
    ['utm_campaign', utm.utm_campaign],
    ['utm_term', utm.utm_term],
    ['utm_content', utm.utm_content],
  ];
  for (const [key, value] of entries) {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}
