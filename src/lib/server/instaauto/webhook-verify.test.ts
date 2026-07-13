import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyMetaSignature } from './webhook-verify';

const secret = 'app-secret';
const body = JSON.stringify({ hello: 'world' });
const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

describe('verifyMetaSignature', () => {
  it('accepts a correct signature', () => {
    expect(verifyMetaSignature(body, sig, secret)).toBe(true);
  });
  it('rejects a wrong signature', () => {
    expect(verifyMetaSignature(body, 'sha256=deadbeef', secret)).toBe(false);
  });
  it('rejects a missing header', () => {
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
  });
  it('rejects when the body is altered', () => {
    expect(verifyMetaSignature(body + ' ', sig, secret)).toBe(false);
  });
});
