import { describe, it, expect } from 'vitest';
import { buildVerifyPatch } from './kyc-verify';

const NOW = '2026-07-01T00:00:00.000Z';

describe('buildVerifyPatch', () => {
  it('verifies pan + bank (+ upi when present) with the provider stamped', () => {
    const p = buildVerifyPatch('manual', true, NOW);
    expect(p.status).toBe('verified');
    expect(p.verification_provider).toBe('manual');
    expect(p.pan_verified).toBe(true);
    expect(p.bank_verified).toBe(true);
    expect(p.upi_verified).toBe(true);
    expect(p.pan_verified_at).toBe(NOW);
    expect(p.pan_verification_provider).toBe('manual');
    expect(p.rejection_reason).toBeNull();
  });

  it('leaves upi unverified when the creator has no UPI', () => {
    const p = buildVerifyPatch('manual', false, NOW);
    expect(p.upi_verified).toBe(false);
    expect(p.upi_verified_at).toBeNull();
    expect(p.upi_verification_provider).toBeNull();
  });

  it('propagates a non-manual provider (provider-ready)', () => {
    const p = buildVerifyPatch('cashfree', true, NOW);
    expect(p.verification_provider).toBe('cashfree');
    expect(p.bank_verification_provider).toBe('cashfree');
  });
});
