import { defineConfig, devices } from '@playwright/test';

// E2E config. Kept separate from Vitest: Vitest only globs `*.test.{ts,tsx}` under
// {src,app,lib} (see vitest.config.ts), Playwright only runs `e2e/**/*.spec.ts`.
//
// Target URL:
//   - default: Playwright boots the app locally (dev server locally, `next start`
//     in CI) and tests http://localhost:3000.
//   - set PLAYWRIGHT_BASE_URL to a deployed URL (e.g. a Vercel preview) to test
//     that instead — the local webServer is skipped automatically.

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const useLocalServer = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Generous per-test budget so a cold Next dev compile (first hit of a route)
  // doesn't flake the run; a prebuilt `next start` in CI is far faster.
  timeout: 60_000,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Mobile matters for DigiOne's audience — cover a phone viewport too.
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],

  // Boot the app locally unless we're pointed at an external deployment.
  webServer: useLocalServer
    ? {
        command: process.env.CI ? 'npm run start' : 'npm run dev',
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
});
