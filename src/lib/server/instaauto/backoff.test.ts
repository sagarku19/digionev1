import { describe, it, expect } from 'vitest';
import { computeBackoffSeconds, classifyHttpError } from './backoff';

describe('computeBackoffSeconds', () => {
  it('grows exponentially and caps at 1h', () => {
    expect(computeBackoffSeconds(1)).toBeGreaterThanOrEqual(48);   // ~60 ±20%
    expect(computeBackoffSeconds(1)).toBeLessThanOrEqual(72);
    expect(computeBackoffSeconds(10)).toBeLessThanOrEqual(3600);   // capped
  });
});

describe('classifyHttpError', () => {
  it('429 and 5xx are retryable', () => {
    expect(classifyHttpError(429, undefined).retryable).toBe(true);
    expect(classifyHttpError(503, undefined).retryable).toBe(true);
  });
  it('OAuth code 190 is terminal + flags revoke', () => {
    const c = classifyHttpError(400, 190);
    expect(c.retryable).toBe(false);
    expect(c.isOAuthInvalid).toBe(true);
  });
  it('generic 4xx is terminal, not a revoke', () => {
    const c = classifyHttpError(400, 100);
    expect(c.retryable).toBe(false);
    expect(c.isOAuthInvalid).toBe(false);
  });
  it('Meta transient code 2 is retryable', () => {
    expect(classifyHttpError(400, 2).retryable).toBe(true);
  });
});
