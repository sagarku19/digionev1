'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Link2, Send } from 'lucide-react';
import { SectionShell } from '@/src/components/marketing/Ledger';

const INPUT =
  'w-full px-3.5 py-2.5 rounded-lg border border-black/[0.1] bg-white text-[13px] font-medium text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all';

const MICRO_LABEL = 'font-ledger text-[9px] tracking-[0.16em] text-black/35 uppercase';

const APPEAR = 'animate-[fadeUp_0.45s_cubic-bezier(0.16,1,0.3,1)_both]';

const LiveDot = () => (
  <span className="relative flex w-1.5 h-1.5">
    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
  </span>
);

export default function Playground() {
  return (
    <SectionShell
      index="04"
      route="/dashboard/autodm · /dashboard/links"
      title={
        <>
          Don&apos;t take our word.{' '}
          <span className="text-[#E83A2E]">Play with it.</span>
        </>
      }
      sub="Two of DigiOne's engines, running right here in your browser — no signup, no backend, nothing saved. Post a fake comment, mint a fake link, watch the machinery move."
      tone="white"
    >
      <div className="mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-2 border-y border-black/[0.06] divide-y lg:divide-y-0 lg:divide-x divide-black/[0.06]">
        <AutoDmSim />
        <ShortLinkSim />
      </div>
    </SectionShell>
  );
}

/* ---------- Auto DM simulator ---------- */

type LogTone = 'muted' | 'match' | 'sent';
type LogLine = { text: string; tone: LogTone };

const KEYWORDS = ['LINK', 'PRICE', 'GUIDE'];

const LOG_TONE: Record<LogTone, string> = {
  muted: 'text-black/40',
  match: 'text-[#E83A2E]',
  sent: 'text-emerald-700',
};

