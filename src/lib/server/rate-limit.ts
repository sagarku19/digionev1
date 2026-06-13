// Postgres-backed fixed-window rate limiting via the check_rate_limit RPC.
// Fail-open: if the RPC errors, allow the request (availability over strictness).
// Server-only.

import { createHash } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

export interface RateLimitOptions {
  max: number;
  windowSeconds: number;
}

export async function rateLimit(
  req: Request,
  routeName: string,
  opts: RateLimitOptions
): Promise<boolean> {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 32);

    const db = createServiceClient();
    const { data, error } = await db.rpc('check_rate_limit', {
      p_key: `${routeName}:${ipHash}`,
      p_max: opts.max,
      p_window_seconds: opts.windowSeconds,
    });

    if (error) {
      console.error('[rate-limit]', routeName, error.message);
      return true; // fail open
    }
    return data === true;
  } catch (err) {
    console.error('[rate-limit]', routeName, err);
    return true; // fail open
  }
}
