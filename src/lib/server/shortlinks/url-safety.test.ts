import { describe, it, expect } from 'vitest';
import { validateDestinationUrl } from './url-safety';

describe('validateDestinationUrl', () => {
  it('accepts a normal https URL', () => {
    const r = validateDestinationUrl('https://example.com/path?a=1');
    expect(r.ok).toBe(true);
    expect(r.url).toContain('https://example.com/path');
  });

  it('rejects empty input', () => {
    expect(validateDestinationUrl('  ').ok).toBe(false);
  });

  it('rejects javascript: and data: schemes', () => {
    expect(validateDestinationUrl('javascript:alert(1)').ok).toBe(false);
    expect(validateDestinationUrl('data:text/html,<script>').ok).toBe(false);
  });

  it('rejects non-http protocols', () => {
    expect(validateDestinationUrl('ftp://example.com').ok).toBe(false);
  });

  it('rejects a bare host with no scheme', () => {
    expect(validateDestinationUrl('example.com').ok).toBe(false);
  });

  it('rejects a self-loop to the short domain', () => {
    const r = validateDestinationUrl('https://linkme.you/xyz', { shortDomain: 'linkme.you' });
    expect(r.ok).toBe(false);
  });

  it('rejects DigiOne auth/login URLs', () => {
    const r = validateDestinationUrl('https://digione.ai/login?x=1', { appHost: 'digione.ai' });
    expect(r.ok).toBe(false);
  });
});
