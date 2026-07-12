import { describe, it, expect } from 'vitest';
import { dedupHash, hashIp } from './dedup';

describe('dedup', () => {
  it('hashes an ip to 16 hex chars', () => {
    const h = hashIp('1.2.3.4');
    expect(h).toHaveLength(16);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it('is stable within the same 30s bucket', () => {
    const t = 1_000_000_000_000;
    expect(dedupHash('link1', 'ip1', t)).toBe(dedupHash('link1', 'ip1', t + 5_000));
  });

  it('changes across buckets', () => {
    const t = 1_000_000_000_000;
    expect(dedupHash('link1', 'ip1', t)).not.toBe(dedupHash('link1', 'ip1', t + 40_000));
  });

  it('changes for a different link or ip', () => {
    const t = 1_000_000_000_000;
    expect(dedupHash('link1', 'ip1', t)).not.toBe(dedupHash('link2', 'ip1', t));
    expect(dedupHash('link1', 'ip1', t)).not.toBe(dedupHash('link1', 'ip2', t));
  });
});
