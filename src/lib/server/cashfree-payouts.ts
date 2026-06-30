// Cashfree Payouts V2 client — SERVER ONLY. Never import client-side.
// Exact request/response shapes are confirmed in a sandbox spike (cashfree-payouts.contract.md);
// the HTTP bodies below follow the documented V2 shape and may be refined to match the live API.
import crypto from 'crypto';

const BASE = process.env.CASHFREE_PAYOUT_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api.cashfree.com/payout'
  : 'https://sandbox.cashfree.com/payout';

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-client-id': process.env.CASHFREE_PAYOUT_CLIENT_ID!,
    'x-client-secret': process.env.CASHFREE_PAYOUT_CLIENT_SECRET!,
    'x-api-version': process.env.CASHFREE_PAYOUT_API_VERSION ?? '2024-01-01',
  };
}

// Constant-time compare of two base64 strings.
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// Legacy form-POST webhook: sort params (except 'signature') by key, concat values, HMAC-SHA256 base64.
export function verifyPayoutWebhookSignatureLegacy(params: Record<string, string>, secret: string): boolean {
  const received = params.signature;
  if (!received) return false;
  const data = Object.keys(params).filter(k => k !== 'signature').sort().map(k => params[k]).join('');
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64');
  return safeEqual(expected, received);
}

// V2 JSON webhook: HMAC-SHA256 of (timestamp + rawBody), base64.
export function verifyPayoutWebhookSignatureV2(rawBody: string, timestamp: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest('base64');
  return safeEqual(expected, signature);
}

export interface BeneficiaryInput {
  beneficiary_id: string;
  beneficiary_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  vpa?: string;
}

export async function createBeneficiary(b: BeneficiaryInput): Promise<{ ok: boolean; alreadyExists: boolean; raw: unknown }> {
  const res = await fetch(`${BASE}/v2/beneficiary`, { method: 'POST', headers: headers(), body: JSON.stringify(b), cache: 'no-store' });
  const raw = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, alreadyExists: false, raw };
  const msg = JSON.stringify(raw).toLowerCase();
  if (res.status === 409 || msg.includes('already exists') || msg.includes('beneficiary_id_already_exists')) {
    return { ok: true, alreadyExists: true, raw };
  }
  return { ok: false, alreadyExists: false, raw };
}

export async function initiateTransfer(input: { transfer_id: string; transfer_amount: number; beneficiary_id: string; mode: 'banktransfer' | 'upi' }): Promise<{ accepted: boolean; raw: unknown }> {
  const body = {
    transfer_id: input.transfer_id,
    transfer_amount: input.transfer_amount,
    transfer_mode: input.mode,
    beneficiary_details: { beneficiary_id: input.beneficiary_id },
  };
  const res = await fetch(`${BASE}/v2/transfers`, { method: 'POST', headers: headers(), body: JSON.stringify(body), cache: 'no-store' });
  const raw = await res.json().catch(() => ({}));
  const msg = JSON.stringify(raw).toLowerCase();
  const accepted = res.ok || msg.includes('transfer_id_already_present') || msg.includes('already exists');
  return { accepted, raw };
}

export async function getTransfer(transferId: string): Promise<{ status: string | null; raw: unknown }> {
  const res = await fetch(`${BASE}/v2/transfers/${encodeURIComponent(transferId)}`, { headers: headers(), cache: 'no-store' });
  const raw = await res.json().catch(() => ({}));
  const status = (raw as { status?: string; transfer_status?: string })?.status
    ?? (raw as { transfer_status?: string })?.transfer_status ?? null;
  return { status, raw };
}
