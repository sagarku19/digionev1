// scripts/backfill-encrypt-kyc.ts
// One-off: encrypt any plaintext creator_kyc PII in place + populate *_last4.
// Idempotent — skips values already in enc:v1 form. Reads PII only in-process; never logs raw values.
// Run: npx tsx scripts/backfill-encrypt-kyc.ts   (requires KYC_ENCRYPTION_KEY + SUPABASE_SERVICE_KEY in env)
import { createServiceClient } from '../lib/supabase/service';
import { encryptField, isEncrypted, last4 } from '../src/lib/server/kyc-crypto';

async function main() {
  const db = createServiceClient();
  const { data: rows, error } = await db
    .from('creator_kyc')
    .select('creator_id, pan_enc, bank_account_enc, upi_id_enc');
  if (error) throw error;

  let updated = 0;
  for (const row of rows ?? []) {
    const patch: Record<string, string> = {};
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
    const { error: upErr } = await db.from('creator_kyc').update(patch).eq('creator_id', row.creator_id);
    if (upErr) throw upErr;
    updated++;
  }
  console.log(`[backfill-encrypt-kyc] encrypted ${updated} row(s).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error('[backfill-encrypt-kyc] FAILED:', e.message); process.exit(1); });
