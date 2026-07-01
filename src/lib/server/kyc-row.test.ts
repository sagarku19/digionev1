import { describe, it, expect } from 'vitest';
import { buildEncryptedKycRow } from './kyc-row';
import { isEncrypted, decryptField } from './kyc-crypto';

const base = {
  legal_name: 'A B',
  pan: 'ABCDE1234F',
  bank_account: '1234567890',
  bank_account_name: 'A B',
  ifsc_code: 'hdfc0001234',
};

describe('buildEncryptedKycRow', () => {
  it('forces status=pending and kyc_level=basic regardless of input', () => {
    const row = buildEncryptedKycRow({ ...base, status: 'verified', kyc_level: 'full' });
    expect(row.status).toBe('pending');
    expect(row.kyc_level).toBe('basic');
  });

  it('drops arbitrary admin fields; forces verification flags + beneficiary to false/null', () => {
    const row = buildEncryptedKycRow({
      ...base, pan_verified: true, bank_verified: true, admin_notes: 'x', beneficiary_id: 'y',
    }) as unknown as Record<string, unknown>;
    expect(row.admin_notes).toBeUndefined();   // arbitrary field never set (allowlist)
    expect(row.pan_verified).toBe(false);      // forced, not passed through from the client
    expect(row.bank_verified).toBe(false);
    expect(row.beneficiary_id).toBeNull();     // forced null
  });

  it('encrypts PAN and bank and exposes correct last4', () => {
    const row = buildEncryptedKycRow(base);
    expect(isEncrypted(row.pan_enc)).toBe(true);
    expect(decryptField(row.pan_enc)).toBe('ABCDE1234F');
    expect(row.pan_last4).toBe('234F');
    expect(isEncrypted(row.bank_account_enc)).toBe(true);
    expect(row.bank_last4).toBe('7890');
  });

  it('uppercases IFSC and maps empty UPI to null', () => {
    const row = buildEncryptedKycRow(base);
    expect(row.ifsc_code).toBe('HDFC0001234');
    expect(row.upi_id_enc).toBeNull();
  });

  it('resets verification flags + beneficiary on every submit (bank change ⇒ re-verify)', () => {
    const row = buildEncryptedKycRow({ ...base, pan_verified: true, bank_verified: true, beneficiary_id: 'stale' });
    expect(row.pan_verified).toBe(false);
    expect(row.bank_verified).toBe(false);
    expect(row.upi_verified).toBe(false);
    expect(row.pan_verified_at).toBeNull();
    expect(row.bank_verified_at).toBeNull();
    expect(row.upi_verified_at).toBeNull();
    expect(row.beneficiary_id).toBeNull();
  });

  it('defaults preferred_payout_method to bank; passes upi through', () => {
    expect(buildEncryptedKycRow(base).preferred_payout_method).toBe('bank');
    expect(buildEncryptedKycRow({ ...base, preferred_payout_method: 'upi' }).preferred_payout_method).toBe('upi');
    expect(buildEncryptedKycRow({ ...base, preferred_payout_method: 'weird' }).preferred_payout_method).toBe('bank');
  });
});
