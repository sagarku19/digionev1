// Local JWT verification for API routes — the server-side counterpart of the
// proxy.ts middleware change. Route handlers create a fresh Supabase client per
// request, so auth-js's per-instance JWKS cache never hits; this module keeps
// its own JWKS cache (per warm serverless instance) and passes it into
// getClaims(), making verification a pure in-process signature check for live
// tokens. getUser() remains the fallback for anything local verification can't
// settle (JWKS outage, malformed token, HS256 transition tokens).
//
// Scope: HIGH-FREQUENCY routes only (media, uploads, links, sites, files,
// deliverables). Money/KYC/admin/checkout routes deliberately stay on
// getUser() — they authorize service-role writes where revocation freshness
// matters more than a saved round-trip. See security-model.md.

export interface VerifiedIdentity {
  userId: string;
  email: string | null;
  role: string | null;
}

interface Jwks {
  keys: unknown[];
}

interface ClaimsError {
  name?: unknown;
}

interface AuthClientLike {
  auth: {
    getClaims(
      jwt?: string,
      options?: { jwks: Jwks },
    ): Promise<{ data: { claims: Record<string, unknown> } | null; error: ClaimsError | null }>;
    getUser(): Promise<{
      data: {
        user: { id: string; email?: string | null; app_metadata?: Record<string, unknown> } | null;
      };
      error: unknown;
    }>;
  };
}

export function identityFromClaims(claims: Record<string, unknown>): VerifiedIdentity | null {
  const sub = claims.sub;
  if (typeof sub !== 'string' || sub.length === 0) return null;
  const email = typeof claims.email === 'string' ? claims.email : null;
  const appMetadata = claims.app_metadata;
  const role =
    appMetadata && typeof appMetadata === 'object' && 'role' in appMetadata &&
    typeof (appMetadata as { role: unknown }).role === 'string'
      ? (appMetadata as { role: string }).role
      : null;
  return { userId: sub, email, role };
}

// A missing session is definitive (getUser would read the same empty cookies);
// every other failure (JWKS outage, invalid/legacy token) gets the network path
// so a verification hiccup never 401s a valid user.
export function shouldFallBackToGetUser(error: ClaimsError | null): boolean {
  if (!error) return false;
  return error.name !== 'AuthSessionMissingError';
}

interface JwksCacheDeps {
  fetchJwks: () => Promise<Jwks | null>;
  now?: () => number;
  ttlMs?: number;
}

// Stale-on-error, single-flight, and no negative caching: an empty key set
// (project still on the legacy HS256 secret) must be re-checked so a key
// rotation is picked up without a redeploy.
export function createJwksCache(deps: JwksCacheDeps): () => Promise<Jwks | null> {
  const now = deps.now ?? Date.now;
  const ttlMs = deps.ttlMs ?? 600_000;
  let cached: Jwks | null = null;
  let fetchedAt = Number.NEGATIVE_INFINITY;
  let inFlight: Promise<Jwks | null> | null = null;

  return () => {
    if (cached && now() - fetchedAt < ttlMs) return Promise.resolve(cached);
    if (inFlight) return inFlight;
    inFlight = deps
      .fetchJwks()
      .then((fresh) => {
        if (fresh && Array.isArray(fresh.keys) && fresh.keys.length > 0) {
          cached = fresh;
          fetchedAt = now();
        }
        return cached;
      })
      .catch(() => cached)
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };
}

export async function verifyIdentity(
  client: AuthClientLike,
  getJwks: () => Promise<Jwks | null>,
): Promise<VerifiedIdentity | null> {
  let fallback = false;
  try {
    const jwks = await getJwks();
    const { data, error } = await client.auth.getClaims(undefined, jwks ? { jwks } : undefined);
    if (data?.claims) {
      const identity = identityFromClaims(data.claims);
      if (identity) return identity;
      fallback = true;
    } else {
      fallback = shouldFallBackToGetUser(error);
    }
  } catch {
    fallback = true;
  }
  if (!fallback) return null;

  const { data } = await client.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const role = user.app_metadata?.role;
  return {
    userId: user.id,
    email: user.email ?? null,
    role: typeof role === 'string' ? role : null,
  };
}

const getProjectJwks = createJwksCache({
  fetchJwks: async () => {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!baseUrl) return null;
    const res = await fetch(`${baseUrl}/auth/v1/.well-known/jwks.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Jwks;
  },
});

// The cast bridges auth-js's `JWK[]` option type and our unvalidated
// `unknown[]` JWKS keys (we fetch the endpoint without parsing key shapes —
// auth-js does its own kid lookup and WebCrypto import, and simply fails
// verification on a malformed key, which lands in the getUser fallback).
// Runtime-compatible; only the nominal key element type differs.
export async function getVerifiedIdentity(client: {
  auth: { getUser: unknown; getClaims: unknown };
}): Promise<VerifiedIdentity | null> {
  return verifyIdentity(client as unknown as AuthClientLike, getProjectJwks);
}
