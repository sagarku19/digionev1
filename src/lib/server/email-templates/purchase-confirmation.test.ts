import { describe, it, expect } from 'vitest';
import { buildPurchaseConfirmation, type PurchaseEmailInput } from './purchase-confirmation';

const base: PurchaseEmailInput = {
  to: 'buyer@example.com',
  customerName: 'Asha Verma',
  orderId: 'abc12345-0000-0000-0000-000000000000',
  totalAmount: 1499,
  items: [
    { name: 'Notion Template', price: 999, accessUrl: 'https://example.com/access' },
    { name: 'Preset <Pack>', price: 500, accessUrl: null },
  ],
  isGuest: false,
  appUrl: 'https://digione.ai',
};

describe('buildPurchaseConfirmation', () => {
  it('renders every product with its price and the total', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('Notion Template');
    expect(html).toContain('₹999');
    expect(html).toContain('₹500');
    expect(html).toContain('₹1,499');
  });

  it('escapes HTML in product names', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('Preset &lt;Pack&gt;');
    expect(html).not.toContain('Preset <Pack>');
  });

  it('includes per-product access links only when present', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('https://example.com/access');
    expect(html.match(/Access your product/g)?.length).toBe(1);
  });

  it('logged-in variant links to the library', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('https://digione.ai/account/library');
    expect(html).toContain('Open your library');
  });

  it('guest variant links to account creation with the prefilled email', () => {
    const { html } = buildPurchaseConfirmation({ ...base, isGuest: true });
    expect(html).toContain('https://digione.ai/user-login?email=buyer%40example.com');
    expect(html).toContain('Create your free account');
  });

  it('includes the receipt link and greets by first name', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('https://digione.ai/payment/receipt?order_id=abc12345-0000-0000-0000-000000000000');
    expect(html).toContain('Hi Asha,');
  });

  it('subject names the single product, or the count for multi-item orders', () => {
    expect(buildPurchaseConfirmation({ ...base, items: [base.items[0]] }).subject)
      .toBe('Your purchase is confirmed — Notion Template');
    expect(buildPurchaseConfirmation(base).subject)
      .toBe('Your purchase is confirmed — 2 products');
  });
});
