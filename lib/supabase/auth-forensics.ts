// lib/supabase/auth-forensics.ts
// TEMPORARY, DEBUG-ONLY browser auth forensics. Disabled by default; enabled via
// localStorage['digione.auth.debug'] === '1' (read once at module load; runtime
// toggle via window.__authForensicsEnable()). When disabled, every record*/wrapLock
// entrypoint is a single boolean check + early return — ZERO behavior change and no
// measurable overhead. It records (never alters) requests, auth events, lock
// acquire/hold, browser-lifecycle events, and PerformanceResourceTiming, then
// correlates them into findings that distinguish: browser networking vs HTTP/2
// reuse vs lock contention vs cookie/session vs browser lifecycle vs SDK behavior.
//
// REMOVAL: delete this file + its .test.ts, then remove the 4 hook sites marked
// with the tag `[auth-forensics]` (grep it) in auth-timing.ts, client.ts,
// current-user.ts. Investigation doc: docs/superpowers/investigation/2026-07-19-browser-only-auth-root-cause.md
//
// The sanctioned exception to the no-console rule (same basis as auth-debug.ts):
// every console line is gated by the debug flag, never set in production paths.

import { describeAuthUrl, isAuthDebugEnabled } from './auth-debug';

// ---------------------------------------------------------------------------
// Enablement (cached; hot-path safe)
// ---------------------------------------------------------------------------

let ENABLED = ((): boolean => {
  try {
    return isAuthDebugEnabled();
  } catch {
    return false;
  }
})();

export function isForensicsEnabled(): boolean {
  return ENABLED;
}

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------

export interface RequestRecord {
  id: string;
  path: string; // described path (+grant_type); never a full URL — auth URLs carry no secrets, but we keep it tidy
  href: string; // full URL, used only to correlate against PerformanceResourceTiming.name
  method: string;
  isAuth: boolean;
  attempt: number; // 1 = first, 2 = retry
  retry: boolean;
  retryReason: string | null;
  startedAt: number; // MONOTONIC (performance.now) — elapsed + ordering
  startedAtWall: number; // epoch ms — human-readable only
  finishedAt: number | null; // MONOTONIC; null while in-flight
  durationMs: number | null; // finishedAt - startedAt (monotonic); null while in-flight
  inFlight: boolean; // true between start and settle — visible during a stall
  aborted: boolean; // caller-initiated abort (init.signal)
  timedOut: boolean; // our own timer aborted it
  status: number | null;
  errorType: string | null;
}

export interface AuthEventRecord {
  id: string;
  event: string; // TOKEN_REFRESHED | SIGNED_IN | SIGNED_OUT | INITIAL_SESSION | USER_UPDATED | ...
  at: number;
  sessionExpiresAt: number | null; // unix seconds
  accessTokenTail: string | null; // last 6 chars only — rotation detection without exposing the token
}

export type LockPhase = 'requested' | 'granted' | 'released' | 'timeout' | 'error';

export interface LockRecord {
  id: string; // acquisition id (requested/granted/released/timeout share it)
  phase: LockPhase;
  name: string;
  at: number;
  waitMs: number | null; // requested→granted or requested→timeout
  holdMs: number | null; // granted→released
  caller: string | null;
}

export type LifecycleKind =
  | 'visibilitychange'
  | 'pageshow'
  | 'pagehide'
  | 'freeze'
  | 'resume'
  | 'online'
  | 'offline'
  | 'focus'
  | 'blur';

export interface LifecycleRecord {
  id: string;
  kind: LifecycleKind;
  at: number;
  detail: string | null; // e.g. visibilityState
}

export interface ResourceRecord {
  id: string;
  path: string;
  href: string;
  startedAt: number; // MONOTONIC — entry.startTime, same base as performance.now()
  responseEndMs: number; // MONOTONIC — 0 means the request never completed
  // taoRestricted: cross-origin without Timing-Allow-Origin → the fields below
  // are ZEROED by the browser and MUST NOT be interpreted. When true, the
  // correlation engine reads only responseEndMs (completed vs not) + recommends NetLog.
  taoRestricted: boolean;
  dnsMs: number;
  tcpMs: number;
  tlsMs: number;
  ttfbMs: number;
  downloadMs: number;
  totalMs: number;
  protocol: string; // nextHopProtocol: 'h2' | 'h3' | 'http/1.1' | '' (empty when TAO-restricted)
  reused: boolean | null; // heuristic; null = unknown (TAO-restricted)
  transferSize: number | null;
  responseStatus: number | null;
}