function AutoDmSim() {
  const [keyword, setKeyword] = useState('LINK');
  const [draft, setDraft] = useState("where's the link?");
  const [posted, setPosted] = useState<string | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [dmSent, setDmSent] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const post = () => {
    const text = draft.trim();
    if (!text || running) return;
    timers.current.forEach(clearTimeout);
    timers.current.length = 0;
    setPosted(text);
    setLog([]);
    setDmSent(false);
    setRunning(true);

    const matched = text.toLowerCase().includes(keyword.toLowerCase());
    schedule(() => setLog((l) => [...l, { text: '>> comment received', tone: 'muted' }]), 250);
    schedule(
      () =>
        setLog((l) => [
          ...l,
          matched
            ? { text: `>> keyword "${keyword.toLowerCase()}" matched`, tone: 'match' }
            : { text: '>> no keyword match — ignored', tone: 'muted' },
        ]),
      900
    );
    if (!matched) {
      schedule(() => setRunning(false), 950);
      return;
    }
    schedule(() => setLog((l) => [...l, { text: '>> dm queued', tone: 'muted' }]), 1500);
    schedule(() => {
      setLog((l) => [...l, { text: '>> dm sent · 0.4s', tone: 'sent' }]);
      setDmSent(true);
      setSentCount((c) => c + 1);
      setRunning(false);
    }, 2150);
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="font-ledger text-[11px] tracking-[0.04em]">
          <span className="text-[#E83A2E] font-semibold">{'>>'}</span>{' '}
          <span className="text-black/55">playground / auto-dm</span>
        </p>
        <p className="font-ledger text-[10px] text-black/35 inline-flex items-center gap-2">
          <LiveDot />
          dms sent · {sentCount}
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-black/[0.06] bg-[#FAF8F6] px-3.5 py-3">
        <p className={MICRO_LABEL}>Rule</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 font-ledger text-[10.5px] text-black/55">
          IF comment contains
          {KEYWORDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKeyword(k)}
              className={`px-2 py-0.5 rounded border text-[10px] font-medium transition-colors duration-200 ${
                keyword === k
                  ? 'bg-[#16130F] border-[#16130F] text-white'
                  : 'bg-white border-black/[0.1] text-[#16130F] hover:border-black/[0.25]'
              }`}
            >
              {k}
            </button>
          ))}
          → reply with your link
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-black/[0.08] bg-white overflow-hidden">
        <div className="min-h-[210px] px-4 py-3.5 space-y-2.5">
          {!posted && (
            <p className="font-ledger text-[10.5px] text-black/30 pt-16 text-center">
              post a comment below to trigger the rule
            </p>
          )}

          {posted && (
            <div className={`flex items-start gap-2.5 ${APPEAR}`}>
              <span className="w-6 h-6 rounded-full bg-[#FAF8F6] border border-black/[0.08] flex items-center justify-center font-ledger text-[9px] text-[#16130F] shrink-0">
                F
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] text-[#16130F] leading-snug">
                  <span className="font-bold">@demo.fan</span> {posted}
                </p>
                <p className="font-ledger text-[9px] text-black/30 mt-0.5">just now</p>
              </div>
            </div>
          )}

          {log.length > 0 && (
            <div className="space-y-1 pl-[34px]">
              {log.map((line, i) => (
                <p key={i} className={`font-ledger text-[10.5px] ${LOG_TONE[line.tone]} ${APPEAR}`}>
                  {line.text}
                </p>
              ))}
            </div>
          )}

          {dmSent && (
            <div className={`pt-1 ${APPEAR}`}>
              <p className={`${MICRO_LABEL} mb-1.5`}>Direct message</p>
              <div className="flex justify-start">
                <div className="bg-[#16130F] text-white text-[12px] font-medium px-3.5 py-2.5 rounded-xl rounded-bl-sm max-w-[240px] leading-snug">
                  Here you go →{' '}
                  <span className="font-ledger text-[11px] text-[#FF6B5C]">digi.one/s/guide</span>
                </div>
              </div>
              <p className="font-ledger text-[9px] text-black/30 mt-1.5">sent · auto</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-black/[0.06] bg-[#FAF8F6] px-3 py-2.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') post();
            }}
            placeholder="comment as @demo.fan…"
            className={INPUT}
          />
          <button
            type="button"
            onClick={post}
            disabled={running || !draft.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#16130F] hover:bg-black disabled:opacity-40 disabled:hover:bg-[#16130F] text-white font-semibold text-[13px] transition-colors duration-200 shrink-0"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={1.8} />
            Post
          </button>
        </div>
      </div>

      <p className="mt-3 font-ledger text-[10px] text-black/35 tracking-[0.06em]">
        the same pipeline ships in /dashboard/autodm
      </p>
    </div>
  );
}

/* ---------- Short link simulator ---------- */

const DEST_URL =
  'https://yourstore.in/products/preset-pack-vol-3?utm_source=instagram&utm_medium=bio&utm_campaign=july-drop';

const SPLIT: [string, number][] = [
  ['instagram', 0.58],
  ['telegram', 0.21],
  ['whatsapp', 0.13],
  ['direct', 0.08],
];

