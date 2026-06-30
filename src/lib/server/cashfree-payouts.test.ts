import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyPayoutWebhookSignatureLegacy, verifyPayoutWebhookSignatureV2 } from './cashfree-payouts';

// Legacy scheme: sort POST params (except signature) by key, concat values, HMAC-SHA256 base64.
function signLegacy(params: Record<string, string>, secret: string): string {
  const data = Object.keys(params).filter(k => k !== 'signature').sort().map(k => params[k]).join('');
  return crypto.createHmac('sha256', secret).update(data).digest('base64');
}

describe('verifyPayoutWebhookSignatureLegacy', () => {
  const secret = 'test_secret';
  const params = { event: 'TRANSFER_SUCCESS', transferId: 'po_1', referenceId: 'cf_9', eventTime: '2026-07-01' };

  it('accepts a correct signature', () => {
    const signature = signLegacy(params, secret);
    expect(verifyPayoutWebhookSignatureLegacy({ ...params, signature }, secret)).toBe(true);
  });

  it('rejects a tampered param', () => {
    const signature = signLegacy(params, secret);
    expect(verifyPayoutWebhookSignatureLegacy({ ...params, transferId: 'po_HACK', signature }, secret)).toBe(false);
  });

  it('rejects a missing signature', () => {
    expect(verifyPayoutWebhookSignatureLegacy({ ...params }, secret)).toBe(false);
  });
});

describe('verifyPayoutWebhookSignatureV2', () => {
  const secret = 'test_secret';
  const raw = '{"event":"TRANSFER_SUCCESS"}';
  const ts = '1730000000';
  const good = crypto.createHmac('sha256', secret).update(ts + raw).digest('base64');

  it('accepts a correct (timestamp+rawBody) signature', () => {
    expect(verifyPayoutWebhookSignatureV2(raw, ts, good, secret)).toBe(true);
  });
  it('rejects a tampered body', () => {
    expect(verifyPayoutWebhookSignatureV2('{"event":"HACK"}', ts, good, secret)).toBe(false);
  });
  it('rejects an empty signature', () => {
    expect(verifyPayoutWebhookSignatureV2(raw, ts, '', secret)).toBe(false);
  });
});
