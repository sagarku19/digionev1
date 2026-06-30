import { describe, it, expect } from 'vitest';
import { MIN_PAYOUT_INR, kycToBeneficiaryPayload, kycToPayoutMethodRow } from './payout-policy';

const kyc = {
  legal_name: 'Ada Lovelace',
  bank_account_name: 'Ada Lovelace',
  bank_account_plain: '1234567890',   // already-decrypted by the caller
  ifsc_code: 'hdfc0001234',
  bank_last4: '7890',
  upi_id_plain: '',
};

describe('payout-policy', () => {
  it('exposes a ₹100 minimum', () => {
    expect(MIN_PAYOUT_INR).toBe(100);
  });

  it('builds a bank beneficiary payload from decrypted KYC (IFSC uppercased)', () => {
    const p = kycToBeneficiaryPayload('benef_abc', kyc);
    expect(p.beneficiary_id).toBe('benef_abc');
    expect(p.beneficiary_name).toBe('Ada Lovelace');
    expect(p.bank_account_number).toBe('1234567890');
    expect(p.bank_ifsc).toBe('HDFC0001234');
    expect(p.vpa).toBeUndefined();
  });

  it('includes vpa only when a UPI id is present', () => {
    const p = kycToBeneficiaryPayload('b', { ...kyc, upi_id_plain: 'ada@upi' });
    expect(p.vpa).toBe('ada@upi');
  });

  it('builds a non-secret payout-method row of type bank_transfer (no full account number)', () => {
    const row = kycToPayoutMethodRow('creator-1', kyc);
    expect(row.creator_id).toBe('creator-1');
    expect(row.type).toBe('bank_transfer');
    expect(row.account_holder_name).toBe('Ada Lovelace');
    expect(row.ifsc_code).toBe('HDFC0001234');
    expect(row.account_last4).toBe('7890');
    expect(row.status).toBe('verified');
    expect(row.is_default).toBe(true);
    expect((row as unknown as Record<string, unknown>).account_number).toBeUndefined();
  });
});
