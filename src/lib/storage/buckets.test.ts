import { describe, it, expect, beforeEach } from 'vitest';
import { resolveBucket, publicUrlFor, LOGICAL_BUCKETS } from './buckets';

beforeEach(() => {
  process.env.R2_BUCKET_PUBLIC = 'digione-public-assets';
  process.env.R2_BUCKET_MEDIA = 'digione-media';
  process.env.R2_BUCKET_PRODUCTS = 'digione-products';
  process.env.R2_BUCKET_KYC = 'digione-kyc-private';
  process.env.NEXT_PUBLIC_R2_BUCKET_PUBLIC_URL = 'https://assets.example.com';
  process.env.NEXT_PUBLIC_R2_MEDIA_URL = 'https://media.example.com';
});

describe('resolveBucket', () => {
  it('maps creator-public to the media bucket, public', () => {
    const c = resolveBucket('creator-public');
    expect(c.name).toBe('digione-media');
    expect(c.visibility).toBe('public');
  });
  it('maps creator-content to the products bucket, private', () => {
    const c = resolveBucket('creator-content');
    expect(c.name).toBe('digione-products');
    expect(c.visibility).toBe('private');
    expect(c.publicBaseUrl).toBeNull();
  });
  it('maps creator-private to the kyc bucket, private', () => {
    expect(resolveBucket('creator-private').name).toBe('digione-kyc-private');
  });
  it('throws on unknown logical bucket', () => {
    // @ts-expect-error invalid on purpose
    expect(() => resolveBucket('nope')).toThrow();
  });
});

describe('publicUrlFor', () => {
  it('builds a public URL for a public bucket', () => {
    expect(publicUrlFor('creator-public', 'abc/cover/1_x.webp'))
      .toBe('https://media.example.com/abc/cover/1_x.webp');
  });
  it('returns null for a private bucket', () => {
    expect(publicUrlFor('creator-content', 'abc/p/1_x.zip')).toBeNull();
  });
});

describe('LOGICAL_BUCKETS', () => {
  it('lists exactly the four logical buckets', () => {
    expect([...LOGICAL_BUCKETS].sort()).toEqual(
      ['creator-content', 'creator-private', 'creator-public', 'public-asset'],
    );
  });
});
