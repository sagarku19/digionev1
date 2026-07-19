---
noteId: "249136a0834311f1bf652b2f04620834"
tags: []

---

# CURRENT TESTING STATUS (2026-07-19) — read this first if a forensics report is pasted

**What is being tested:** the Phase 5 auth fix `bindLockAcquireTimeout`
(`lib/supabase/auth-timing.ts` + `lib/supabase/client.ts`). It binds the 15s lock
ceiling into the forwarded `lock` fn, working around `@supabase/supabase-js@2.99.2`
silently dropping the `lockAcquireTimeout` option (which left the running client at the
5000ms default). Full trace: `2026-07-19-browser-only-auth-root-cause.md` → Phase 5.

**Where the user is testing:** the browser DevTools forensics tool below, on **BOTH**
- `http://localhost:3000` (dev build — already has the fix), and
- `https://digione.ai` (prod — has the fix once this commit deploys via Vercel).

**Deploy state:** the fix was committed + pushed to `main` on 2026-07-19 (this is what
enables it on digione.ai). If a pasted report predates the deploy on digione.ai, prod is
still the old 5000ms build.

**How to read a pasted report (`window.__authDebugReport()` JSON):**
- `findings: []` + every request `status: 200` + max lock `waitMs` small (<1s) ⇒
  **HEALTHY capture, no failure occurred while recording** — cannot diagnose the crash
  from it (two such captures already seen: 2026-07-19). Ask for a capture taken *at the
  moment it hangs*, after a long idle→refocus (sleep/resume or tab hidden 15+ min).
- A real failure shows a `findings[]` entry: `lock-timeout WITH in-flight auth request`
  (H1 transport stall held the lock) or `request-timeout / …` on a `/auth/v1/user` GET,
  plus a `requests` row with `timedOut: true` or `inFlight: true`.
- **Fix-active proof:** in a failure capture, the lock `waitMs` before a timeout should
  approach **~15000ms**, and the console message reads `after 15000ms`. If it says
  `after 5000ms`, that browser is still on the old build (prod not yet redeployed, or a
  cached bundle — hard-reload).

**Mechanism confirmed by the healthy captures:** on every tab refocus after idle,
auth-js takes the per-tab lock and holds it for the full duration of the on-focus
`/auth/v1/user` GET (250–620ms when the socket is alive). The crash is that same GET
stalling ~12s on a dead pooled socket while waiters hit the 5000ms cap. The fix raises
the cap to 15s so waiters ride out the stall instead of throwing.

---

Step 1 — Open the console

On digione.ai (logged in), press F12 → click the Console tab.

Step 2 — Turn on recording (do this BEFORE the failure)

Paste this and hit Enter:
localStorage['digione.auth.debug'] = '1'
Then reload the page (Ctrl+R). This is important — the flag is read when the page loads, and it needs to be recording before the stall happens. It persists across reloads, so you can leave it on.

(Alternative, no reload: run window.__authForensicsEnable() — but that turns off on the next reload, so the localStorage way is better for an intermittent bug.)

Step 3 — Reproduce the failure

Use the site normally until the auth issue hits. To force it faster, try what usually triggers it for you: leave the tab idle 20–30 min then click around, sleep/resume the laptop, or go through a Cashfree → payment-status redirect.

Step 4 — Grab the report (the moment it fails — do NOT reload first)

When you see the error/hang, go back to the Console and run one of these:

Easiest — download a file to send me:
window.__authDebugDownload()
(saves auth-forensics-….json to your Downloads)

Or — copy it to clipboard, then paste to me:
copy(JSON.stringify(window.__authDebugReport(), null, 2))

Or — just read it inline:
window.__authDebugReport().findings

Step 5 — Send it to me

The whole JSON is best. If it's large, at minimum I need:
- report.findings (the correlation engine's verdict), and
- the report.requests rows where timedOut: true or inFlight: true.

When you're done

localStorage.removeItem('digione.auth.debug')
then reload, to stop recording.

Two notes: the report only contains a failure if recording was on when it happened (Step 2 before Step 3) — a report taken from a healthy session shows nothing useful (findings: []). And once the Phase 5 fix has deployed to digione.ai (see the testing-status block at the top), a real stall capture should show the lock waiting ~15000ms, and the console should read `after 15000ms`, not `5000ms` — that's the confirmation the fix is live. If you still see `5000ms`, hard-reload to bust a cached bundle, or the deploy hasn't landed yet.

