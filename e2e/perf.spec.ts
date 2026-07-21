import { test } from '@playwright/test';

// Diagnostic page-load perf probe (not a CI gate). Reports Navigation Timing +
// paint + resource weight per page so "the app feels slow" gets real numbers.
//
// It measures a WARM load (navigate once to compile, then reload and measure) so
// dev-server first-compile cost is excluded and the numbers reflect steady state.
// Structural metrics (request count, JS KB) are dev/prod-independent and are the
// actionable signal; absolute ms on a dev server run higher than production.
//
// For true production numbers: `npm run build && npx next start -p 3100`, then
// `PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test e2e/perf.spec.ts --project=chromium`.

const PAGES = ['/', '/discover', '/pricing', '/login', '/link-home'];

test.describe('perf probe', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'perf probe: desktop chromium only');
  });

  test('page load metrics', async ({ page }) => {
    test.setTimeout(180_000);

    type Row = {
      path: string;
      ttfb: number;
      fcp: number;
      dcl: number;
      load: number;
      reqs: number;
      totalKB: number;
      jsKB: number;
      jsFiles: number;
    };
    const rows: Row[] = [];

    for (const path of PAGES) {
      await page.goto(path, { waitUntil: 'load' }); // warm (compile in dev)
      await page.reload({ waitUntil: 'load' }); // measured load
      await page.waitForTimeout(1_200); // let late resources/paint settle

      const m = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
        const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const totalBytes = res.reduce((s, r) => s + (r.transferSize || 0), 0);
        const js = res.filter((r) => r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name));
        const jsBytes = js.reduce((s, r) => s + (r.transferSize || 0), 0);
        return {
          ttfb: nav ? Math.round(nav.responseStart) : 0,
          fcp: Math.round(fcp),
          dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
          load: nav ? Math.round(nav.loadEventEnd) : 0,
          reqs: res.length,
          totalKB: Math.round(totalBytes / 1024),
          jsKB: Math.round(jsBytes / 1024),
          jsFiles: js.length,
        };
      });
      rows.push({ path, ...m });
    }

    const pad = (v: string | number, n: number) => String(v).padStart(n);
    console.log(`\n──── PAGE LOAD PERF (${test.info().project.name}, warm loads, ms from nav start) ────`);
    console.log('path             ttfb   fcp    dcl   load   reqs  totalKB  jsKB  jsFiles');
    for (const r of rows) {
      console.log(
        `${r.path.padEnd(15)} ${pad(r.ttfb, 5)} ${pad(r.fcp, 5)} ${pad(r.dcl, 5)} ${pad(r.load, 5)} ${pad(r.reqs, 5)} ${pad(r.totalKB, 8)} ${pad(r.jsKB, 5)} ${pad(r.jsFiles, 7)}`,
      );
    }
    console.log('──────────────────────────────────────────────────────────────────────\n');
  });
});
