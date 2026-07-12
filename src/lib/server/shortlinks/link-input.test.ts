import { describe, it, expect } from 'vitest';
import { sanitizePhase2Fields } from './link-input';

const opts = { shortDomain: 'linkme.you', appHost: 'digione.ai' };

describe('sanitizePhase2Fields', () => {
  it('accepts and passes through valid urls + max_clicks', () => {
    const r = sanitizePhase2Fields({ ios_url: 'https://apps.apple.com/x', max_clicks: 100 }, opts);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.fields.ios_url).toContain('apps.apple.com'); expect(r.fields.max_clicks).toBe(100); }
  });
  it('rejects an unsafe ios_url', () => {
    const r = sanitizePhase2Fields({ ios_url: 'javascript:alert(1)' }, opts);
    expect(r.ok).toBe(false);
  });
  it('builds a cleaned geo map and drops bad entries via error', () => {
    const good = sanitizePhase2Fields({ geo: { in: 'https://in.com', US: 'https://us.com' } }, opts);
    expect(good.ok).toBe(true);
    // new URL() normalizes bare origins with a trailing slash
    if (good.ok) expect(good.fields.geo).toEqual({ IN: 'https://in.com/', US: 'https://us.com/' });
    const bad = sanitizePhase2Fields({ geo: { US: 'not-a-url' } }, opts);
    expect(bad.ok).toBe(false);
  });
  it('clears fields on empty string / null', () => {
    const r = sanitizePhase2Fields({ ios_url: '', geo: {}, max_clicks: null, og_title: '' }, opts);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.fields.ios_url).toBeNull(); expect(r.fields.geo).toBeNull(); expect(r.fields.max_clicks).toBeNull(); expect(r.fields.og_title).toBeNull(); }
  });
  it('rejects an invalid country code', () => {
    expect(sanitizePhase2Fields({ geo: { USA: 'https://x.com' } }, opts).ok).toBe(false);
  });
});
