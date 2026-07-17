// lib/supabase/current-user.ts
// Single-flight + lock-recovery wrapper around supabase.auth.getUser() for the browser.
// Collapses concurrent callers onto one in-flight request (the "13 concurrent getUser"
// amplifier) and degrades to the last-known user instead of crashing when the per-tab
// auth lock can't be acquired (ProcessLockAcquireTimeoutError) during a network stall.

import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

type GetUser = () => Promise<User | null>;

const RECOVERY_RETRY_DELAY_MS = 800;

let lastKnownUser: User | null = null;

function isLockAcquireTimeout(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    (err as { isAcquireTimeout?: boolean }).isAcquireTimeout === true
  );
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

// Pure orchestration over an injected getUser (unit-tested directly).
export async function resolveCurrentUser(getUser: GetUser): Promise<User | null> {
  try {
    lastKnownUser = await getUser();
    return lastKnownUser;
  } catch (err) {
    if (!isLockAcquireTimeout(err)) throw err;
    await delay(RECOVERY_RETRY_DELAY_MS);
    try {
      lastKnownUser = await getUser();
      return lastKnownUser;
    } catch (err2) {
      if (!isLockAcquireTimeout(err2)) throw err2;
      return lastKnownUser; // degrade to cached identity; never crash the tree
    }
  }
}

export const getCurrentUser = createSingleFlight<User | null>(() =>
  resolveCurrentUser(async () => {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  }),
);

export function __resetCurrentUserCacheForTests(): void {
  lastKnownUser = null;
}
