// Validates a creator-supplied destination URL for the public redirector.
// Blocks dangerous schemes, self-loops to the short domain, and DigiOne
// auth/login URLs (anti open-redirect / credential phishing).

const BLOCKED_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];
const BLOCKED_APP_PATHS = ['/login', '/signup', '/api/auth', '/user-login', '/reset-password'];

export interface UrlSafetyResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export function validateDestinationUrl(
  raw: string,
  opts: { shortDomain?: string; appHost?: string } = {}
): UrlSafetyResult {
  const input = (raw ?? '').trim();
  if (!input) return { ok: false, error: 'Destination URL is required' };

  const lower = input.toLowerCase();
  if (BLOCKED_SCHEMES.some((s) => lower.startsWith(s))) {
    return { ok: false, error: 'That URL scheme is not allowed' };
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, error: 'Enter a full URL including https://' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https links are allowed' };
  }

  const host = parsed.host.toLowerCase();

  if (opts.shortDomain && host === opts.shortDomain.toLowerCase()) {
    return { ok: false, error: 'A short link cannot point to the short domain' };
  }

  if (opts.appHost && host === opts.appHost.toLowerCase()) {
    const path = parsed.pathname.toLowerCase();
    if (BLOCKED_APP_PATHS.some((p) => path.startsWith(p))) {
      return { ok: false, error: 'That destination is not allowed' };
    }
  }

  return { ok: true, url: parsed.toString() };
}
