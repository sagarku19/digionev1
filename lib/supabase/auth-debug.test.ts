import { describe, it, expect } from 'vitest';
import { describeAuthUrl, isAuthDebugEnabled } from './auth-debug';

describe('auth-debug', () => {
  it('describes auth urls as path + grant_type only (no tokens/PII)', () => {
    expect(describeAuthUrl('https://x.supabase.co/auth/v1/token?grant_type=refresh_token')).toBe(
      '/auth/v1/token?grant_type=refresh_token',
    );
    expect(describeAuthUrl('https://x.supabase.co/auth/v1/user')).toBe('/auth/v1/user');
    expect(describeAuthUrl('not a url')).toBe('not a url');
  });

  it('is disabled outside the browser', () => {
    expect(isAuthDebugEnabled()).toBe(false);
  });
});
