import { describe, it, expect, afterEach } from 'vitest';
import { getShortlinkDomain, shortUrl } from './shortlink';

const original = process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN;
afterEach(() => { process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN = original; });

describe('shortlink domain helpers', () => {
  it('returns the configured domain', () => {
    process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN = 'linkme.you';
    expect(getShortlinkDomain()).toBe('linkme.you');
  });

  it('builds an https short url for a real domain', () => {
    process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN = 'linkme.you';
    expect(shortUrl('abc123')).toBe('https://linkme.you/abc123');
  });

  it('uses http for localhost', () => {
    process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN = 'localhost:3000';
    expect(shortUrl('abc123')).toBe('http://localhost:3000/abc123');
  });

  it('falls back to empty domain string', () => {
    delete process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN;
    expect(getShortlinkDomain()).toBe('');
  });
});
