// lib/supabase/current-user.ts
// Tri-state auth snapshot for the browser: authenticated | unauthenticated | degraded.
// auth-js getUser() RESOLVES with { user: null, error } on network failures
// (fetch.js wraps any fetch rejection in AuthRetryableFetchError; _getUser returns
// AuthErrors instead of throwing) — so "no user" alone must never be read as
// "signed out". classifyAuthOutcome encodes the distinction; degraded keeps the
// last-known user and never clobbers the cache. getCurrentUser() remains the
// compat façade for existing call sites. Design:
// docs/superpowers/specs/2026-07-18-auth-reliability-design.md

import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { logAuthEvent } from '@/lib/supabase/auth-debug';

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'degraded';
export interface AuthSnapshot {
  status: AuthStatus;
  user: User | null;
}
export type AuthClassification = 'authenticated' | 'unauthenticated' | 'transient';

interface RawAuthOutcome {
  user: User | null;
  error: unknown;
}
type RawGetUser = () => Promise<RawAuthOutcome>;

const LOCK_RETRY_DELAY_MS = 800;

let lastKnownUser: User | null = null;

function isLockAcquireTimeout(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    (err as { isAcquireTimeout?: boolean }).isAcquireTimeout === true
  );
}

function errorName(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('name' in error)) return null;
  return String((error as { name: unknown }).name);
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('status' in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

export function classifyAuthOutcome(user: User | null, error: unknown): AuthClassification {
  if (user) return 'authenticated';
  if (!error) return 'unauthenticated';
  const name = errorName(error);
  if (name === 'AuthRetryableFetchError' || name === 'AuthUnknownError') return 'transient';
  const status = errorStatus(error);
  if (status === 429 || (status !== null && status >= 500)) return 'transient';
  return 'unauthenticated';
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createSingleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return () => {
    if (inFlight) return inFlight;
    inFlight = fn().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

// Pure orchestration over an injected raw getUser outcome (unit-tested directly).
// Lock-acquire timeouts THROW out of getUser (they happen before _getUser runs)
// and fail fast (~5s), so they get one retry; network errors arrive in the
// error field having already burned the 12s fetch budget, so they degrade
// immediately.
export async function resolveAuthSnapshot(rawGetUser: RawGetUser): Promise<AuthSnapshot> {
  let outcome: RawAuthOutcome;
  try {
    outcome = await rawGetUser();
  } catch (err) {
    if (!isLockAcquireTimeout(err)) throw err;
    await delay(LOCK_RETRY_DELAY_MS);
    try {
      outcome = await rawGetUser();
    } catch (err2) {
      if (!isLockAcquireTimeout(err2)) throw err2;
      return { status: 'degraded', user: lastKnownUser };
    }
  }
  const classification = classifyAuthOutcome(outcome.user, outcome.error);
  if (classification === 'authenticated') {
    lastKnownUser = outcome.user;
    return { status: 'authenticated', user: outcome.user };
  }
  if (classification === 'unauthenticated') {
    lastKnownUser = null;
    return { status: 'unauthenticated', user: null };
  }
  return { status: 'degraded', user: lastKnownUser };
}

// Keeps the cache fresh for free (refresh/sign-in events carry the user) and
// clears it on definitive sign-out. Lazy so tests importing pure functions
// never touch the real client.
let authEventsSubscribed = false;
function ensureAuthEventSubscription(): void {
  if (authEventsSubscribed || typeof window === 'undefined') return;
  authEventsSubscribed = true;
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      lastKnownUser = null;
    } else if (session?.user) {
      lastKnownUser = session.user;
    }
    logAuthEvent(event, session?.expires_at ?? null);
  });
}

export const getAuthSnapshot: () => Promise<AuthSnapshot> = createSingleFlight<AuthSnapshot>(() => {
  ensureAuthEventSubscription();
  return resolveAuthSnapshot(async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user ?? null, error };
  });
});

export async function getCurrentUser(): Promise<User | null> {
  return (await getAuthSnapshot()).user;
}

export function __resetCurrentUserCacheForTests(): void {
  lastKnownUser = null;
}
