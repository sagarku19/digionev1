import { describe, it, expect } from 'vitest';
import { gateGuardedRoute } from './route-gate';

describe('gateGuardedRoute', () => {
  describe('/dashboard', () => {
    it('allows creator', () => {
      expect(gateGuardedRoute('/dashboard', 'creator')).toEqual({ type: 'allow' });
    });

    it('allows super_admin', () => {
      expect(gateGuardedRoute('/dashboard/orders', 'super_admin')).toEqual({ type: 'allow' });
    });

    it('redirects buyer to /account/library', () => {
      expect(gateGuardedRoute('/dashboard', 'buyer')).toEqual({
        type: 'redirect',
        pathname: '/account/library',
      });
    });

    it('redirects missing role to /account/library', () => {
      expect(gateGuardedRoute('/dashboard/products', undefined)).toEqual({
        type: 'redirect',
        pathname: '/account/library',
      });
    });

    it('redirects non-string role to /account/library', () => {
      expect(gateGuardedRoute('/dashboard', 42)).toEqual({
        type: 'redirect',
        pathname: '/account/library',
      });
    });
  });

  describe('/dashboard/admin', () => {
    it('allows super_admin', () => {
      expect(gateGuardedRoute('/dashboard/admin/payouts', 'super_admin')).toEqual({
        type: 'allow',
      });
    });

    it('redirects creator to /dashboard', () => {
      expect(gateGuardedRoute('/dashboard/admin/payouts', 'creator')).toEqual({
        type: 'redirect',
        pathname: '/dashboard',
      });
    });

    it('redirects buyer to /account/library (outer gate wins)', () => {
      expect(gateGuardedRoute('/dashboard/admin/payouts', 'buyer')).toEqual({
        type: 'redirect',
        pathname: '/account/library',
      });
    });
  });

  describe('/account', () => {
    it('allows any authenticated role', () => {
      expect(gateGuardedRoute('/account/library', 'buyer')).toEqual({ type: 'allow' });
      expect(gateGuardedRoute('/account/library', 'creator')).toEqual({ type: 'allow' });
      expect(gateGuardedRoute('/account', undefined)).toEqual({ type: 'allow' });
    });
  });
});