export interface EnvSnapshot {
  reason: string; // 'request-timeout' | 'lock-timeout' | 'manual'
  at: number;
  userAgent: string;
  platform: string;
  online: boolean;
  visibility: string;
  hasFocus: boolean;
  route: string;
  outstandingAuthRequests: number;
  outstandingDataRequests: number;
  outstandingLockWaiters: number;
  authStatus: string | null;
  sessionExpiresAt: number | null;
}

// ---------------------------------------------------------------------------
// Ring-buffer stores
// ---------------------------------------------------------------------------

const MAX = 1000;

const requests: RequestRecord[] = [];
const authEvents: AuthEventRecord[] = [];
const lockEvents: LockRecord[] = [];
const lifecycle: LifecycleRecord[] = [];
const resources: ResourceRecord[] = [];
const envSnapshots: EnvSnapshot[] = [];

function push<T>(buf: T[], entry: T): void {
  buf.push(entry);
  if (buf.length > MAX) buf.shift();
}

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}${seq}`;
}

// Monotonic clock for ALL elapsed times + ordering — survives wall-clock jumps
// on sleep/resume (the primary scenario). performance.now() shares its origin
// with PerformanceResourceTiming.startTime, so request↔resource correlation is
// on one clock. Wall-clock (epoch ms) is kept only for human-readable display:
// the report carries `timeOrigin` so any monotonic `at` renders as wall time.
function nowMono(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}
function nowWall(): number {
  return Date.now();
}
function monoTimeOrigin(): number {
  return typeof performance !== 'undefined' && typeof performance.timeOrigin === 'number' ? performance.timeOrigin : Date.now() - nowMono();
}

// Latest known auth context, fed by current-user.ts. Not a credential — status +
// expiry only, used for the environment snapshot.
let authContext: { status: string | null; sessionExpiresAt: number | null } = {
  status: null,
  sessionExpiresAt: null,
};

export function setAuthContext(patch: { status?: string | null; sessionExpiresAt?: number | null }): void {
  authContext = {
    status: patch.status !== undefined ? patch.status : authContext.status,
    sessionExpiresAt: patch.sessionExpiresAt !== undefined ? patch.sessionExpiresAt : authContext.sessionExpiresAt,
  };
}

// ---------------------------------------------------------------------------
// Recording entrypoints (all no-op when disabled)
// ---------------------------------------------------------------------------

export interface RequestStartInput {
  href: string;
  method: string;
  attempt: number;
  retry: boolean;
  retryReason: string | null;
}

export interface RequestSettleInput {
  aborted: boolean;
  timedOut: boolean;
  status: number | null;
  errorType: string | null;
}

// Record the request at START (in-flight) and return a stable id. The SAME
// record is patched on settle — so a mid-stall report shows the request that is
// currently hanging (and outstanding-request counts are real). Returns '' when
// disabled; recordRequestSettle('') is a no-op.
export function recordRequestStart(input: RequestStartInput): string {
  if (!ENABLED) return '';
  const id = nextId('req');
  const isAuth = input.href.includes('/auth/v1/');
  push(requests, {
    id,
    path: isAuth ? describeAuthUrl(input.href) : safePathname(input.href),
    href: input.href,
    method: input.method,
    isAuth,
    attempt: input.attempt,
    retry: input.retry,
    retryReason: input.retryReason,
    startedAt: nowMono(),
    startedAtWall: nowWall(),
    finishedAt: null,
    durationMs: null,
    inFlight: true,
    aborted: false,
    timedOut: false,
    status: null,
    errorType: null,
  });
  return id;
}

export function recordRequestSettle(id: string, input: RequestSettleInput): void {
  if (!ENABLED || !id) return;
  const rec = findRequest(id);
  if (rec) {
    rec.finishedAt = nowMono();
    rec.durationMs = rec.finishedAt - rec.startedAt;
    rec.inFlight = false;
    rec.aborted = input.aborted;
    rec.timedOut = input.timedOut;
    rec.status = input.status;
    rec.errorType = input.errorType;
  }
  if (input.timedOut) captureEnvSnapshot('request-timeout');
}

// Search newest-first; a settle after ring-buffer eviction no-ops gracefully.
function findRequest(id: string): RequestRecord | undefined {
  for (let i = requests.length - 1; i >= 0; i -= 1) {
    if (requests[i].id === id) return requests[i];
  }
  return undefined;
}

export function recordAuthEvent(event: string, sessionExpiresAt: number | null, accessToken: string | null): void {
  if (!ENABLED) return;
  push(authEvents, {
    id: nextId('auth'),
    event,
    at: nowMono(),
    sessionExpiresAt,
    accessTokenTail: accessToken ? accessToken.slice(-6) : null,
  });
}

function recordLock(phase: LockPhase, id: string, name: string, waitMs: number | null, holdMs: number | null, caller: string | null): void {
  push(lockEvents, { id, phase, name, at: nowMono(), waitMs, holdMs, caller });
  if (phase === 'timeout') captureEnvSnapshot('lock-timeout');
}

export function recordLifecycle(kind: LifecycleKind, detail: string | null): void {
  if (!ENABLED) return;
  push(lifecycle, { id: nextId('life'), kind, at: nowMono(), detail });
}

// ---------------------------------------------------------------------------
// Lock wrapper — transparent. Delegates to the real lock; records true
// acquisitions only (auth-js's reentrant piggybackers never call the lock fn,
// so they are invisible here — documented, not a bug).
// ---------------------------------------------------------------------------

export type LockFn = <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R>;

function captureCaller(): string | null {
  const stack = new Error().stack;
  if (!stack) return null;
  const lines = stack.split('\n').slice(2, 6).map((l) => l.trim());
  // Prefer the first frame that isn't this module or auth-js lock internals.
  const meaningful = lines.find((l) => !l.includes('auth-forensics') && !l.includes('locks.js')) ?? lines[0];
  return meaningful ?? null;
}

export function wrapLockWithForensics(lock: LockFn): LockFn {
  return async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
    if (!ENABLED) return lock(name, acquireTimeout, fn);
    const id = nextId('lock');
    const requestedAt = nowMono();
    const caller = captureCaller();
    recordLock('requested', id, name, null, null, caller);
    let granted = false;
    let grantedAt = 0;
    try {
      return await lock(name, acquireTimeout, async () => {
        granted = true;
        grantedAt = nowMono();
        recordLock('granted', id, name, grantedAt - requestedAt, null, caller);
        try {
          return await fn();
        } finally {
          recordLock('released', id, name, grantedAt - requestedAt, nowMono() - grantedAt, caller);
        }
      });
    } catch (err) {
      if (!granted) {
        const isAcquireTimeout = !!err && typeof err === 'object' && (err as { isAcquireTimeout?: boolean }).isAcquireTimeout === true;
        recordLock(isAcquireTimeout ? 'timeout' : 'error', id, name, nowMono() - requestedAt, null, caller);
      }
      throw err;
    }
  };
}

// ---------------------------------------------------------------------------
// Environment snapshot
// ---------------------------------------------------------------------------

export function captureEnvSnapshot(reason: string): void {
  if (!ENABLED || typeof window === 'undefined') return;
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const doc = typeof document !== 'undefined' ? document : undefined;
  const outstandingAuth = requests.filter((r) => r.finishedAt === null && r.isAuth).length;
  const outstandingData = requests.filter((r) => r.finishedAt === null && !r.isAuth).length;
  const waiters = countOutstandingLockWaiters(lockEvents);
  push(envSnapshots, {
    reason,
    at: nowMono(),
    userAgent: nav?.userAgent ?? 'unknown',
    platform: (nav as Navigator & { userAgentData?: { platform?: string } })?.userAgentData?.platform ?? nav?.platform ?? 'unknown',
    online: nav?.onLine ?? true,
    visibility: doc?.visibilityState ?? 'unknown',
    hasFocus: doc?.hasFocus?.() ?? false,
    route: typeof location !== 'undefined' ? location.pathname : 'unknown',
    outstandingAuthRequests: outstandingAuth,
    outstandingDataRequests: outstandingData,
    outstandingLockWaiters: waiters,
    authStatus: authContext.status,
    sessionExpiresAt: authContext.sessionExpiresAt,
  });
}

// A lock is "outstanding" when it has a 'requested' with no later terminal event.
export function countOutstandingLockWaiters(events: LockRecord[]): number {
  const terminal = new Set<string>();
  for (const e of events) {
    if (e.phase === 'released' || e.phase === 'timeout' || e.phase === 'error') terminal.add(e.id);
  }
  const requested = new Set<string>();
  for (const e of events) {
    if (e.phase === 'requested') requested.add(e.id);
  }
  let n = 0;
  for (const id of requested) if (!terminal.has(id)) n += 1;
  return n;
}

// ---------------------------------------------------------------------------
// Pure: derive network metrics from a PerformanceResourceTiming-shaped object
// ---------------------------------------------------------------------------

export interface ResourceTimingLike {
  name: string;
  startTime: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  secureConnectionStart: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  nextHopProtocol: string;
  transferSize?: number;
  responseStatus?: number;
}

export function deriveResourceMetrics(e: ResourceTimingLike): ResourceRecord {
  // Cross-origin without Timing-Allow-Origin zeroes every phase field AND
  // nextHopProtocol, while startTime/responseEnd/duration remain valid. Detect
  // that so the correlation engine never mistakes zeroed data for a real signal
  // (e.g. reused=true / ttfb=0 → "dead socket"). Heuristic: all phase markers 0
  // and protocol empty, but the entry exists (a genuine same-origin entry has
  // non-zero requestStart/responseStart or a non-empty protocol).
  const phasesAllZero =
    e.domainLookupStart === 0 && e.domainLookupEnd === 0 &&
    e.connectStart === 0 && e.connectEnd === 0 &&
    e.requestStart === 0 && e.responseStart === 0 && e.secureConnectionStart === 0;
  const taoRestricted = phasesAllZero && (e.nextHopProtocol ?? '') === '';

  const dnsMs = taoRestricted ? 0 : Math.max(0, e.domainLookupEnd - e.domainLookupStart);
  const tcpMs = taoRestricted ? 0 : Math.max(0, e.connectEnd - e.connectStart);
  const tlsMs = !taoRestricted && e.secureConnectionStart > 0 ? Math.max(0, e.connectEnd - e.secureConnectionStart) : 0;
  const ttfbMs = !taoRestricted && e.responseStart > 0 ? Math.max(0, e.responseStart - e.requestStart) : 0;
  const downloadMs = !taoRestricted && e.responseEnd > 0 && e.responseStart > 0 ? Math.max(0, e.responseEnd - e.responseStart) : 0;
  const reused = taoRestricted ? null : e.domainLookupStart === e.domainLookupEnd && e.connectStart === e.connectEnd;
  return {
    id: nextId('res'),
    path: safePathname(e.name),
    href: e.name,
    startedAt: e.startTime, // monotonic, same base as performance.now()
    responseEndMs: e.responseEnd,
    taoRestricted,
    dnsMs,
    tcpMs,
    tlsMs,
    ttfbMs,
    downloadMs,
    totalMs: Math.max(0, e.responseEnd - e.startTime),
    protocol: taoRestricted ? '' : (e.nextHopProtocol ?? ''),
    reused,
    transferSize: typeof e.transferSize === 'number' ? e.transferSize : null,
    responseStatus: typeof e.responseStatus === 'number' ? e.responseStatus : null,
  };
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Correlation engine (pure)
// ---------------------------------------------------------------------------

// Confidence taxonomy. Networking findings can never exceed 'strong' from the
// browser alone — transport-level proof (dead-socket/GOAWAY) lives only in
// NetLog. 'insufficient' is emitted whenever the underlying data is unavailable
// (TAO-restricted phases, missing resource entry).
export type FindingConfidence = 'definitive' | 'strong' | 'suggestive' | 'insufficient';

export interface Finding {
  pattern: string;
  confidence: FindingConfidence;
  supports: string; // which hypothesis this points at
  at: number;
  detail: string;
  eventIds: string[];
  recommend?: string; // external tool needed to raise confidence, e.g. NetLog
}

export interface CorrelationInput {
  requests: RequestRecord[];
  lockEvents: LockRecord[];
  lifecycle: LifecycleRecord[];
  authEvents: AuthEventRecord[];
  resources: ResourceRecord[];
}

const LIFECYCLE_WINDOW_MS = 20_000;
const STORM_WINDOW_MS = 120_000;
const STORM_THRESHOLD = 3;

const NETLOG = 'chrome://net-export (NetLog) → netlog-viewer: only source for socket/GOAWAY/phase ground truth';

export function correlate(input: CorrelationInput): Finding[] {
  const findings: Finding[] = [];

  // 1) Timed-out request → classify by its network timing (or its ABSENCE /
  //    TAO-restriction). Networking is NEVER graded 'definitive' from the
  //    browser alone, and NEVER inferred from zeroed cross-origin fields.
  for (const r of input.requests) {
    if (!r.timedOut) continue;
    const res = matchResource(input.resources, r);

    if (!res) {
      findings.push({
        pattern: 'request-timeout / no resource-timing entry',
        confidence: 'insufficient',
        supports: 'networking suspected, but no PerformanceResourceTiming entry exists (aborted pre-network OR never completed) — cannot localize',
        at: r.startedAt,
        detail: `${r.method} ${r.path} timed out after ${Math.round(r.durationMs ?? 0)}ms; no resource entry.`,
        eventIds: [r.id],
        recommend: NETLOG,
      });
      continue;
    }

    if (res.taoRestricted) {
      // Cross-origin without Timing-Allow-Origin: phases + protocol + reuse are
      // UNAVAILABLE. Read only responseEnd (completed vs not). Never claim a phase.
      const completed = res.responseEndMs > 0;
      findings.push({
        pattern: completed
          ? 'request-timeout / phases hidden (TAO) — resource shows completion'
          : 'request-timeout / phases hidden (TAO) — no completion recorded',
        confidence: completed ? 'suggestive' : 'strong',
        supports: completed
          ? 'inconclusive — resource timing shows a completion yet our fetch aborted; TAO hides the phase (possible late/duplicate response)'
          : 'networking (transport) stall — request sent, no response recorded; PHASE NOT OBSERVABLE cross-origin (dead-socket vs DNS/TLS indistinguishable here)',
        at: r.startedAt,
        detail: `TAO-restricted: DNS/TCP/TLS/TTFB/protocol/reuse UNAVAILABLE. responseEnd=${completed ? 'set' : '0'}.`,
        eventIds: [r.id, res.id],
        recommend: NETLOG,
      });
      continue;
    }

    // Same-origin (phases actually available) — safe to interpret, capped at 'strong'.
    if (res.ttfbMs === 0) {
      findings.push({
        pattern: 'request-timeout / socket sent, no first byte',
        confidence: 'strong',
        supports: res.reused ? 'H1 HTTP/2 dead-socket reuse (bytes sent on a reused connection, no response)' : 'H1/H7 no response from a fresh connection',
        at: r.startedAt,
        detail: `reused=${res.reused} protocol=${res.protocol} dns=${res.dnsMs} tcp=${res.tcpMs} tls=${res.tlsMs} ttfb=${res.ttfbMs}`,
        eventIds: [r.id, res.id],
        recommend: NETLOG,
      });
    } else if (res.tcpMs > 1000 || res.tlsMs > 1000 || res.dnsMs > 1000) {
      findings.push({
        pattern: 'request-timeout / slow connection setup',
        confidence: 'strong',
        supports: 'H5 resume/DNS/TCP/TLS stall or H4 proxy/AV interception',
        at: r.startedAt,
        detail: `dns=${res.dnsMs} tcp=${res.tcpMs} tls=${res.tlsMs} (new connection was slow to establish)`,
        eventIds: [r.id, res.id],
      });
    } else {
      findings.push({
        pattern: 'request-timeout / slow server first byte',
        confidence: 'suggestive',
        supports: 'H7 Supabase edge slowness (live socket, slow TTFB)',
        at: r.startedAt,
        detail: `ttfb=${res.ttfbMs} on a live socket`,
        eventIds: [r.id, res.id],
      });
    }
  }

  // 1b) A request still in-flight at capture time = a stall in progress.
  for (const r of input.requests) {
    if (!r.inFlight) continue;
    findings.push({
      pattern: 'request in-flight at capture',
      confidence: 'suggestive',
      supports: 'a request was still pending when the report was taken — a networking stall may be in progress',
      at: r.startedAt,
      detail: `${r.method} ${r.path} still pending (no completion recorded)`,
      eventIds: [r.id],
      recommend: NETLOG,
    });
  }

  // 2) Lock acquire-timeout ± overlapping in-flight network. In-process data
  //    (not TAO-affected), but absence-of-request is inferential → 'strong', not 'definitive'.
  for (const l of input.lockEvents) {
    if (l.phase !== 'timeout') continue;
    const waitStart = l.at - (l.waitMs ?? 0);
    const networkInWindow = input.requests.some(
      (r) => r.isAuth && r.startedAt <= l.at && (r.finishedAt === null || r.finishedAt >= waitStart),
    );
    findings.push(
      networkInWindow
        ? {
            pattern: 'lock-timeout WITH in-flight auth request',
            confidence: 'strong',
            supports: 'H1 networking — a stalled auth fetch held the lock past acquireTimeout',
            at: l.at,
            detail: `lock ${l.name} waited ${Math.round(l.waitMs ?? 0)}ms; an auth request overlapped the wait`,
            eventIds: [l.id],
          }
        : {
            pattern: 'lock-timeout WITHOUT any network request',
            confidence: 'strong',
            supports: 'H3 lock-orphan / H2 storage-read hang — the holder did NO network in the wait window',
            at: l.at,
            detail: `lock ${l.name} timed out after ${Math.round(l.waitMs ?? 0)}ms with no overlapping /auth/v1 request`,
            eventIds: [l.id],
          },
    );
  }

  // 3) Lifecycle trigger shortly before a timeout — temporal correlation only.
  for (const life of input.lifecycle) {
    const culprit = input.requests.find(
      (r) => r.timedOut && r.startedAt >= life.at && r.startedAt - life.at <= LIFECYCLE_WINDOW_MS,
    );
    if (culprit) {
      findings.push({
        pattern: `${life.kind} → request → timeout`,
        confidence: 'suggestive',
        supports: 'H5 browser lifecycle correlated with the stall (post sleep/resume/visibility) — correlation, not causation',
        at: life.at,
        detail: `${life.kind}(${life.detail ?? ''}), then ${culprit.method} ${culprit.path} timed out ${Math.round(culprit.startedAt - life.at)}ms later`,
        eventIds: [life.id, culprit.id],
      });
    }
  }

  // 4) Refresh storm — clear in-process pattern; H2 root inferred → 'strong'.
  const refreshTokenPosts = input.requests
    .filter((r) => r.isAuth && r.path.includes('grant_type=refresh_token'))
    .map((r) => r.startedAt)
    .sort((a, b) => a - b);
  for (let i = 0; i < refreshTokenPosts.length; i += 1) {
    const windowCount = refreshTokenPosts.filter((t) => t >= refreshTokenPosts[i] && t - refreshTokenPosts[i] <= STORM_WINDOW_MS).length;
    if (windowCount >= STORM_THRESHOLD) {
      findings.push({
        pattern: 'refresh storm (≥3 token POSTs in 2 min)',
        confidence: 'strong',
        supports: 'H2 cookie/session persistence — refreshed session not adopted, token replayed',
        at: refreshTokenPosts[i],
        detail: `${windowCount} refresh POSTs within ${STORM_WINDOW_MS / 1000}s`,
        eventIds: [],
      });
      break;
    }
  }

  return findings;
}

// Nearest resource entry for a request: same pathname, startedAt within 1.5s.
// Both timestamps are monotonic (performance.now / entry.startTime), so the
// window is a real elapsed bound. Still ambiguous under a same-path storm (B5).
function matchResource(resources: ResourceRecord[], r: RequestRecord): ResourceRecord | null {
  const path = r.path.split('?')[0];
  let best: ResourceRecord | null = null;
  let bestDelta = Infinity;
  for (const res of resources) {
    if (res.path !== path) continue;
    const delta = Math.abs(res.startedAt - r.startedAt);
    if (delta < bestDelta && delta <= 1500) {
      best = res;
      bestDelta = delta;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Report assembly
// ---------------------------------------------------------------------------

export interface ForensicsReport {
  generatedAt: number; // wall-clock epoch ms (human-readable)
  timeOrigin: number; // epoch ms of the monotonic base — wall time of any `at` = timeOrigin + at
  enabled: boolean;
  counts: Record<string, number>;
  requests: RequestRecord[];
  authEvents: AuthEventRecord[];
  lockEvents: LockRecord[];
  lifecycle: LifecycleRecord[];
  resources: ResourceRecord[];
  envSnapshots: EnvSnapshot[];
  timeline: Array<{ at: number; kind: string; id: string; label: string }>;
  findings: Finding[];
}

export function buildReport(): ForensicsReport {
  const timeline = buildTimeline();
  return {
    generatedAt: nowWall(),
    timeOrigin: monoTimeOrigin(),
    enabled: ENABLED,
    counts: {
      requests: requests.length,
      authEvents: authEvents.length,
      lockEvents: lockEvents.length,
      lifecycle: lifecycle.length,
      resources: resources.length,
      envSnapshots: envSnapshots.length,
    },
    requests: [...requests],
    authEvents: [...authEvents],
    lockEvents: [...lockEvents],
    lifecycle: [...lifecycle],
    resources: [...resources],
    envSnapshots: [...envSnapshots],
    timeline,
    findings: correlate({ requests, lockEvents, lifecycle, authEvents, resources }),
  };
}

function buildTimeline(): Array<{ at: number; kind: string; id: string; label: string }> {
  const rows: Array<{ at: number; kind: string; id: string; label: string }> = [];
  for (const r of requests) {
    rows.push({
      at: r.startedAt,
      kind: 'request',
      id: r.id,
      label: `${r.method} ${r.path}${r.retry ? ' (retry)' : ''} → ${r.inFlight ? 'PENDING…' : r.timedOut ? 'TIMEOUT' : r.aborted ? 'ABORTED' : r.status ?? r.errorType ?? '?'}${r.durationMs != null ? ` ${Math.round(r.durationMs)}ms` : ''}`,
    });
  }
  for (const a of authEvents) rows.push({ at: a.at, kind: 'auth', id: a.id, label: `${a.event}${a.sessionExpiresAt ? ` exp=${a.sessionExpiresAt}` : ''}${a.accessTokenTail ? ` tok…${a.accessTokenTail}` : ''}` });
  for (const l of lockEvents) rows.push({ at: l.at, kind: 'lock', id: l.id, label: `lock:${l.phase}${l.waitMs != null ? ` wait=${l.waitMs}ms` : ''}${l.holdMs != null ? ` hold=${l.holdMs}ms` : ''}` });
  for (const li of lifecycle) rows.push({ at: li.at, kind: 'lifecycle', id: li.id, label: `${li.kind}${li.detail ? `(${li.detail})` : ''}` });
  rows.sort((a, b) => a.at - b.at);
  return rows;
}

// ---------------------------------------------------------------------------
// Installation (browser only, idempotent)
// ---------------------------------------------------------------------------

let installed = false;

export function installForensics(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  installLifecycleListeners();
  installResourceObserver();

  const w = window as Window & {
    __authDebugReport?: () => ForensicsReport;
    __authDebugDownload?: () => void;
    __authForensicsEnable?: () => string;
  };
  w.__authDebugReport = () => buildReport();
  w.__authDebugDownload = () => downloadReport();
  w.__authForensicsEnable = () => {
    ENABLED = true;
    installLifecycleListeners();
    installResourceObserver();
    return 'auth forensics enabled — reproduce the stall, then window.__authDebugReport()';
  };
}

let lifecycleInstalled = false;
function installLifecycleListeners(): void {
  if (lifecycleInstalled || typeof window === 'undefined') return;
  lifecycleInstalled = true;
  const vis = () => recordLifecycle('visibilitychange', typeof document !== 'undefined' ? document.visibilityState : null);
  window.addEventListener('visibilitychange', vis);
  window.addEventListener('pageshow', () => recordLifecycle('pageshow', null));
  window.addEventListener('pagehide', () => recordLifecycle('pagehide', null));
  window.addEventListener('online', () => recordLifecycle('online', null));
  window.addEventListener('offline', () => recordLifecycle('offline', null));
  window.addEventListener('focus', () => recordLifecycle('focus', null));
  window.addEventListener('blur', () => recordLifecycle('blur', null));
  // Page Lifecycle API (Chrome): freeze/resume around tab discard/restore.
  document.addEventListener('freeze', () => recordLifecycle('freeze', null));
  document.addEventListener('resume', () => recordLifecycle('resume', null));
}

let observerInstalled = false;
function installResourceObserver(): void {
  if (observerInstalled || typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;
  observerInstalled = true;
  try {
    const obs = new PerformanceObserver((list) => {
      if (!ENABLED) return;
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceResourceTiming;
        if (typeof e.name !== 'string' || !e.name.includes('/auth/v1/')) continue;
        push(resources, deriveResourceMetrics(e as unknown as ResourceTimingLike));
      }
    });
    obs.observe({ type: 'resource', buffered: true });
  } catch {
    // PerformanceObserver 'resource' unsupported — recorded as absence in the report.
  }
}

function downloadReport(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([JSON.stringify(buildReport(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auth-forensics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function __resetForensicsForTests(): void {
  requests.length = 0;
  authEvents.length = 0;
  lockEvents.length = 0;
  lifecycle.length = 0;
  resources.length = 0;
  envSnapshots.length = 0;
  seq = 0;
}
