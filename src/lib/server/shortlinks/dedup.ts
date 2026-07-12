import { createHash } from 'crypto';

// 30-second bucket dedup key — the UNIQUE guard that makes click recording
// idempotent (see the linksh_record_click RPC).
export const DEDUP_WINDOW_SECONDS = 30;

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export function dedupHash(linkId: string, ipHash: string, nowMs: number = Date.now()): string {
  const bucket = Math.floor(nowMs / 1000 / DEDUP_WINDOW_SECONDS);
  return createHash('sha256').update(`${linkId}:${ipHash}:${bucket}`).digest('hex');
}
