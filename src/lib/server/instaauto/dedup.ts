// Stable dedup key for inbound events → instaauto_events.dedup_key (partial UNIQUE).
// A redelivered webhook for the same comment/message/postback is a no-op. When there's
// no stable external id, returns null (row still inserts, just not deduped).
import type { InboundEventType } from './types';

export function eventDedupKey(o: {
  accountId: string;
  eventType: InboundEventType;
  externalId: string | undefined;
}): string | null {
  if (!o.externalId) return null;
  return `${o.accountId}:${o.eventType}:${o.externalId}`;
}
