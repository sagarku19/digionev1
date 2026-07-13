import { describe, it, expect } from 'vitest';
import { eventDedupKey } from './dedup';

describe('eventDedupKey', () => {
  it('is stable for the same comment', () => {
    const a = eventDedupKey({ accountId: 'acc', eventType: 'comment', externalId: 'c1' });
    const b = eventDedupKey({ accountId: 'acc', eventType: 'comment', externalId: 'c1' });
    expect(a).toBe(b);
  });
  it('differs across accounts, types, ids', () => {
    const base = { accountId: 'acc', eventType: 'comment' as const, externalId: 'c1' };
    expect(eventDedupKey(base)).not.toBe(eventDedupKey({ ...base, accountId: 'acc2' }));
    expect(eventDedupKey(base)).not.toBe(eventDedupKey({ ...base, externalId: 'c2' }));
  });
  it('returns null when there is no external id (cannot dedup)', () => {
    expect(eventDedupKey({ accountId: 'acc', eventType: 'dm', externalId: undefined })).toBeNull();
  });
});
