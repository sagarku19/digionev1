// Short-link domain + URL helpers. Safe on client and server — reads only a
// NEXT_PUBLIC_ env var. Do NOT import server-only modules here.

export function getShortlinkDomain(): string {
  return process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN || '';
}

export function shortUrl(code: string): string {
  const host = getShortlinkDomain() || 'localhost:3000';
  const scheme = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  return `${scheme}://${host}/${code}`;
}
