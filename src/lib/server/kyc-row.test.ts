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

  it('drops verification/admin fields entirely', () => {
    const row = buildEncryptedKycRow({
      ...base, pan_verified: true, bank_verified: true, admin_notes: 'x', beneficiary_id: 'y',
    }) as unknown as Record<string, unknown>;
    expect(row.pan_verified).toBeUndefined();
    expect(row.bank_verified).toBeUndefined();
    expect(row.admin_notes).toBeUndefined();
    expect(row.beneficiary_id).toBeUndefined();
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
});
