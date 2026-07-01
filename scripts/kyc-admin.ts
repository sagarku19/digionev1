// scripts/kyc-admin.ts
// Terminal admin for KYC (interim until the separate admin app exists). Service-role — the runner
// holds SUPABASE_SERVICE_KEY (= the trusted admin). Run:
//   npx tsx --env-file=.env.local scripts/kyc-admin.ts view   <creatorId> [--admin <profileId>]
//   npx tsx --env-file=.env.local scripts/kyc-admin.ts verify <creatorId> [--provider manual] [--admin <profileId>]
//   npx tsx --env-file=.env.local scripts/kyc-admin.ts reject <creatorId> "<reason>"
import { createServiceClient } from '../lib/supabase/service';
import { resolveBucket, storage } from '../src/lib/storage';
import { verifyKyc, rejectKyc } from '../src/lib/server/kyc-verify';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const [cmd, creatorId] = process.argv.slice(2);
  if (!cmd || !creatorId) throw new Error('usage: kyc-admin <view|verify|reject> <creatorId> [...]');
  const db = createServiceClient();

  if (cmd === 'view') {
    const { data: kyc } = await db.from('creator_kyc')
      .select('status, legal_name, pan_last4, bank_last4, ifsc_code, upi_verified, city, state, verification_provider, rejection_reason')
      .eq('creator_id', creatorId).maybeSingle();
    console.log('KYC:', kyc ?? '(none)');

    const cfg = resolveBucket('creator-private');
    const { data: files } = await db.from('storage_files')
      .select('id, object_key, file_name, mime_type').eq('owner_id', creatorId).eq('bucket', cfg.name)
      .eq('kind', 'kyc').is('deleted_at', null).order('created_at', { ascending: false });
    const { data: docs } = await db.from('kyc_documents').select('file_id, doc_type').eq('creator_id', creatorId);
    const typeByFile = new Map((docs ?? []).map(d => [d.file_id, d.doc_type]));
    const adminId = arg('--admin') ?? 'terminal';
    for (const f of files ?? []) {
      const signedUrl = await storage.createDownloadUrl({ bucket: cfg.name, objectKey: f.object_key, ttlSeconds: 600 });
      await db.from('kyc_access_log').insert({ admin_id: adminId, creator_id: creatorId, file_id: f.id, object_key: f.object_key });
      console.log(`\n[${typeByFile.get(f.id) ?? 'kyc'}] ${f.file_name} (${f.mime_type})\n  ${signedUrl}`);
    }
    if (!files?.length) console.log('(no documents uploaded)');
  } else if (cmd === 'verify') {
    const ok = await verifyKyc(db, creatorId, { provider: arg('--provider') ?? 'manual' });
    console.log(ok ? `verified ${creatorId}` : `no KYC row for ${creatorId}`);
  } else if (cmd === 'reject') {
    const reason = process.argv[4] ?? 'Rejected by admin';
    const ok = await rejectKyc(db, creatorId, reason);
    console.log(ok ? `rejected ${creatorId}: ${reason}` : `no KYC row for ${creatorId}`);
  } else {
    throw new Error(`unknown command: ${cmd}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('kyc-admin FAILED:', e.message); process.exit(1); });
