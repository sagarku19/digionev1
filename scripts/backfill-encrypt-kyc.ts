// scripts/backfill-encrypt-kyc.ts
// One-off: encrypt any plaintext creator_kyc PII in place + populate *_last4.
// Idempotent — skips values already in enc:v1 form. Reads PII only in-process; never logs raw values.
// Run: npx tsx scripts/backfill-encrypt-kyc.ts   (requires KYC_ENCRYPTION_KEY + SUPABASE_SERVICE_KEY in env)
import { createServiceClient } from '../lib/supabase/service';
import { encryptField, isEncrypted, last4 } from '../src/lib/server/kyc-crypto';
import type { Database } from '../types/database.types';

async function main() {
  const db = createServiceClient();
  const { data: rows, error } = await db
    .from('creator_kyc')
    .select('creator_id, pan_enc, bank_account_enc, upi_id_enc');
  if (error) throw error;

  let updated = 0;
  for (const row of rows ?? []) {
    const patch: Record<string, string> = {};
    // Guard: if a value comes back as bytea hex (\x…), the columns are still bytea — this script
    // MUST run AFTER migration 20260630000000 (bytea→text). Abort rather than re-encrypt the hex
    // (which would store a wrong last4 = silent corruption).
    const looksHex = (v: string | null) => !!v && /^\\x[0-9a-f]+$/i.test(v);
    if (looksHex(row.pan_enc) || looksHex(row.bank_account_enc) || looksHex(row.upi_id_enc)) {
      throw new Error('creator_kyc *_enc columns look like bytea hex — run migration 20260630000000 (bytea→text) before this backfill.');
    }
    if (row.pan_enc && !isEncrypted(row.pan_enc)) {
      patch.pan_enc = encryptField(row.pan_enc);
      patch.pan_last4 = last4(row.pan_enc);
    }
    if (row.bank_account_enc && !isEncrypted(row.bank_account_enc)) {
      patch.bank_account_enc = encryptField(row.bank_account_enc);
      patch.bank_last4 = last4(row.bank_account_enc);
    }
    if (row.upi_id_enc && !isEncrypted(row.upi_id_enc)) {
      patch.upi_id_enc = encryptField(row.upi_id_enc);
    }
    if (Object.keys(patch).length === 0) continue;
    const { error: upErr } = await db.from('creator_kyc').update(patch as Database['public']['Tables']['creator_kyc']['Update']).eq('creator_id', row.creator_id);
    if (upErr) throw upErr;
    updated++;
  }
  console.log(`[backfill-encrypt-kyc] encrypted ${updated} row(s).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error('[backfill-encrypt-kyc] FAILED:', e.message); process.exit(1); });
