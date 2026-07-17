// One-off: render the REAL purchase-confirmation template with sample data,
// write it to scripts/sample-purchase-email.html (always), and send it via
// Resend so you can see the actual email in an inbox.
//
//   npx tsx scripts/send-test-email.ts [to@email]
//
// Loads .env.local itself (RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_APP_URL).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (e) {
    console.warn('Could not read .env.local:', e instanceof Error ? e.message : e);
  }
}

async function main() {
  loadEnvLocal();
  const to = process.argv[2] || 'sagarkushwaha5599@gmail.com';

  const { buildPurchaseConfirmation } = await import('../src/lib/server/email-templates/purchase-confirmation');
  const input = {
    to,
    customerName: 'Sagar Kumar',
    orderId: 'e0706a18-e0c7-437b-b044-1b941fa3e924',
    totalAmount: 1398,
    discountAmount: 100,
    isGuest: false,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    items: [
      {
        name: 'Complete Figma Mastery',
        price: 999,
        links: [
          { label: 'Access', url: 'https://drive.google.com/file/d/1AbCexampleFileId/view' },
          { label: 'Bonus pack', url: 'https://www.notion.so/example-bonus-pack' },
        ],
        hasFiles: true,
      },
      {
        name: 'My Course',
        price: 499,
        links: [{ label: 'Course portal', url: 'https://courses.example.com/enroll' }],
        hasFiles: false,
      },
    ],
  };

  const { subject, html } = buildPurchaseConfirmation(input);

  const outPath = resolve(process.cwd(), 'scripts/sample-purchase-email.html');
  writeFileSync(outPath, html, 'utf8');
  console.log(`Subject: ${subject}`);
  console.log(`Rendered HTML written to: ${outPath}`);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('RESEND_API_KEY / EMAIL_FROM not set — skipped send (HTML file still written).');
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    console.error('Resend send failed:', error);
    process.exitCode = 1;
    return;
  }
  console.log(`Sent to ${to} — Resend id: ${data?.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
