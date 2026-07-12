import { describe, it, expect } from 'vitest';
import { escapeHtml, renderOgHtml, renderUnlockHtml } from './html';

describe('html', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
  it('renders OG meta with escaped, injected values', () => {
    const out = renderOgHtml({ title: 'Hi <b>', description: 'd', image: 'https://i/x.png', url: 'https://dest.com' });
    expect(out).toContain('property="og:title" content="Hi &lt;b&gt;"');
    expect(out).toContain('property="og:image" content="https://i/x.png"');
    expect(out).toContain('http-equiv="refresh" content="0;url=https://dest.com"');
    expect(out).toContain('summary_large_image');
  });
  it('renders an unlock form posting to the action', () => {
    const out = renderUnlockHtml({ action: '/api/s/abc' });
    expect(out).toContain('method="POST" action="/api/s/abc"');
    expect(out).toContain('name="password"');
    expect(out).not.toContain('Incorrect password');
  });
  it('shows an error message when error=true', () => {
    expect(renderUnlockHtml({ action: '/api/s/abc', error: true })).toContain('Incorrect password');
  });
});
