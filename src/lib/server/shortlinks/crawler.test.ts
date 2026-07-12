import { describe, it, expect } from 'vitest';
import { isSocialCrawler } from './crawler';

describe('isSocialCrawler', () => {
  it('flags social preview crawlers', () => {
    expect(isSocialCrawler('facebookexternalhit/1.1')).toBe(true);
    expect(isSocialCrawler('Twitterbot/1.0')).toBe(true);
    expect(isSocialCrawler('WhatsApp/2.23')).toBe(true);
    expect(isSocialCrawler('LinkedInBot/1.0')).toBe(true);
  });
  it('does not flag a real browser or null', () => {
    expect(isSocialCrawler('Mozilla/5.0 (Windows NT 10.0) Chrome/120')).toBe(false);
    expect(isSocialCrawler(null)).toBe(false);
  });
});
