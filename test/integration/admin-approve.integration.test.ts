import { describe, it, expect, afterAll, vi } from 'vitest';
import { POST as approve } from '@/app/api/admin/payouts/[id]/approve/route';
import { initiateTransfer } from '@/lib/server/cashfree-payouts';
import { encryptField } from '@/lib/server/kyc-crypto';
import { World, hasCreds } from './world';

// Super-admin approve route: re-reads the DB role, resolves/creates the Cashfree
// beneficiary, initiates the transfer of net_amount, and claims pending→processing.
// Stub the cookie auth + the Cashfree Payouts API (createBeneficiary/initiateTransfer);
// everything else — role gate, KYC decrypt, claim, settle-on-fail — runs for real.
const authState = vi.hoisted(() => ({ user: null as null | { id: string } }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: authState.user }, error: null }) } }),
}));

const cf = vi.hoisted(() => ({ transferAccepted: true }));
vi.mock('@/lib/server/cashfree-payouts', () => ({
  createBeneficiary: vi.fn(async () => ({ ok: true, alreadyExists: false, raw: {} })),
  initiateTransfer: vi.fn(async () => ({ accepted: cf.transferAccepted, raw: {} })),
}));

function callApprove(payoutId: string) {
  return approve(new Request('http://localhost/api/admin/payouts/x/approve', { method: 'POST' }), {
    params: Promise.resolve({ id: payoutId }),
  });
}

describe.skipIf(!hasCreds())('admin/payouts/approve — super-admin transfer initiation', () => {
  const world = new World();
  afterAll(async () => {
    vi.restoreAllMocks();
    await world.cleanup();
  });

  async function superAdmin() {
    const u = await world.createUser('creator');
    await world.db.from('users').update({ role: 'super_admin' }).eq('id', u.authId);
    return u;
  }
  async function verifiedKycWithBank(creatorId: string) {
    await world.db.from('creator_kyc').upsert(
      {
        creator_id: creatorId,
        status: 'verified',
        legal_name: 'Test Creator',
        bank_account_name: 'Test Creator',
        bank_account_enc: encryptField('1234567890'),
        ifsc_code: 'HDFC0000001',
        bank_last4: '7890',
        preferred_payout_method: 'bank',
        pan_last4: '4242',
      },
      { onConflict: 'creator_id' }
    );
  }
  async function pendingPayout(creatorId: string, amount: number, netAmount: number) {
    const { data } = await world.db
      .from('creator_payouts')
      .insert({ creator_id: creatorId, amount, net_amount: netAmount, status: 'pending', currency: 'INR' })
      .select('id')
      .single();
    return data!.id;
  }

  it('rejects a non-super-admin (403)', async () => {
    const creator = await world.createUser('creator'); // role 'creator'
    authState.user = { id: creator.authId };
    const payoutId = await pendingPayout(creator.profileId, 300, 300);
    const res = await callApprove(payoutId);
    expect(res.status).toBe(403);
  });

  it('approves a pending payout: creates beneficiary, transfers net_amount, claims processing', async () => {
    cf.transferAccepted = true;
    const admin = await superAdmin();
    const creator = await world.createUser('creator');
    await verifiedKycWithBank(creator.profileId);
    const payoutId = await pendingPayout(creator.profileId, 300, 270);
    authState.user = { id: admin.authId };

    const res = await callApprove(payoutId);
    expect(res.status).toBe(200);

    const { data: row } = await world.db
      .from('creator_payouts')
      .select('status, payout_method_id')
      .eq('id', payoutId)
      .single();
    expect(row?.status).toBe('processing');
    expect(row?.payout_method_id).toBeTruthy();

    const { data: kyc } = await world.db.from('creator_kyc').select('beneficiary_id').eq('creator_id', creator.profileId).single();
    expect(kyc?.beneficiary_id).toBeTruthy();

    // Transfer initiated for the NET amount, keyed on the payout id.
    expect(vi.mocked(initiateTransfer)).toHaveBeenCalledWith(
      expect.objectContaining({ transfer_id: payoutId, transfer_amount: 270 })
    );
  });

  it('rejects a payout that is not pending (409)', async () => {
    const admin = await superAdmin();
    const creator = await world.createUser('creator');
    await verifiedKycWithBank(creator.profileId);
    const { data } = await world.db
      .from('creator_payouts')
      .insert({ creator_id: creator.profileId, amount: 100, net_amount: 100, status: 'processing', currency: 'INR' })
      .select('id')
      .single();
    authState.user = { id: admin.authId };
    const res = await callApprove(data!.id);
    expect(res.status).toBe(409);
  });

  it('rejects when the creator KYC is not verified (409)', async () => {
    const admin = await superAdmin();
    const creator = await world.createUser('creator'); // no KYC row
    const payoutId = await pendingPayout(creator.profileId, 200, 200);
    authState.user = { id: admin.authId };
    const res = await callApprove(payoutId);
    expect(res.status).toBe(409);
  });

  it('releases the payout (settle failed) when transfer initiation is rejected (502)', async () => {
    cf.transferAccepted = false;
    const admin = await superAdmin();
    const creator = await world.createUser('creator');
    await verifiedKycWithBank(creator.profileId);
    const payoutId = await pendingPayout(creator.profileId, 400, 400);
    authState.user = { id: admin.authId };

    const res = await callApprove(payoutId);
    expect(res.status).toBe(502);

    const { data: row } = await world.db.from('creator_payouts').select('status').eq('id', payoutId).single();
    expect(row?.status).toBe('failed');
    cf.transferAccepted = true;
  });
});
