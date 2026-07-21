import { test, expect } from '@playwright/test';

// Public-surface smoke tests — these need no backend credentials, so they run
// green in CI against a placeholder-env build. They assert the page responds
// and the server-rendered shell (title/metadata + key chrome) is present, which
// catches build-boundary breakage, bad redirects, and hard render crashes.

const PUBLIC_PAGES: { path: string; titleIncludes: RegExp }[] = [
  { path: '/', titleIncludes: /DigiOne/i },
  { path: '/pricing', titleIncludes: /DigiOne/i },
  { path: '/features', titleIncludes: /DigiOne/i },
  { path: '/discover', titleIncludes: /DigiOne/i },
  { path: '/signup', titleIncludes: /DigiOne/i },
];

for (const { path, titleIncludes } of PUBLIC_PAGES) {
  test(`public page loads: ${path}`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(res, `no response for ${path}`).not.toBeNull();
    expect(res!.status(), `bad status for ${path}`).toBeLessThan(400);
    await expect(page).toHaveTitle(titleIncludes);
  });
}

test('login page renders the sign-in form', async ({ page }) => {
  const res = await page.goto('/login', { waitUntil: 'domcontentloaded' });
  expect(res!.status()).toBeLessThan(400);
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByText(/log in to your digione account/i)).toBeVisible();
});

test('linkln landing renders its hero', async ({ page }) => {
  const res = await page.goto('/link-home', { waitUntil: 'domcontentloaded' });
  expect(res!.status()).toBeLessThan(400);
  await expect(page.getByRole('heading', { name: /shorten\. share\. track\./i })).toBeVisible();
});
