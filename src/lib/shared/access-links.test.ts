import { describe, it, expect } from 'vitest';
import { normalizeAccessLinks, buildAccessLinks } from './access-links';

describe('normalizeAccessLinks', () => {
  it('returns [] for non-arrays', () => {
    expect(normalizeAccessLinks(null)).toEqual([]);
    expect(normalizeAccessLinks(undefined)).toEqual([]);
    expect(normalizeAccessLinks('nope')).toEqual([]);
    expect(normalizeAccessLinks({})).toEqual([]);
  });

  it('keeps valid rows, trims, drops entries without a url', () => {
    const out = normalizeAccessLinks([
      { label: '  Portal ', url: ' https://a.com ' },
      { label: 'No url' },
      { url: 'https://b.com' },
      { label: 'Blank', url: '   ' },
      'garbage',
    ]);
    expect(out).toEqual([
      { label: 'Portal', url: 'https://a.com' },
      { label: 'Access link', url: 'https://b.com' }, // missing label → default
    ]);
  });
});

describe('buildAccessLinks', () => {
  it('puts post_purchase_url first labelled "Access"', () => {
    expect(buildAccessLinks({ postPurchaseUrl: 'https://primary.com', accessLinks: [] })).toEqual([
      { label: 'Access', url: 'https://primary.com' },
    ]);
  });

  it('combines primary + labelled array', () => {
    expect(
      buildAccessLinks({
        postPurchaseUrl: 'https://primary.com',
        accessLinks: [{ label: 'Discord', url: 'https://discord.gg/x' }],
      }),
    ).toEqual([
      { label: 'Access', url: 'https://primary.com' },
      { label: 'Discord', url: 'https://discord.gg/x' },
    ]);
  });

  it('dedupes by url', () => {
    expect(
      buildAccessLinks({
        postPurchaseUrl: 'https://dup.com',
        accessLinks: [{ label: 'Same', url: 'https://dup.com' }],
      }),
    ).toEqual([{ label: 'Access', url: 'https://dup.com' }]);
  });

  it('returns [] when nothing set', () => {
    expect(buildAccessLinks({ postPurchaseUrl: null, accessLinks: null })).toEqual([]);
    expect(buildAccessLinks({ postPurchaseUrl: '  ', accessLinks: [] })).toEqual([]);
  });

  it('links-only (no primary)', () => {
    expect(buildAccessLinks({ postPurchaseUrl: '', accessLinks: [{ label: 'Only', url: 'https://only.com' }] })).toEqual([
      { label: 'Only', url: 'https://only.com' },
    ]);
  });
});
