// Minimal HTML the redirect route serves for OG previews (crawlers) and the
// password interstitial (humans). All interpolated values are creator-supplied
// → always escape.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderOgHtml(og: {
  title?: string | null; description?: string | null; image?: string | null; url: string;
}): string {
  const title = escapeHtml(og.title || 'Link');
  const desc = og.description ? escapeHtml(og.description) : '';
  const image = og.image ? escapeHtml(og.image) : '';
  const url = escapeHtml(og.url);
  const safeHref = /^https?:\/\//i.test(og.url) ? url : '';
  return `<!doctype html><html><head><meta charset="utf-8">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
${desc ? `<meta property="og:description" content="${desc}">\n` : ''}${image ? `<meta property="og:image" content="${image}">\n` : ''}<meta property="og:url" content="${url}">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${title}">
${desc ? `<meta name="twitter:description" content="${desc}">\n` : ''}${image ? `<meta name="twitter:image" content="${image}">\n` : ''}<title>${title}</title>
<meta http-equiv="refresh" content="0;url=${url}"></head>
<body>${safeHref ? `<a href="${safeHref}">Continue</a>` : ''}</body></html>`;
}

export function renderUnlockHtml(opts: { action: string; error?: boolean }): string {
  const action = escapeHtml(opts.action);
  const err = opts.error
    ? `<p style="color:#E83A2E;font-size:13px;margin:0 0 12px">Incorrect password. Try again.</p>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Protected link</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#FAF8F6;color:#16130F;display:flex;min-height:100vh;align-items:center;justify-content:center">
<form method="POST" action="${action}" style="background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:16px;padding:28px;max-width:340px;width:calc(100% - 32px);box-shadow:0 16px 50px -30px rgba(22,19,15,.25)">
<h1 style="font-size:18px;margin:0 0 6px">Password required</h1>
<p style="font-size:13px;color:rgba(0,0,0,.55);margin:0 0 16px">This link is protected. Enter the password to continue.</p>
${err}<input type="password" name="password" autofocus required placeholder="Password" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid rgba(0,0,0,.12);border-radius:10px;font-size:14px;margin-bottom:12px">
<button type="submit" style="width:100%;padding:12px;background:#E83A2E;color:#fff;border:0;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">Unlock</button>
</form></body></html>`;
}
