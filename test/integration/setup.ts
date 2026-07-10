// Integration-suite setup. Runs before every integration test file.
//
// Loads .env.local by hand rather than via @next/env: Next deliberately SKIPS
// .env.local when NODE_ENV==='test' (which Vitest sets), so loadEnvConfig would
// leave SUPABASE_SERVICE_KEY undefined and every test would skip. This tiny parser
// sidesteps that. Only fills vars that aren't already set (real env wins).
//
// Also strips the Resend creds so fulfillment's purchase-confirmation email becomes
// a no-op — integration tests must never make outbound email calls.

import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

// No outbound email during tests.
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;

if (!process.env.SUPABASE_SERVICE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  // Each test file additionally guards with describe.skipIf, so this is just a
  // loud breadcrumb when someone runs the suite without .env.local.
  console.warn(
    '[integration/setup] SUPABASE_SERVICE_KEY / NEXT_PUBLIC_SUPABASE_URL not found — integration tests will be skipped.'
  );
}
