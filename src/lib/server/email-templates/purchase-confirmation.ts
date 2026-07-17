// Self-contained HTML purchase-confirmation email — no extra packages, no JSX.
// Pure builder (unit-tested); sending lives in src/lib/server/email.ts.
// Palette mirrors the engineered-ledger language: ink #16130F, vermilion
// #E83A2E, paper #FAF8F6. Table layout + inline styles for email clients.

// Friendly order code — same DO- convention as src/lib/shared/order-ref.ts and
// the dashboard/status page. Inlined to keep this builder dependency-free.
function orderRef(id: string): string {
  if (!id) return '';
  return `DO-${id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

export interface PurchaseEmailAccessLink {
  label: string;
  url: string;
}

export interface PurchaseEmailItem {
  name: string;
  price: number;
  /** All post-purchase access links (primary + labelled), each shown separately. */
  links: PurchaseEmailAccessLink[];
  /** Product ships downloadable files (fetched from the buyer's library). */
  hasFiles?: boolean;
}

export interface PurchaseEmailInput {
  to: string;
  customerName: string;
  orderId: string;
  totalAmount: number;
  discountAmount?: number;
  items: PurchaseEmailItem[];
  isGuest: boolean;
  appUrl: string;
}

function formatINR(n: number): string {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPurchaseConfirmation(input: PurchaseEmailInput): { subject: string; html: string } {
  const firstName = escapeHtml((input.customerName || 'there').split(' ')[0]);
  const libraryUrl = input.isGuest
    ? `${input.appUrl}/user-login?email=${encodeURIComponent(input.to)}`
    : `${input.appUrl}/account/library`;
  const ctaLabel = input.isGuest ? 'Create your free account' : 'Open your library';
  const receiptUrl = `${input.appUrl}/payment/receipt?order_id=${input.orderId}`;

  const subject = input.items.length === 1
    ? `Your purchase is confirmed — ${input.items[0].name}`
    : `Your purchase is confirmed — ${input.items.length} products`;

  const itemRows = input.items
    .map((item) => {
      const linkLines = item.links
        .map(
          (l) =>
            `<div style="margin-top:5px;"><a href="${escapeHtml(l.url)}" style="font-size:12px;color:#E83A2E;text-decoration:none;font-weight:600;">${escapeHtml(l.label || 'Access link')} →</a></div>`
        )
        .join('');
      const filesLine = item.hasFiles
        ? `<div style="margin-top:5px;font-size:12px;color:rgba(22,19,15,0.55);">Downloadable files included — <a href="${escapeHtml(libraryUrl)}" style="color:#E83A2E;text-decoration:none;font-weight:600;">get them in your library →</a></div>`
        : '';
      const emptyLine = item.links.length === 0 && !item.hasFiles
        ? `<div style="margin-top:5px;font-size:12px;color:rgba(22,19,15,0.45);">Access details are in your library.</div>`
        : '';
      return `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eeeae6;">
                <div style="font-size:14px;font-weight:600;color:#16130F;">${escapeHtml(item.name)}</div>
                ${linkLines}${filesLine}${emptyLine}
              </td>
              <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeae6;font-size:14px;font-weight:600;color:#16130F;white-space:nowrap;vertical-align:top;">${formatINR(item.price)}</td>
            </tr>`;
    })
    .join('');

  const guestNote = input.isGuest
    ? `<p style="font-size:13px;color:rgba(22,19,15,0.55);line-height:1.6;margin:16px 0 0;">Create a free account with <strong>${escapeHtml(input.to)}</strong> to keep lifetime access to everything you buy on DigiOne.</p>`
    : '';

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FAF8F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F6;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #eeeae6;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;">
            <div style="font-size:16px;font-weight:700;color:#16130F;">DigiOne<span style="color:#E83A2E;font-size:10px;vertical-align:super;">.ai</span></div>
          </td></tr>
          <tr><td style="padding:24px 32px 0;">
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#16130F;">Payment successful</h1>
            <p style="font-size:14px;color:rgba(22,19,15,0.55);line-height:1.6;margin:8px 0 0;">Hi ${firstName}, your purchase is confirmed. Here's what you bought:</p>
          </td></tr>
          <tr><td style="padding:20px 32px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              ${(input.discountAmount ?? 0) > 0 ? `<tr>
                <td style="padding:6px 0;font-size:13px;color:rgba(22,19,15,0.55);">Discount</td>
                <td align="right" style="padding:6px 0;font-size:13px;font-weight:600;color:#16130F;">-${formatINR(input.discountAmount ?? 0)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:14px 0;font-size:13px;font-weight:600;color:rgba(22,19,15,0.55);">Total paid</td>
                <td align="right" style="padding:14px 0;font-size:16px;font-weight:700;color:#16130F;">${formatINR(input.totalAmount)}</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:8px 32px 28px;">
            <a href="${escapeHtml(libraryUrl)}" style="display:block;text-align:center;background:#E83A2E;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 20px;border-radius:8px;">${ctaLabel}</a>
            ${guestNote}
            <p style="font-size:12px;color:rgba(22,19,15,0.4);margin:16px 0 0;">
              <a href="${escapeHtml(receiptUrl)}" style="color:rgba(22,19,15,0.55);">Download your receipt</a> · Order ${escapeHtml(orderRef(input.orderId))}
            </p>
          </td></tr>
        </table>
        <p style="font-size:11px;color:rgba(22,19,15,0.35);margin:16px 0 0;">Secured by DigiOne · Encrypted payments</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}
