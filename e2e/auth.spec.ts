import { test, expect } from '@playwright/test';

// Real creator-login E2E — guards the login-timeout class of bug (the QUIC/H3
// auth saga in project memory) that unit tests can never catch.
//
// Skipped unless you provide a throwaway test creator's credentials:
//   locally: E2E_USER_EMAIL=… E2E_USER_PASSWORD=… npm run e2e
//   in CI:   add E2E_USER_EMAIL / E2E_USER_PASSWORD as GitHub repo secrets
// It needs a real (test) Supabase backend, so it only makes sense when
// PLAYWRIGHT_BASE_URL points at a deploy wired to that backend, or the local
// dev server is running against it.

const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;

test.describe('creator login', () => {
  test.skip(
    !EMAIL || !PASSWORD,
    'Set E2E_USER_EMAIL / E2E_USER_PASSWORD (a test creator) to enable the real login E2E.',
  );

  test('signs in and lands on the dashboard', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('you@example.com').fill(EMAIL!);
    await page.locator('input[type="password"]').fill(PASSWORD!);
    await page.getByRole('button', { name: /^log in$/i }).click();

    // The auth saga is about this transition stalling — give it room but assert
    // it actually completes rather than hanging on the overlay.
    await expect(page).toHaveURL(/\/(dashboard|account)/, { timeout: 30_000 });
  });
});
