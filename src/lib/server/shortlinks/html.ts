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

export function renderNotFoundHtml(opts: {
  appUrl: string;
  shortDomain: string;
  /** true = link existed but is expired / disabled / click-capped */
  unavailable?: boolean;
}): string {
  const domain = escapeHtml(opts.shortDomain);
  const brand = escapeHtml(opts.shortDomain.split('.')[0]);
  const tld = escapeHtml(opts.shortDomain.split('.').slice(1).join('.'));
  const app = escapeHtml(opts.appUrl);
  const createHref = escapeHtml(`${opts.appUrl.replace(/\/$/, '')}/dashboard/links`);
  const title = opts.unavailable ? 'Link unavailable' : 'Link not found';
  const heading = opts.unavailable
    ? 'This link is no longer active.'
    : "This short link isn't valid.";
  const body = opts.unavailable
    ? 'The link you followed has expired, was turned off, or reached its click limit.'
    : "The link you followed doesn't exist. Check the URL for typos. Short codes are case-sensitive.";
  const linkMark = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 7.5H7a4.5 4.5 0 0 0 0 9h2.5" stroke="#16130F" stroke-width="2.1"/><path d="M14.5 7.5H17a4.5 4.5 0 0 1 0 9h-2.5" stroke="#16130F" stroke-width="2.1"/><path d="M8.5 12h7" stroke="#E83A2E" stroke-width="2.1"/></svg>`;
  const btnOutline = 'flex:1;text-align:center;padding:12px;border:1px solid rgba(0,0,0,.12);color:#16130F;border-radius:10px;font-size:13.5px;font-weight:600;text-decoration:none';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><link rel="icon" href="/linkln.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cookie&display=swap" rel="stylesheet"><title>${escapeHtml(title)} · ${domain}</title></head>
<body style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#16130F;position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box">
<div aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(22,19,15,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(22,19,15,.035) 1px,transparent 1px);background-size:48px 48px;-webkit-mask-image:radial-gradient(ellipse 80% 60% at 50% 40%,#000,transparent 100%);mask-image:radial-gradient(ellipse 80% 60% at 50% 40%,#000,transparent 100%)"></div>
<main style="position:relative;max-width:430px;width:100%;text-align:center">
<span style="display:inline-flex;align-items:center;gap:8px;margin-bottom:28px">${linkMark}<span style="font-family:'Cookie',cursive;font-size:30px;line-height:1;color:#16130F">${brand}<span style="color:#E83A2E">.${tld}</span></span></span>
<span style="display:flex;width:52px;height:52px;border-radius:14px;background:rgba(232,58,46,.08);border:1px solid rgba(232,58,46,.16);align-items:center;justify-content:center;margin:0 auto 20px">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E83A2E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7"/><path d="M15 7h2a5 5 0 0 1 4 8"/><line x1="8" y1="12" x2="12" y2="12"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
</span>
<h1 style="font-size:22px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px">${escapeHtml(heading)}</h1>
<p style="font-size:14px;line-height:1.6;color:rgba(0,0,0,.5);margin:0 auto 24px;max-width:340px">${escapeHtml(body)}</p>
<a href="${createHref}" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;padding:13px;background:#E83A2E;color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:10px">Create your own short link</a>
<div style="display:flex;gap:10px">
<a href="/" style="${btnOutline}">About ${brand}</a>
<a href="${app}" style="${btnOutline}">Visit DigiOne</a>
</div>
<a href="${app}" style="display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(0,0,0,.08);background:#FAF8F6;border-radius:999px;padding:6px 14px;text-decoration:none;margin-top:26px">
<span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:rgba(0,0,0,.4)">Powered by</span>
<span style="width:1px;height:12px;background:rgba(0,0,0,.12)"></span>
<span style="font-size:13.5px;font-weight:700;color:#16130F;letter-spacing:-.01em">DigiOne<span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:8px;color:#E83A2E;font-weight:600;vertical-align:super;margin-left:2px">.ai</span></span>
</a>
</main></body></html>`;
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
