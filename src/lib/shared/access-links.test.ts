import { describe, it, expect } from 'vitest';
import { normalizeAccessLinks, buildAccessLinks, mergeAccessLinks } from './access-links';

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

describe('mergeAccessLinks', () => {
  const A = { label: 'Access', url: 'https://a.com' };
  const B = { label: 'Bonus', url: 'https://b.com' };

  it('a link added live appears alongside the purchased snapshot', () => {
    expect(mergeAccessLinks([A, B], [A])).toEqual([A, B]);
  });

  it('a link removed live is RETAINED from the snapshot (never disappears)', () => {
    expect(mergeAccessLinks([A], [A, B])).toEqual([A, B]);
  });

  it('an edited link (same label, new url) updates in place — no stale duplicate', () => {
    const oldPortal = { label: 'Portal', url: 'https://old.com' };
    const newPortal = { label: 'Portal', url: 'https://new.com' };
    expect(mergeAccessLinks([newPortal], [oldPortal])).toEqual([newPortal]);
  });

  it('label match is case-insensitive', () => {
    const live = { label: 'portal', url: 'https://new.com' };
    const snap = { label: 'Portal', url: 'https://old.com' };
    expect(mergeAccessLinks([live], [snap])).toEqual([live]);
  });

  it('dedupes by url across sources', () => {
    expect(mergeAccessLinks([{ label: 'X', url: 'https://same.com' }], [{ label: 'Y', url: 'https://same.com' }]))
      .toHaveLength(1);
  });

  it('empty live falls back entirely to snapshot (unpublished product)', () => {
    expect(mergeAccessLinks([], [A, B])).toEqual([A, B]);
  });
});
