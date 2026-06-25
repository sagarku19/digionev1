import { describe, it, expect } from 'vitest';
import { buildObjectKey } from './object-key';

describe('buildObjectKey', () => {
  it('public-asset is platform-scoped under digione/', () => {
    expect(buildObjectKey('public-asset', { ts: 100, safeName: 'a.webp', creatorId: 'C', kind: 'cover' }))
      .toBe('digione/cover/100_a.webp');
  });
  it('creator-public is creator/kind scoped', () => {
    expect(buildObjectKey('creator-public', { ts: 100, safeName: 'a.webp', creatorId: 'C', kind: 'avatar' }))
      .toBe('C/avatar/100_a.webp');
  });
  it('creator-public derivatives go under a derived/ segment', () => {
    expect(buildObjectKey('creator-public', { ts: 100, safeName: 'a.webp', creatorId: 'C', kind: 'cover', derived: true }))
      .toBe('C/cover/derived/100_a.webp');
  });
  it('creator-content uses productId when present, else unassigned', () => {
    expect(buildObjectKey('creator-content', { ts: 1, safeName: 'z.zip', creatorId: 'C', productId: 'P' }))
      .toBe('C/P/1_z.zip');
    expect(buildObjectKey('creator-content', { ts: 1, safeName: 'z.zip', creatorId: 'C' }))
      .toBe('C/unassigned/1_z.zip');
  });
  it('creator-private uses category', () => {
    expect(buildObjectKey('creator-private', { ts: 1, safeName: 'pan.pdf', creatorId: 'C', category: 'kyc' }))
      .toBe('C/kyc/1_pan.pdf');
  });
});
