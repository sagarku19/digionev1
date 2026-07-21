import { test, expect } from '@playwright/test';

// Free-order checkout E2E (the doc's recommended starting point for the money
// path). A ₹0 order short-circuits through fulfillOrder with NO gateway call,
// so this exercises the real order → fulfillment → status flow without needing
// Cashfree sandbox cards — only a live (test) Supabase backend + a published
// FREE product.
//
// Skipped until you point it at a free product's checkout entry:
//   E2E_FREE_PRODUCT_PATH=/store/<slug>  (or a /site or /discover product path)
// and run against a deploy/dev server wired to a test backend
// (PLAYWRIGHT_BASE_URL or the local dev server).
//
// The selectors below are intentionally loose placeholders — tighten them to
// the real storefront "Buy"/"Get" button + the checkout contact form once you
// wire a fixture product. Left here as the documented scaffold for the flow.

const FREE_PRODUCT_PATH = process.env.E2E_FREE_PRODUCT_PATH;

test.describe('free-order checkout', () => {
  test.skip(
    !FREE_PRODUCT_PATH,
    'Set E2E_FREE_PRODUCT_PATH to a published FREE product to enable the free-order checkout E2E.',
  );

  test('completes a ₹0 order and reaches the payment status page', async ({ page }) => {
    await page.goto(FREE_PRODUCT_PATH!, { waitUntil: 'domcontentloaded' });

    // 1. Start checkout (storefront Buy/Get button).
    await page.getByRole('button', { name: /buy|get|checkout|add to cart/i }).first().click();

    // 2. Fill buyer contact on the checkout page.
    await page.getByLabel(/name/i).first().fill('E2E Buyer');
    await page.getByLabel(/email/i).first().fill('e2e-buyer@example.com');

    // 3. Pay — a free order skips Cashfree and redirects to /payment/status.
    await page.getByRole('button', { name: /pay|complete|place order/i }).first().click();
    await expect(page).toHaveURL(/\/payment\/status/, { timeout: 30_000 });
  });
});
