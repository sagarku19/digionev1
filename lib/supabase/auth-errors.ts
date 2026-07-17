// lib/supabase/auth-errors.ts
// Error vocabulary for the tri-state client auth layer. NotLoggedInError = the
// server definitively has no session (fail fast; AuthGuard owns the redirect).
// AuthUnavailableError = auth is temporarily unreachable (network stall / rate
// limit); marked retryable so TanStack Query's backoff self-heals it.

export class NotLoggedInError extends Error {
  readonly isNotLoggedIn = true;
  constructor() {
    super('Not logged in');
    this.name = 'NotLoggedInError';
  }
}

export class AuthUnavailableError extends Error {
  readonly retryable = true;
  constructor() {
    super('Auth temporarily unreachable — will retry');
    this.name = 'AuthUnavailableError';
  }
}
