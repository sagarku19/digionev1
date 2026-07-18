// Pure role-gate for guarded routes (/dashboard, /account), shared by both
// middleware auth paths (local JWT claims and the getUser fallback). Must stay
// edge-safe: no Node-only imports. Assumes the caller has already verified the
// requester is authenticated — unauthenticated requests never reach this gate.

export type RouteGateDecision =
  | { type: 'allow' }
  | { type: 'redirect'; pathname: string };

export function gateGuardedRoute(pathname: string, role: unknown): RouteGateDecision {
  if (pathname.startsWith('/dashboard')) {
    if (role !== 'creator' && role !== 'super_admin') {
      return { type: 'redirect', pathname: '/account/library' };
    }
    if (pathname.startsWith('/dashboard/admin') && role !== 'super_admin') {
      return { type: 'redirect', pathname: '/dashboard' };
    }
  }
  return { type: 'allow' };
}
