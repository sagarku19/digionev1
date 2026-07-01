// POST /api/kyc/payout-method — focused update of just the payout destination (bank + UPI) for a
// creator whose identity is already on file. Unlike /api/kyc/submit (full re-KYC), this keeps the
// verified identity (PAN/legal name/address) and re-verifies ONLY the new bank: it re-encrypts the
// bank/UPI, resets bank/UPI verification + clears the Cashfree beneficiary (so a fresh one is created
// for the new account), and drops status to 'pending' for admin re-verification of the new bank.
// Service-role write (creator_kyc client writes are RLS-locked).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { encryptField, last4 } from '@/lib/server/kyc-crypto';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const bank = String(body.bank_account ?? '').replace(/\s/g, '');
    const name = String(body.bank_account_name ?? '').trim();
    const ifsc = String(body.ifsc_code ?? '').trim().toUpperCase();
    const upi = String(body.upi_id ?? '').trim();
    const preferred = body.preferred_payout_method === 'upi' ? 'upi' : 'bank';
    if (!name || !/^[0-9]{9,18}$/.test(bank) || !IFSC_RE.test(ifsc)) {
      return NextResponse.json({ error: 'Account holder, a valid account number (9–18 digits) and IFSC are required.' }, { status: 400 });
    }
    if (preferred === 'upi' && !upi) {
      return NextResponse.json({ error: 'Add a UPI ID to use UPI as your primary payout method.' }, { status: 400 });
    }

    const db = createServiceClient();
    const { data: kyc } = await db.from('creator_kyc').select('creator_id').eq('creator_id', profileId).maybeSingle();
    if (!kyc) return NextResponse.json({ error: 'Submit your KYC before updating a payout method.' }, { status: 404 });

    const { error } = await db.from('creator_kyc').update({
      bank_account_enc: encryptField(bank),
      bank_last4: last4(bank),
      bank_account_name: name,
      ifsc_code: ifsc,
      upi_id_enc: upi ? encryptField(upi) : null,
      preferred_payout_method: preferred,
      // A changed destination must be re-verified — reset ONLY the payout side; identity stays as-is.
      bank_verified: false,
      bank_verified_at: null,
      upi_verified: false,
      upi_verified_at: null,
      beneficiary_id: null, // force a fresh Cashfree beneficiary for the new account
      status: 'pending',
    }).eq('creator_id', profileId);
    if (error) {
      console.error('[kyc/payout-method] update failed', error.message);
      return NextResponse.json({ error: 'Failed to update payout method.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[kyc/payout-method] error', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
