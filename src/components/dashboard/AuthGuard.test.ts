import { describe, it, expect } from 'vitest';
import { shouldRedirectToLogin } from './AuthGuard';

describe('shouldRedirectToLogin', () => {
  it('redirects only on a definitive logout after loading settles', () => {
    expect(shouldRedirectToLogin('unauthenticated', false)).toBe(true);
  });
  it('never redirects while loading', () => {
    expect(shouldRedirectToLogin('unauthenticated', true)).toBe(false);
  });
  it('never redirects on degraded (network stall must not eject a user)', () => {
    expect(shouldRedirectToLogin('degraded', false)).toBe(false);
  });
  it('never redirects when authenticated', () => {
    expect(shouldRedirectToLogin('authenticated', false)).toBe(false);
  });
});
