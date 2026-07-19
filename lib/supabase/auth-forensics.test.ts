import { describe, it, expect, beforeEach } from 'vitest';
import {
  correlate,
  deriveResourceMetrics,
  countOutstandingLockWaiters,
  wrapLockWithForensics,
  buildReport,
  recordRequestStart,
  recordRequestSettle,
  __resetForensicsForTests,
  type ResourceTimingLike,
  type RequestRecord,
  type LockRecord,
  type ResourceRecord,
  type LifecycleRecord,
  type Finding,
} from './auth-forensics';

// Forensics is disabled by default in the node test env (no localStorage flag),
// so record* entrypoints are no-ops. correlate()/deriveResourceMetrics() are pure
// and testable directly regardless of the enabled flag.

beforeEach(() => __resetForensicsForTests());

function req(partial: Partial<RequestRecord>): RequestRecord {
  return {
    id: 'req1', path: '/auth/v1/user', href: 'https://x.supabase.co/auth/v1/user', method: 'GET',
    isAuth: true, attempt: 1, retry: false, retryReason: null,
    startedAt: 1000, startedAtWall: 1_700_000_000_000, finishedAt: 13000, durationMs: 12000,
    inFlight: false, aborted: false, timedOut: false, status: null, errorType: null, ...partial,
  };
}

function res(partial: Partial<ResourceRecord>): ResourceRecord {
  return {
    id: 'res1', path: '/auth/v1/token', href: 'https://x/auth/v1/token', startedAt: 1000, responseEndMs: 0,
    taoRestricted: false, dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 0, downloadMs: 0, totalMs: 0,
    protocol: 'h2', reused: false, transferSize: null, responseStatus: null, ...partial,
  };
}

const noDefinitive = (findings: Finding[]) => findings.every((f) => f.confidence !== 'definitive');

describe('deriveResourceMetrics', () => {
  it('same-origin reused socket, no first byte (phases present)', () => {
    const e: ResourceTimingLike = {
      name: 'https://x.supabase.co/auth/v1/token?grant_type=refresh_token',
      startTime: 100, domainLookupStart: 100, domainLookupEnd: 100, // reused: no DNS
      connectStart: 100, connectEnd: 100, secureConnectionStart: 0, // reused: no connect
      requestStart: 100, responseStart: 0, responseEnd: 0, // never got a first byte
      nextHopProtocol: 'h2', transferSize: 0,
    };
    const m = deriveResourceMetrics(e);
    expect(m.taoRestricted).toBe(false);
    expect(m.reused).toBe(true);
    expect(m.protocol).toBe('h2');
    expect(m.ttfbMs).toBe(0);
    expect(m.startedAt).toBe(100); // monotonic passthrough of startTime
  });

  it('cross-origin without TAO → taoRestricted, reused unknown, protocol empty', () => {
    const e: ResourceTimingLike = {
      name: 'https://x.supabase.co/auth/v1/user', startTime: 100,
      domainLookupStart: 0, domainLookupEnd: 0, connectStart: 0, connectEnd: 0,
      secureConnectionStart: 0, requestStart: 0, responseStart: 0, responseEnd: 350, // completed, phases hidden
      nextHopProtocol: '',
    };
    const m = deriveResourceMetrics(e);
    expect(m.taoRestricted).toBe(true);
    expect(m.reused).toBeNull();
    expect(m.protocol).toBe('');
    expect(m.responseEndMs).toBe(350);
  });

  it('same-origin fresh connection with DNS/TCP/TLS', () => {
    const e: ResourceTimingLike = {
      name: 'https://x.supabase.co/auth/v1/user', startTime: 0,
      domainLookupStart: 0, domainLookupEnd: 50, connectStart: 50, connectEnd: 150,
      secureConnectionStart: 100, requestStart: 150, responseStart: 250, responseEnd: 260,
      nextHopProtocol: 'h2',
    };
    const m = deriveResourceMetrics(e);
    expect(m.taoRestricted).toBe(false);
    expect(m.dnsMs).toBe(50);
    expect(m.tcpMs).toBe(100);
    expect(m.tlsMs).toBe(50);
    expect(m.ttfbMs).toBe(100);
  });
});

describe('correlate — TAO awareness (the core fix)', () => {
  it('NEVER emits definitive/dead-socket from a TAO-restricted entry', () => {
    const requests = [req({ id: 'r1', path: '/auth/v1/token?grant_type=refresh_token', method: 'POST', timedOut: true, startedAt: 1000 })];
    const resources = [res({ id: 'res1', startedAt: 1000, taoRestricted: true, responseEndMs: 0, reused: null, protocol: '' })];
    const findings = correlate({ requests, resources, lockEvents: [], lifecycle: [], authEvents: [] });
    expect(noDefinitive(findings)).toBe(true);
    const f = findings.find((x) => x.pattern.includes('TAO'));
    expect(f).toBeTruthy();
    expect(f?.confidence).toBe('strong'); // "sent, no completion" — but phase not localizable
    expect(f?.supports).toContain('PHASE NOT OBSERVABLE');
    expect(f?.recommend).toContain('net-export');
  });

  it('TAO entry that DID complete → suggestive/inconclusive, not a networking conclusion', () => {
    const requests = [req({ id: 'r1', timedOut: true, startedAt: 1000 })];
    const resources = [res({ id: 'res1', path: '/auth/v1/user', startedAt: 1000, taoRestricted: true, responseEndMs: 350 })];
    const findings = correlate({ requests, resources, lockEvents: [], lifecycle: [], authEvents: [] });
    const f = findings.find((x) => x.pattern.includes('TAO'));
    expect(f?.confidence).toBe('suggestive');
    expect(noDefinitive(findings)).toBe(true);
  });

  it('timeout with NO resource entry → insufficient (not a conclusion)', () => {
    const requests = [req({ id: 'r1', timedOut: true })];
    const findings = correlate({ requests, resources: [], lockEvents: [], lifecycle: [], authEvents: [] });
    const f = findings.find((x) => x.pattern.includes('no resource-timing'));
    expect(f?.confidence).toBe('insufficient');
    expect(f?.recommend).toContain('net-export');
  });

  it('same-origin (phases available) dead-socket signature → strong (never definitive from browser)', () => {
    const requests = [req({ id: 'r1', path: '/auth/v1/token?grant_type=refresh_token', method: 'POST', timedOut: true, startedAt: 1000 })];
    const resources = [res({ id: 'res1', startedAt: 1000, taoRestricted: false, reused: true, ttfbMs: 0, protocol: 'h2' })];
    const findings = correlate({ requests, resources, lockEvents: [], lifecycle: [], authEvents: [] });
    const f = findings.find((x) => x.supports.includes('H1'));
    expect(f?.confidence).toBe('strong');
    expect(noDefinitive(findings)).toBe(true);
  });
});

