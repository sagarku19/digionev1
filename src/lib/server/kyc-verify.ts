// Provider-ready KYC verify/reject. Server-only (writes via the service client). buildVerifyPatch is
// pure + testable; verifyKyc/rejectKyc apply it. provider='manual' now; a real PAN/bank verification
// API later calls verifyKyc with provider='cashfree'|'signzy' (+ optional per-field *_verification_ref).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type KycUpdate = Database['public']['Tables']['creator_kyc']['Update'];

export function buildVerifyPatch(provider: string, hasUpi: boolean, now: string): KycUpdate {
  return {
    status: 'verified',
    verification_provider: provider,
    pan_verified: true,  pan_verified_at: now,  pan_verification_provider: provider,
    bank_verified: true, bank_verified_at: now, bank_verification_provider: provider,
    upi_verified: hasUpi, upi_verified_at: hasUpi ? now : null, upi_verification_provider: hasUpi ? provider : null,
    rejection_reason: null,
  };
}

type Db = SupabaseClient<Database>;

export async function verifyKyc(db: Db, creatorId: string, opts?: { provider?: string }): Promise<boolean> {
  const provider = opts?.provider ?? 'manual';
  const { data: kyc } = await db.from('creator_kyc').select('upi_id_enc').eq('creator_id', creatorId).maybeSingle();
  if (!kyc) return false;
  const hasUpi = !!(kyc.upi_id_enc && String(kyc.upi_id_enc).length > 0);
  const patch = buildVerifyPatch(provider, hasUpi, new Date().toISOString());
  const { error } = await db.from('creator_kyc').update(patch).eq('creator_id', creatorId);
  if (error) throw error;
  return true;
}

export async function rejectKyc(db: Db, creatorId: string, reason: string): Promise<boolean> {
  const { data: existing } = await db.from('creator_kyc').select('creator_id').eq('creator_id', creatorId).maybeSingle();
  if (!existing) return false;
  const { error } = await db.from('creator_kyc').update({ status: 'rejected', rejection_reason: reason }).eq('creator_id', creatorId);
  if (error) throw error;
  return true;
}
