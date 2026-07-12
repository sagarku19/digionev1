import { describe, it, expect } from 'vitest';
import { parseUserAgent, isBot } from './ua';

const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const EDGE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0';

describe('parseUserAgent', () => {
  it('parses desktop Chrome on Windows', () => {
    expect(parseUserAgent(CHROME_WIN)).toEqual({ deviceType: 'desktop', browser: 'Chrome', os: 'Windows' });
  });

  it('parses mobile Safari on iPhone', () => {
    expect(parseUserAgent(SAFARI_IPHONE)).toEqual({ deviceType: 'mobile', browser: 'Safari', os: 'iOS' });
  });

  it('prefers Edge over Chrome when both tokens present', () => {
    expect(parseUserAgent(EDGE).browser).toBe('Edge');
  });

  it('handles a null UA', () => {
    expect(parseUserAgent(null)).toEqual({ deviceType: 'desktop', browser: 'Other', os: 'Other' });
  });
});

describe('isBot', () => {
  it('flags common crawlers and empty UAs', () => {
    expect(isBot('facebookexternalhit/1.1')).toBe(true);
    expect(isBot('Googlebot/2.1')).toBe(true);
    expect(isBot('')).toBe(true);
    expect(isBot(null)).toBe(true);
  });

  it('passes a real browser UA', () => {
    expect(isBot(CHROME_WIN)).toBe(false);
  });
});