function ShortLinkSim() {
  const [url, setUrl] = useState(DEST_URL);
  const [code, setCode] = useState('july-drop');
  const [live, setLive] = useState<string | null>(null);
  const [clicks, setClicks] = useState(0);
  const [buckets, setBuckets] = useState<number[]>(() => Array<number>(14).fill(0));
  const [copied, setCopied] = useState(false);
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticks = useRef(0);

  useEffect(
    () => () => {
      if (tickTimer.current) clearTimeout(tickTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const record = (inc: number) => {
    setClicks((c) => c + inc);
    setBuckets((b) => {
      const next = ticks.current % 3 === 0 ? [...b.slice(1), 0] : [...b];
      next[next.length - 1] += inc;
      return next;
    });
  };

  const loop = (delay: number) => {
    tickTimer.current = setTimeout(() => {
      ticks.current += 1;
      record(1 + Math.floor(Math.random() * 3));
      if (ticks.current < 200) loop(600 + Math.random() * 900);
    }, delay);
  };

  const create = () => {
    if (!url.trim().startsWith('http')) return;
    const clean = code.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'drop';
    setCode(clean);
    setLive(clean);
    setClicks(0);
    setBuckets(Array<number>(14).fill(0));
    setCopied(false);
    ticks.current = 0;
    if (tickTimer.current) clearTimeout(tickTimer.current);
    loop(800);
  };

  const copy = async () => {
    if (!live) return;
    try {
      await navigator.clipboard.writeText(`https://digi.one/s/${live}`);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const max = Math.max(...buckets, 1);

  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="font-ledger text-[11px] tracking-[0.04em]">
          <span className="text-[#E83A2E] font-semibold">{'>>'}</span>{' '}
          <span className="text-black/55">playground / short-links</span>
        </p>
        <p className="font-ledger text-[10px] text-black/35 inline-flex items-center gap-2">
          <LiveDot />
          simulator
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className={`${MICRO_LABEL} mb-1.5`}>Destination</p>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className={`${INPUT} font-ledger text-[11.5px]`} />
        </div>
        <div>
          <p className={`${MICRO_LABEL} mb-1.5`}>Short code</p>
          <div className="flex items-stretch gap-2">
            <span className="inline-flex items-center px-3 rounded-lg border border-black/[0.06] bg-[#FAF8F6] font-ledger text-[11.5px] text-black/50 shrink-0">
              digi.one/s/
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create();
              }}
              className={`${INPUT} font-ledger text-[11.5px]`}
            />
            <button
              type="button"
              onClick={create}
              disabled={!url.trim().startsWith('http')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#16130F] hover:bg-black disabled:opacity-40 disabled:hover:bg-[#16130F] text-white font-semibold text-[13px] transition-colors duration-200 shrink-0"
            >
              <Link2 className="w-3.5 h-3.5" strokeWidth={1.8} />
              Create
            </button>
          </div>
        </div>
      </div>

      {!live && (
        <div className="mt-4 rounded-xl border border-dashed border-black/[0.14] min-h-[210px] flex items-center justify-center">
          <p className="font-ledger text-[10.5px] text-black/30">your live link appears here</p>
        </div>
      )}

      {live && (
        <div className={`mt-4 rounded-xl border border-black/[0.08] overflow-hidden ${APPEAR}`}>
          <div className="flex items-center justify-between gap-3 bg-[#FAF8F6] border-b border-black/[0.06] px-4 py-3">
            <button
              type="button"
              onClick={() => {
                ticks.current += 1;
                record(1);
              }}
              title="tap to simulate a click"
              className="font-ledger text-[13px] font-semibold text-[#16130F] hover:text-[#E83A2E] transition-colors duration-200 truncate"
            >
              digi.one/s/{live}
            </button>
            <button
              type="button"
              onClick={copy}
              aria-label="Copy short link"
              className="w-8 h-8 rounded-lg border border-black/[0.1] bg-white hover:border-black/[0.25] flex items-center justify-center transition-colors duration-200 shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#16130F]" strokeWidth={1.8} />
              )}
            </button>
          </div>

          <div className="px-4 py-3.5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className={MICRO_LABEL}>Clicks</p>
                <p className="font-ledger text-[26px] font-semibold tracking-tight text-[#16130F] leading-none mt-1">
                  {clicks.toLocaleString('en-IN')}
                </p>
              </div>
              <div aria-hidden="true" className="flex items-end gap-1 h-12 flex-1 max-w-[220px]">
                {buckets.map((v, i) => (
                  <span
                    key={i}
                    style={{ height: `${v === 0 ? 6 : Math.max(12, (v / max) * 100)}%` }}
                    className={`flex-1 rounded-sm transition-[height] duration-500 ${
                      i === buckets.length - 1 ? 'bg-[#E83A2E]' : 'bg-[#16130F]/15'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-black/[0.06] grid grid-cols-4 gap-2">
              {SPLIT.map(([name, pct]) => (
                <div key={name}>
                  <p className="font-ledger text-[8.5px] tracking-[0.1em] text-black/35 uppercase truncate">{name}</p>
                  <p className="font-ledger text-[13px] font-semibold text-[#16130F] mt-0.5">
                    {Math.round(clicks * pct).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 font-ledger text-[10px] text-black/35 tracking-[0.06em]">
        simulated traffic — /dashboard/links tracks real source, geo &amp; device
      </p>
    </div>
  );
}
