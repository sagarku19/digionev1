import { describe, it, expect } from 'vitest';
import { appendUtmParams } from './redirect-url';

describe('appendUtmParams', () => {
  it('appends only the set utm params', () => {
    const out = appendUtmParams('https://example.com/p', {
      utm_source: 'ig', utm_medium: null, utm_campaign: 'spring',
    });
    expect(out).toContain('utm_source=ig');
    expect(out).toContain('utm_campaign=spring');
    expect(out).not.toContain('utm_medium');
  });

  it('does not override params already on the destination', () => {
    const out = appendUtmParams('https://example.com/p?utm_source=existing', { utm_source: 'ig' });
    expect(out).toContain('utm_source=existing');
    expect(out).not.toContain('utm_source=ig');
  });

  it('returns the raw string when destination is not a URL', () => {
    expect(appendUtmParams('not a url', { utm_source: 'ig' })).toBe('not a url');
  });
});
