import { describe, it, expect } from 'vitest';
import { buildPurchaseConfirmation, type PurchaseEmailInput } from './purchase-confirmation';

const base: PurchaseEmailInput = {
  to: 'buyer@example.com',
  customerName: 'Asha Verma',
  orderId: 'abc12345-0000-0000-0000-000000000000',
  totalAmount: 1499,
  items: [
    {
      name: 'Notion Template',
      price: 999,
      links: [
        { label: 'Access', url: 'https://example.com/access' },
        { label: 'Bonus pack', url: 'https://example.com/bonus' },
      ],
      hasFiles: true,
    },
    { name: 'Preset <Pack>', price: 500, links: [], hasFiles: false },
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

  it('renders every access link for a product (multiple, each labelled)', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('https://example.com/access');
    expect(html).toContain('https://example.com/bonus');
    expect(html).toContain('Bonus pack →');
  });

  it('flags products that include downloadable files, pointing to the library', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('Downloadable files included');
  });

  it('falls back to a library note when a product has no links or files', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('Access details are in your library.');
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

  it('shows a discount row when discountAmount is set', () => {
    const { html } = buildPurchaseConfirmation({ ...base, discountAmount: 200, totalAmount: 1299 });
    expect(html).toContain('Discount');
    expect(html).toContain('-₹200');
  });

  it('omits the discount row when there is no discount', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).not.toContain('Discount');
  });
});