describe('correlate — in-flight + lock + storm', () => {
  it('an in-flight request is surfaced at capture time', () => {
    const requests = [req({ id: 'r1', inFlight: true, finishedAt: null, durationMs: null })];
    const findings = correlate({ requests, resources: [], lockEvents: [], lifecycle: [], authEvents: [] });
    expect(findings.some((f) => f.pattern === 'request in-flight at capture')).toBe(true);
  });

  it('lock-timeout with no overlapping request → strong, lock/storage (not networking)', () => {
    const lockEvents: LockRecord[] = [{ id: 'l1', phase: 'timeout', name: 'lock:sb', at: 6000, waitMs: 5000, holdMs: null, caller: null }];
    const findings = correlate({ requests: [], resources: [], lockEvents, lifecycle: [], authEvents: [] });
    const f = findings.find((x) => x.pattern.includes('WITHOUT any network'));
    expect(f?.confidence).toBe('strong');
    expect(f?.supports).toContain('H3');
    expect(noDefinitive(findings)).toBe(true);
  });

  it('lock-timeout WITH an overlapping in-flight auth request → networking', () => {
    const lockEvents: LockRecord[] = [{ id: 'l1', phase: 'timeout', name: 'lock:sb', at: 6000, waitMs: 5000, holdMs: null, caller: null }];
    const requests = [req({ id: 'r1', startedAt: 900, finishedAt: null, inFlight: true, path: '/auth/v1/token?grant_type=refresh_token' })];
    const findings = correlate({ requests, resources: [], lockEvents, lifecycle: [], authEvents: [] });
    expect(findings.some((f) => f.pattern.includes('WITH in-flight'))).toBe(true);
  });

  it('lifecycle event shortly before a timeout is flagged (suggestive)', () => {
    const lifecycle: LifecycleRecord[] = [{ id: 'life1', kind: 'visibilitychange', at: 1000, detail: 'visible' }];
    const requests = [req({ id: 'r1', startedAt: 3000, timedOut: true })];
    const findings = correlate({ requests, resources: [], lockEvents: [], lifecycle, authEvents: [] });
    const f = findings.find((x) => x.pattern.startsWith('visibilitychange →'));
    expect(f?.confidence).toBe('suggestive');
  });

  it('≥3 refresh POSTs within 2 minutes → strong H2 (replay storm)', () => {
    const requests = [0, 13_000, 26_000].map((t, i) =>
      req({ id: `r${i}`, path: '/auth/v1/token?grant_type=refresh_token', method: 'POST', startedAt: t, timedOut: false }),
    );
    const findings = correlate({ requests, resources: [], lockEvents: [], lifecycle: [], authEvents: [] });
    const f = findings.find((x) => x.pattern.includes('refresh storm'));
    expect(f?.confidence).toBe('strong');
  });
});

describe('countOutstandingLockWaiters', () => {
  it('counts requested-without-terminal', () => {
    const events: LockRecord[] = [
      { id: 'a', phase: 'requested', name: 'l', at: 1, waitMs: null, holdMs: null, caller: null },
      { id: 'a', phase: 'granted', name: 'l', at: 2, waitMs: 1, holdMs: null, caller: null },
      { id: 'a', phase: 'released', name: 'l', at: 3, waitMs: 1, holdMs: 1, caller: null },
      { id: 'b', phase: 'requested', name: 'l', at: 2, waitMs: null, holdMs: null, caller: null }, // still waiting
    ];
    expect(countOutstandingLockWaiters(events)).toBe(1);
  });
});

describe('disabled by default = zero behavior change', () => {
  it('record start/settle are no-ops and the wrapped lock delegates identically', async () => {
    const id = recordRequestStart({ href: 'https://x/auth/v1/user', method: 'GET', attempt: 1, retry: false, retryReason: null });
    expect(id).toBe(''); // disabled → empty id
    recordRequestSettle(id, { aborted: false, timedOut: false, status: 200, errorType: null });
    const report = buildReport();
    expect(report.enabled).toBe(false);
    expect(report.counts.requests).toBe(0);
    expect(typeof report.timeOrigin).toBe('number');

    const lock = wrapLockWithForensics(async (_n, _t, fn) => fn());
    await expect(lock('lock:sb', 5000, async () => 'value')).resolves.toBe('value');

    const err = Object.assign(new Error('acquire'), { isAcquireTimeout: true });
    const throwing = wrapLockWithForensics(async () => { throw err; });
    await expect(throwing('lock:sb', 5000, async () => 'x')).rejects.toBe(err);
  });
});
