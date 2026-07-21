import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Auth-stall investigation (the sign-in-timeout saga — see project memory
// `signin-timeout-saga.md` and docs/reference/auth-timeouts-and-locks.md).
//
// The ROOT transport fault is a QUIC/HTTP3 session blackhole to *.supabase.co:
// an intermittent, network-level zombie session that hangs auth requests ~60s
// then recovers. That transient cannot be summoned on demand — but its
// USER-FACING SYMPTOM (a hung /auth/v1/token POST) can be reproduced exactly by
// black-holing that request, with NO real credentials and NO real network fault.
//
// This gives the saga the deterministic reproduction it never had, and doubles
// as a regression guard proving the mitigations engage:
//   - the 12s auth-fetch abort (AUTH_FETCH_TIMEOUT_MS)
//   - signInWithRetry's single automatic retry
//   - the mapped, user-facing "could not reach the sign-in server" error
//   - NO infinite hang, NO ProcessLockAcquireTimeoutError dev-overlay crash
// ─────────────────────────────────────────────────────────────────────────────

const AUTH_FETCH_TIMEOUT_MS = 12_000; // mirror of lib/supabase/auth-timing.ts

// CDP is Chromium-only and mobile adds nothing here — run on desktop chromium.
test.describe('auth stall investigation', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'diagnostic — desktop chromium only');
  });

  test('transport: what protocol does the browser use to reach Supabase?', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    const seen = new Map<string, string>();
    client.on('Network.responseReceived', (e: { response: { url: string; protocol?: string } }) => {
      try {
        const u = new URL(e.response.url);
        if (u.host.includes('supabase')) seen.set(`${u.host}${u.pathname}`, e.response.protocol ?? '?');
      } catch {
        /* ignore non-URL entries */
      }
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3_000);

    console.log('\n──── SUPABASE TRANSPORT (Playwright Chromium) ────');
    if (seen.size === 0) {
      console.log('  (no *.supabase.co requests observed during /login load)');
    } else {
      for (const [k, v] of seen) console.log(`  ${v.padEnd(10)} ${k}`);
    }
    console.log('  NOTE: a cold Playwright context negotiates H2 first (H3/QUIC is only adopted');
    console.log('  after Alt-Svc from a prior response), so this rarely shows h3. The real QUIC');
    console.log('  blackhole needs a warmed QUIC session and is not deterministically reproducible');
    console.log('  here — which is exactly why the stall SYMPTOM is simulated below instead.');
    console.log('──────────────────────────────────────────────────\n');
  });

  test('symptom: a black-holed /auth/v1/token POST aborts at 12s and surfaces a clean error', async ({
    page,
  }) => {
    // Two 12s aborts (sign-in + one retry) + ~1s gap ≈ 25s — give headroom.
    test.setTimeout(70_000);

    // 1. Enable the app's in-page auth telemetry before any script runs.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('digione.auth.debug', '1');
      } catch {
        /* storage may be unavailable */
      }
    });

    // 2. Capture the console — the [auth-debug] lines are the forensic proof.
    const consoleLines: string[] = [];
    page.on('console', (msg) => consoleLines.push(msg.text()));

    // 3. Black-hole the password-grant POST: hold it open so the browser never
    //    gets a response — exactly what a zombie QUIC session does.
    await page.route('**/auth/v1/token**', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await new Promise((r) => setTimeout(r, 45_000)); // outlast the app's two 12s aborts
      try {
        await route.abort('timedout');
      } catch {
        /* already cancelled by the in-page AbortController */
      }
    });

    // 4. Attempt sign-in with throwaway creds (the POST is hijacked, so these
    //    never reach a real server).
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('you@example.com').fill('stall-probe@example.com');
    await page.locator('input[type="password"]').fill('irrelevant-password');

    const startedAt = Date.now();
    await page.getByRole('button', { name: /^log in$/i }).click();

    // 5. The mitigation must surface a clear, retryable error — not spin forever.
    await expect(
      page.getByText(/could not reach the sign-in server|check your connection|timed out/i),
    ).toBeVisible({ timeout: 45_000 });
    const elapsedMs = Date.now() - startedAt;

    // 6. Forensics — read the app's in-page telemetry buffer directly and dump
    //    every [auth-debug] console line so the real format is visible.
    const telemetry = await page.evaluate(() => {
      const w = window as unknown as { __authDebug?: () => { detail: string; durationMs?: number }[] };
      return {
        flag: window.localStorage.getItem('digione.auth.debug'),
        buffer: w.__authDebug ? w.__authDebug() : null,
      };
    });
    const authDebugLines = consoleLines.filter((l) => l.includes('[auth-debug]'));
    const overlayCrash = consoleLines.some((l) => /ProcessLockAcquireTimeoutError/.test(l));

    console.log('\n──── AUTH STALL REPRODUCED ────');
    console.log(`  time to surfaced error : ${(elapsedMs / 1000).toFixed(1)}s  (≈ two 12s aborts + 1s retry gap)`);
    console.log(`  debug flag in page     : ${telemetry.flag}`);
    console.log(`  __authDebug buffer     : ${telemetry.buffer ? `${telemetry.buffer.length} entries` : 'undefined'}`);
    if (telemetry.buffer) {
      telemetry.buffer
        .filter((e) => /token|user/i.test(e.detail))
        .forEach((e) => console.log(`    buffer: ${e.detail}${e.durationMs != null ? ` (${Math.round(e.durationMs)}ms)` : ''}`));
    }
    console.log(`  [auth-debug] console lines (${authDebugLines.length}):`);
    authDebugLines.forEach((l) => console.log(`    ${l}`));
    console.log(`  lock-overlay crash?    : ${overlayCrash ? 'YES (regression!)' : 'no'}`);
    console.log('───────────────────────────────\n');

    // Mechanism proof via TIMING: ~25s means both the 12s abort AND the single
    // automatic retry engaged (an instant connection error would be <1s; an
    // unmitigated hang would run to the 45s route hold). No infinite spin.
    expect(
      elapsedMs,
      'sign-in should ride out one 12s abort + one retry, not fail instantly or hang forever',
    ).toBeGreaterThanOrEqual(2 * AUTH_FETCH_TIMEOUT_MS - 2_000);
    // The chapter-8 lock-ceiling fix holds — no uncaught acquire-timeout overlay.
    expect(overlayCrash, 'a ProcessLockAcquireTimeoutError means the lock ceiling regressed').toBe(false);
  });
});
