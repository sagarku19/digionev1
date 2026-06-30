// Payout policy + pure mappers (server-only). No Cashfree calls, no DB, no crypto.
// The caller decrypts KYC bank/UPI (Phase 0 kyc-crypto) before passing them here.
export const MIN_PAYOUT_INR = 100;

export interface DecryptedKyc {
  legal_name: string | null;
  bank_account_name: string | null;
  bank_account_plain: string;   // decrypted by the caller
  ifsc_code: string | null;
  bank_last4: string | null;
  upi_id_plain?: string;        // decrypted UPI, optional
}

export interface BeneficiaryPayload {
  beneficiary_id: string;
  beneficiary_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  vpa?: string;
}

export function kycToBeneficiaryPayload(beneficiaryId: string, kyc: DecryptedKyc): BeneficiaryPayload {
  const payload: BeneficiaryPayload = {
    beneficiary_id: beneficiaryId,
    beneficiary_name: (kyc.bank_account_name || kyc.legal_name || '').trim(),
    bank_account_number: kyc.bank_account_plain.trim(),
    bank_ifsc: (kyc.ifsc_code || '').trim().toUpperCase(),
  };
  const vpa = (kyc.upi_id_plain || '').trim();
  if (vpa) payload.vpa = vpa;
  return payload;
}

export interface PayoutMethodRow {
  creator_id: string;
  type: 'bank_transfer';
  account_holder_name: string;
  ifsc_code: string;
  account_last4: string;
  status: 'verified';
  is_default: true;
}

export function kycToPayoutMethodRow(creatorId: string, kyc: DecryptedKyc): PayoutMethodRow {
  return {
    creator_id: creatorId,
    type: 'bank_transfer',
    account_holder_name: (kyc.bank_account_name || kyc.legal_name || '').trim(),
    ifsc_code: (kyc.ifsc_code || '').trim().toUpperCase(),
    account_last4: (kyc.bank_last4 || '').trim(),
    status: 'verified',
    is_default: true,
  };
}
