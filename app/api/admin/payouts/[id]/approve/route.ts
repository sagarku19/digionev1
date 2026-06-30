import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { decryptField } from '@/lib/server/kyc-crypto';
import { kycToBeneficiaryPayload, kycToPayoutMethodRow } from '@/lib/server/payout-policy';
import { createBeneficiary, initiateTransfer } from '@/lib/server/cashfree-payouts';
import type { Json } from '@/types/database.types';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: payoutId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createServiceClient();
    // Re-read role from the DB (service client has no JWT — is_super_admin() would be false).
    const { data: actor } = await db.from('users').select('role').eq('auth_provider_id', user.id).maybeSingle();
    if (actor?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: payout } = await db.from('creator_payouts')
      .select('id, creator_id, amount, status, payout_method_id').eq('id', payoutId).maybeSingle();
    if (!payout) return NextResponse.json({ error: 'Payout not found.' }, { status: 404 });
    if (payout.status !== 'pending') return NextResponse.json({ error: `Payout is ${payout.status}, not pending.` }, { status: 409 });

    const { data: kyc } = await db.from('creator_kyc')
      .select('legal_name, bank_account_name, bank_account_enc, ifsc_code, bank_last4, upi_id_enc, beneficiary_id, status')
      .eq('creator_id', payout.creator_id).maybeSingle();
    if (!kyc || kyc.status !== 'verified') return NextResponse.json({ error: 'Creator KYC not verified.' }, { status: 409 });

    let bankPlain = '';
    try { bankPlain = decryptField(kyc.bank_account_enc ?? ''); } catch { /* handled below */ }
    if (!bankPlain) return NextResponse.json({ error: 'Could not read bank details (decrypt failed).' }, { status: 500 });
    const upiPlain = (() => { try { return decryptField(kyc.upi_id_enc ?? ''); } catch { return ''; } })();
    const dkyc = {
      legal_name: kyc.legal_name, bank_account_name: kyc.bank_account_name,
      bank_account_plain: bankPlain, ifsc_code: kyc.ifsc_code, bank_last4: kyc.bank_last4, upi_id_plain: upiPlain,
    };

    // Ensure Cashfree beneficiary.
    let beneficiaryId = kyc.beneficiary_id;
    if (!beneficiaryId) {
      beneficiaryId = `benef_${payout.creator_id}`;
      const ben = await createBeneficiary(kycToBeneficiaryPayload(beneficiaryId, dkyc));
      if (!ben.ok) return NextResponse.json({ error: 'Beneficiary creation failed.' }, { status: 502 });
      await db.from('creator_kyc').update({ beneficiary_id: beneficiaryId, beneficiary_metadata: ben.raw as Json }).eq('creator_id', payout.creator_id);
    }

    // Ensure a default payout-method row (display only). Select-then-insert (no unique index on creator_id,is_default).
    let methodId = payout.payout_method_id;
    if (!methodId) {
      const { data: existing } = await db.from('creator_payout_methods').select('id').eq('creator_id', payout.creator_id).eq('is_default', true).maybeSingle();
      if (existing) methodId = existing.id;
      else {
        const { data: created } = await db.from('creator_payout_methods').insert(kycToPayoutMethodRow(payout.creator_id, dkyc)).select('id').maybeSingle();
        methodId = created?.id ?? null;
      }
    }

    // Atomic claim pending -> processing (idempotent against double-approve).
    const { data: claimed } = await db.from('creator_payouts')
      .update({ status: 'processing', payout_method_id: methodId, initiated_at: new Date().toISOString() })
      .eq('id', payoutId).eq('status', 'pending').select('id').maybeSingle();
    if (!claimed) return NextResponse.json({ error: 'Payout already claimed.' }, { status: 409 });

    // transfer_id = payout.id (Cashfree dedupes duplicates).
    const tr = await initiateTransfer({ transfer_id: payoutId, transfer_amount: Number(payout.amount), beneficiary_id: beneficiaryId, mode: 'banktransfer' });
    if (!tr.accepted) {
      await db.rpc('settle_payout', { p_payout_id: payoutId, p_terminal: 'failed', p_gateway_metadata: tr.raw as Json, p_failure_reason: 'transfer_init_failed' });
      return NextResponse.json({ error: 'Transfer initiation failed; hold released.' }, { status: 502 });
    }
    await db.from('creator_payouts').update({ gateway_metadata: tr.raw as Json }).eq('id', payoutId);
    return NextResponse.json({ ok: true, status: 'processing' });
  } catch (e) {
    console.error('[admin/payouts/approve]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
