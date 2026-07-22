import { describe, it, expect } from 'vitest';
import { sendPurchaseConfirmation, type PurchaseEmailInput } from './email';

const input: PurchaseEmailInput = {
  to: 'buyer@example.com',
  customerName: 'Asha',
  orderId: 'abc12345-0000-0000-0000-000000000000',
  totalAmount: 100,
  items: [{ name: 'Product', price: 100, links: [], hasFiles: false }],
  isGuest: false,
  appUrl: 'https://digione.ai',
};

describe('sendPurchaseConfirmation', () => {
  // The default unit env has no RESEND_API_KEY/EMAIL_FROM, so this exercises the
  // skip branch without any network call — and pins the discriminated result shape
  // that order-email.ts persists to orders.confirmation_email_*.
  it('returns a skipped result (never throws) when Resend is not configured', async () => {
    const result = await sendPurchaseConfirmation(input);
    expect(result).toEqual({ status: 'skipped', reason: 'email_not_configured' });
  });
});
