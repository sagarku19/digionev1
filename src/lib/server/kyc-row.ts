// Pure builder: raw client KYC input -> the exact creator_kyc column set to upsert.
// Server-only (uses encryptField). Forces status='pending', drops all verification/admin
// fields by allowlisting, encrypts PAN/bank/UPI, exposes *_last4 for masked display.
import { encryptField, last4 } from './kyc-crypto';

const STR = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const NULLABLE = (v: unknown): string | null => {
  const s = STR(v);
  return s === '' ? null : s;
};

export interface EncryptedKycRow {
  legal_name: string;
  pan_enc: string;
  pan_last4: string;
  bank_account_enc: string;
  bank_last4: string;
  bank_account_name: string;
  ifsc_code: string;
  upi_id_enc: string | null;
  aadhaar_last4: string | null;
  dob: string | null;
  gender: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  status: 'pending';
  kyc_level: 'basic';
  preferred_payout_method: 'bank' | 'upi';
  // Every submit resets verification state + the Cashfree beneficiary: a bank/PAN change must force
  // re-verification, and stale *_verified flags must never gate a payout to a changed account.
  pan_verified: false;
  bank_verified: false;
  upi_verified: false;
  pan_verified_at: null;
  bank_verified_at: null;
  upi_verified_at: null;
  beneficiary_id: null;
}

export function buildEncryptedKycRow(input: Record<string, unknown>): EncryptedKycRow {
  const pan = STR(input.pan);
  const bank = STR(input.bank_account);
  const upi = STR(input.upi_id);
  return {
    legal_name: STR(input.legal_name),
    pan_enc: encryptField(pan),
    pan_last4: last4(pan),
    bank_account_enc: encryptField(bank),
    bank_last4: last4(bank),
    bank_account_name: STR(input.bank_account_name),
    ifsc_code: STR(input.ifsc_code).toUpperCase(),
    upi_id_enc: upi ? encryptField(upi) : null,
    aadhaar_last4: NULLABLE(input.aadhaar_last4),
    dob: NULLABLE(input.dob),
    gender: NULLABLE(input.gender),
    address_line1: NULLABLE(input.address_line1),
    address_line2: NULLABLE(input.address_line2),
    city: NULLABLE(input.city),
    state: NULLABLE(input.state),
    postal_code: NULLABLE(input.postal_code),
    country: STR(input.country) || 'India',
    status: 'pending',
    kyc_level: 'basic',
    preferred_payout_method: STR(input.preferred_payout_method) === 'upi' ? 'upi' : 'bank',
    pan_verified: false,
    bank_verified: false,
    upi_verified: false,
    pan_verified_at: null,
    bank_verified_at: null,
    upi_verified_at: null,
    beneficiary_id: null,
  };
}
