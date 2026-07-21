'use client';

import { useRef, useState, useEffect } from 'react';
import { Link2, Copy, Check, QrCode, Download, MousePointerClick, Loader2, BarChart3, Globe, Lock, Zap, ChevronDown, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

const INPUT =
  'w-full px-4 py-3.5 rounded-lg border border-black/[0.1] bg-white text-[15px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/40 focus-visible:ring-offset-1';

const CODE_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789';
function genCode(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

const CHIPS = ['Click analytics', 'QR codes', 'Geo & device targeting', 'Password & expiry'];

// Brand script face — Cookie, self-hosted via next/font in app/layout.tsx
// (exposed as --font-wordmark), so the wordmark renders on every device.
const BRAND_FONT = "var(--font-wordmark), cursive";

const FEATURES: { icon: LucideIcon; tag: string; title: string; body: string }[] = [
  { icon: BarChart3, tag: 'analytics', title: 'Click analytics', body: 'Every tap is logged — geo, device, referrer and time. See what’s working the moment it happens.' },
  { icon: QrCode, tag: 'qr', title: 'QR codes', body: 'Every short link doubles as a crisp, downloadable QR. Print it, sticker it, ship it.' },
  { icon: Globe, tag: 'targeting', title: 'Geo & device targeting', body: 'Send India to one page and desktop to another — one link, the right destination for everyone.' },
  { icon: Lock, tag: 'control', title: 'Password & expiry', body: 'Lock a link behind a password, or auto-expire it after a set date or number of clicks.' },
  { icon: Link2, tag: 'branded', title: 'Your branded domain', body: 'Links live on linkln.me — clean, trusted and yours, not a throwaway shortener.' },
  { icon: Zap, tag: 'redirects', title: 'Smart redirects', body: 'Max-click caps, default fallbacks and rich social-preview cards, all handled for you.' },
];

const STEPS: { n: string; title: string; body: string }[] = [
  { n: '01', title: 'Paste any long link', body: 'Drop in a messy URL — UTM tags, tracking params and all.' },
  { n: '02', title: 'Get a branded link + QR', body: 'linkln.me hands back a short, on-brand link and a matching QR code.' },
  { n: '03', title: 'Watch the clicks roll in', body: 'Every click is tracked live, with geo, device and referrer breakdowns.' },
];

function CopyButton({ onCopy, copied, compact = false }: { onCopy: () => void; copied: boolean; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-black/[0.12] hover:border-black/[0.25] active:scale-[0.98] text-[#16130F] font-semibold text-[12.5px] transition-all shrink-0 ${FOCUS_RING}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : compact ? 'Copy link' : 'Copy'}
    </button>
  );
}

function ResultFooter({ createUrl }: { createUrl: string }) {
  return (
    <div className="mt-3 pt-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
      <p className="font-ledger text-[10px] text-black/40 uppercase tracking-[0.14em]">
        Preview · sign up to make it live
      </p>
      <a
        href={createUrl}
        className={`inline-flex items-center text-[13px] font-semibold text-[#E83A2E] hover:text-[#C92F24] transition-colors rounded-sm ${FOCUS_RING}`}
      >
        Create it on DigiOne
      </a>
    </div>
  );
}

export default function LinklnLanding({ appUrl, shortDomain }: { appUrl: string; shortDomain: string }) {
  const createUrl = `${appUrl.replace(/\/$/, '')}/dashboard/links`;
  const brand = shortDomain.split('.')[0];
  const tld = shortDomain.split('.').slice(1).join('.');

  const [mode, setMode] = useState<'link' | 'qr'>('link');
  const [longUrl, setLongUrl] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liveClicks, setLiveClicks] = useState(8594);
  const qrRef = useRef<HTMLDivElement>(null);

  // Ambient "live" counter — small signature touch that ties the hero to the
  // product's actual value prop (click analytics). Respects reduced motion by
  // simply not animating faster than a slow, calm tick.
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const id = setInterval(() => setLiveClicks((c) => c + Math.round(Math.random() * 3)), 2600);
    return () => clearInterval(id);
  }, []);

  const switchMode = (m: 'link' | 'qr') => {
    setMode(m);
    setResult(null);
    setErr('');
    setCopied(false);
  };

  const shorten = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const v = longUrl.trim();
    if (!v) {
      setErr('Paste a link first.');
      return;
    }
    let ok = false;
    try {
      ok = !!new URL(v.startsWith('http') ? v : `https://${v}`).host;
    } catch {
      ok = false;
    }
    if (!ok) {
      setErr('That doesn’t look like a valid URL.');
      return;
    }
    setErr('');
    setCopied(false);
    setLoading(true);
    // Small deliberate delay so the action reads as "doing work", not an
    // instant fake — mirrors the latency of the real shorten call.
    setTimeout(() => {
      setResult(`${shortDomain}/${genCode()}`);
      setLoading(false);
    }, 350);
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(`https://${result}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${(result || 'linkln').replace(/\W+/g, '-')}-qr.png`;
    a.click();
  };

  return (
    <main className="relative bg-white overflow-x-hidden selection:bg-[#E83A2E]/15">
      {/* ============================= HERO ============================= */}
      <section className="relative min-h-[100svh] flex flex-col px-6 sm:px-10 py-5">
      {/* Graph-paper field */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(22,19,15,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 0%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 0%, transparent 100%)',
        }}
      />

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes lnDash { to { stroke-dashoffset: -20; } }
          @keyframes lnFloat { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-7px); } }
          @keyframes lnFloat2 { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(6px); } }
          @keyframes lnRise { from { transform: scaleY(0.12); } to { transform: scaleY(1); } }
          @keyframes lnFadeUp { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0); } }
          .ln-dash { animation: lnDash 1.4s linear infinite; }
          .ln-float { animation: lnFloat 5s ease-in-out infinite; }
          .ln-float2 { animation: lnFloat2 6s ease-in-out infinite; }
          .ln-fadeup { animation: lnFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
          .ln-rise { animation: lnRise 0.7s cubic-bezier(0.16,1,0.3,1) var(--delay,0s) both; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ln-rise { transform: none; }
        }
      `}</style>

      <div className="relative z-10 my-auto -translate-y-3 sm:-translate-y-5 w-full max-w-5xl mx-auto flex flex-col items-center">
        {/* Logo — centered above the content, not pinned to the page corner */}
        <span className="inline-flex items-center gap-2 mt-2 sm:mt-4 mb-10 sm:mb-12">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9.5 7.5H7a4.5 4.5 0 0 0 0 9h2.5" stroke="#16130F" strokeWidth="2.1" />
            <path d="M14.5 7.5H17a4.5 4.5 0 0 1 0 9h-2.5" stroke="#16130F" strokeWidth="2.1" />
            <path d="M8.5 12h7" stroke="#E83A2E" strokeWidth="2.1" />
          </svg>
          <span className="text-[30px] leading-none text-[#16130F]" style={{ fontFamily: BRAND_FONT }}>
            {brand}
            <span className="text-[#E83A2E]">.{tld}</span>
          </span>
        </span>

        <div className="w-full grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
        {/* Left column */}
        <div className="text-center lg:text-left">
          <p className="font-ledger text-[11px] font-medium tracking-[0.14em] text-black/45 uppercase">
            <span className="text-[#E83A2E] font-semibold">{'>>'}</span>
            &nbsp;&nbsp;The link shortener by DigiOne
          </p>

          <h1 className="mt-3 text-[26px] sm:text-[38px] leading-[1.1] text-[#16130F] whitespace-nowrap" style={{ fontFamily: BRAND_FONT }}>
            Shorten. Share. Track.
          </h1>

          {/* Mode tabs */}
          <div className="mt-6 flex justify-center lg:justify-start">
            <div role="tablist" aria-label="Result type" className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-[#FAF8F6] p-1">
              {([['link', 'Short link', Link2], ['qr', 'QR Code', QrCode]] as const).map(([m, label, Icon]) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${FOCUS_RING} ${
                    mode === m ? 'bg-[#16130F] text-white' : 'text-black/50 hover:text-[#16130F]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Shortener + result — fixed-height stage so the result card never
              pushes the chips / powered-by row below it. The space is
              reserved up front, generously sized for the tallest state
              (stacked QR result on mobile). */}
          <div className="mt-4 min-h-[300px] sm:min-h-[236px]">
          <form onSubmit={shorten} className="flex flex-col sm:flex-row gap-3 text-left" noValidate>
            <input
              value={longUrl}
              onChange={(e) => {
                setLongUrl(e.target.value);
                setErr('');
              }}
              placeholder={mode === 'qr' ? 'Paste a link to turn into a QR code…' : 'Paste a long link here…'}
              className={INPUT}
              aria-label="Link to shorten"
              aria-invalid={!!err}
              autoComplete="off"
              spellCheck={false}
              inputMode="url"
            />
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#E83A2E] hover:bg-[#C92F24] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait text-white font-semibold text-[14px] transition-all duration-200 shrink-0 ${FOCUS_RING}`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'qr' ? (
                <QrCode className="w-4 h-4" />
              ) : null}
              {loading ? 'Working…' : mode === 'qr' ? 'Create QR' : 'Shorten'}
            </button>
          </form>

          {err && (
            <div
              role="alert"
              aria-live="polite"
              className="mt-3 flex items-center gap-2 px-4 py-3 rounded-lg bg-[#E83A2E]/[0.06] border border-[#E83A2E]/15 text-[13px] text-[#E83A2E] font-medium text-left"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] shrink-0" /> {err}
            </div>
          )}

          {result && mode === 'link' && (
            <div className="mt-3 rounded-lg border border-black/[0.08] bg-[#FAF8F6] p-3.5 text-left animate-[lnFadeUp_0.4s_ease-out_both]">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-md bg-[#16130F] text-white flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-ledger text-[15px] font-semibold text-[#16130F] truncate">{result}</p>
                  <p className="text-[12px] text-black/40 truncate">{longUrl}</p>
                </div>
                <CopyButton onCopy={copy} copied={copied} />
              </div>
              <ResultFooter createUrl={createUrl} />
            </div>
          )}

          {result && mode === 'qr' && (
            <div className="mt-3 rounded-lg border border-black/[0.08] bg-[#FAF8F6] p-3.5 text-left animate-[lnFadeUp_0.4s_ease-out_both]">
              <div className="flex items-center gap-3.5">
                <div ref={qrRef} className="rounded-lg bg-white border border-black/[0.08] p-2 shrink-0">
                  <QRCodeCanvas value={`https://${result}`} size={76} level="M" includeMargin={false} fgColor="#16130F" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-ledger text-[10px] text-black/40 uppercase tracking-[0.14em]">QR code for</p>
                  <p className="font-ledger text-[14px] font-semibold text-[#16130F] truncate mt-0.5">{result}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadQr}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#16130F] hover:bg-black active:scale-[0.98] text-white font-semibold text-[12.5px] transition-all ${FOCUS_RING}`}
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <CopyButton onCopy={copy} copied={copied} compact />
                  </div>
                </div>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-black/[0.07]">
                <ResultFooter createUrl={createUrl} />
              </div>
            </div>
          )}
          </div>
          {/* /reserved-height stage */}
        </div>
        {/* /left column */}

        {/* Right column — animated flat illustration */}
        <div className="relative hidden lg:block" aria-hidden="true">
          <div className="ln-fadeup relative rounded-2xl border border-black/[0.08] bg-white p-5 shadow-[0_30px_80px_-45px_rgba(22,19,15,0.35)]">
            {/* Shorten transform */}
            <div className="rounded-xl border border-black/[0.07] bg-[#FAF8F6] p-4">
              <p className="font-ledger text-[9px] tracking-[0.18em] text-black/35 uppercase mb-3">Shorten</p>
              <div className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-black/20 shrink-0" />
                <span className="font-ledger text-[11px] text-black/40 truncate">yourbrand.com/spring-sale-2026?utm_source=ig</span>
              </div>
              <svg viewBox="0 0 200 24" className="w-full h-5 my-1">
                <line x1="100" y1="2" x2="100" y2="20" stroke="rgba(22,19,15,0.2)" strokeWidth="1.5" strokeDasharray="4 4" className="ln-dash" />
                <path d="M96 15l4 4 4-4" fill="none" stroke="#E83A2E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex items-center gap-2 rounded-lg border border-[#E83A2E]/25 bg-white px-3 py-2">
                <span className="w-5 h-5 rounded-md bg-[#16130F] flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
                    <path d="M9.5 7.5H7a4.5 4.5 0 0 0 0 9h2.5" stroke="#fff" strokeWidth="2.4" />
                    <path d="M14.5 7.5H17a4.5 4.5 0 0 1 0 9h-2.5" stroke="#fff" strokeWidth="2.4" />
                    <path d="M8.5 12h7" stroke="#E83A2E" strokeWidth="2.4" />
                  </svg>
                </span>
                <span className="font-ledger text-[12px] font-semibold text-[#16130F]">{shortDomain}/spr1ng</span>
                <Copy className="w-3.5 h-3.5 text-black/30 ml-auto shrink-0" />
              </div>
            </div>

            {/* Analytics */}
            <div className="mt-3 rounded-xl border border-black/[0.07] bg-white p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-ledger text-[9px] tracking-[0.18em] text-black/35 uppercase">Clicks · 7d</p>
                <span className="inline-flex items-center gap-1.5 font-ledger text-[9px] font-medium text-emerald-700">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              </div>
              <p className="font-ledger text-[20px] font-semibold text-[#16130F] mb-3 tabular-nums">{liveClicks.toLocaleString()}</p>
              <div className="flex items-end gap-1.5 h-16">
                {['34%', '52%', '44%', '68%', '56%', '96%', '78%'].map((h, i) => (
                  <div key={i} className="flex-1 h-full flex items-end">
                    <div
                      className={`ln-rise w-full rounded-sm ${i === 5 ? 'bg-[#E83A2E]' : 'bg-black/[0.08]'}`}
                      style={{ height: h, transformOrigin: 'bottom', ['--delay' as string]: `${0.3 + i * 0.08}s` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QR — pinned, no card, no background */}
          <div className="absolute -right-5 -top-5">
            <QRCodeCanvas value={`https://${shortDomain}`} size={58} level="M" includeMargin={false} fgColor="#16130F" bgColor="transparent" />
          </div>

          {/* Floating click toast */}
          <div className="ln-float2 absolute -left-6 bottom-10 flex items-center gap-2.5 rounded-lg border border-black/[0.08] bg-white px-3 py-2 shadow-[0_18px_44px_-24px_rgba(22,19,15,0.45)]">
            <span className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
              <MousePointerClick className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-[#16130F] leading-tight">New click</p>
              <p className="font-ledger text-[9px] text-black/40 leading-tight">India · Mobile · just now</p>
            </div>
          </div>
        </div>
        </div>
        {/* /grid — everything below here is outside the dynamic zone and never moves */}

        {/* Feature strip — sits below the whole grid, including the illustration */}
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {CHIPS.map((c) => (
            <span key={c} className="font-ledger text-[10px] uppercase tracking-[0.12em] text-black/40">
              <span aria-hidden="true" className="mr-1.5 text-[#E83A2E]">
                ✳
              </span>
              {c}
            </span>
          ))}
        </div>

        {/* Live clicks — mobile-visible echo of the desktop illustration's
            "LIVE" badge, so small screens aren't left with zero product proof. */}
        <div className="mt-4 lg:hidden inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-[#FAF8F6] px-3.5 py-1.5">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="font-ledger text-[11px] text-black/50 tabular-nums">
            {liveClicks.toLocaleString()} clicks tracked today
          </span>
        </div>

        {/* Scroll cue — the story continues below the fold */}
        <div className="mt-8 hidden sm:flex flex-col items-center gap-1.5 text-black/30">
          <span className="font-ledger text-[9px] uppercase tracking-[0.18em]">More about {shortDomain}</span>
          <ChevronDown className="w-4 h-4 ln-float" strokeWidth={1.8} />
        </div>
      </div>
      </section>
      {/* /HERO */}

      {/* ===================== SECTION 1 · Features (dim) ===================== */}
      <section className="relative bg-[#FAF8F6]">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-14 py-16 sm:py-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="font-ledger text-[11px] font-semibold text-[#E83A2E]">{'>>'}</span>
              <span className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35">What you get</span>
              <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
              <span className="font-ledger text-[10px] uppercase tracking-[0.16em] text-black/30">/features</span>
            </div>
            <h2 className="mt-5 max-w-2xl text-[28px] sm:text-[38px] lg:text-[40px] font-bold tracking-[-0.03em] leading-[1.08] text-[#16130F]">
              Not just shorter. <span className="text-[#E83A2E]">A control panel for every link.</span>
            </h2>
            <p className="mt-3 max-w-xl text-[15px] sm:text-[16px] font-medium text-black/50 leading-relaxed">
              {shortDomain} turns one paste into a branded link, a QR code and a live analytics feed — the same short-link engine that powers DigiOne creators.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-black/[0.07]">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 60} className="h-full">
                <div className="group h-full border-r border-b border-black/[0.07] p-6 hover:bg-white transition-colors">
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <span className="w-9 h-9 rounded-lg bg-white border border-black/[0.06] flex items-center justify-center group-hover:border-[#E83A2E]/25 transition-colors">
                      <f.icon className="w-4.5 h-4.5 text-[#16130F]" strokeWidth={1.8} />
                    </span>
                    <span className="font-ledger text-[9px] uppercase tracking-[0.16em] text-black/30">{'>>'}&nbsp;{f.tag}</span>
                  </div>
                  <h3 className="text-[17px] font-bold tracking-[-0.02em] text-[#16130F]">{f.title}</h3>
                  <p className="mt-1.5 text-[14px] font-medium text-black/50 leading-relaxed">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 2 · How it works (light) ===================== */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-14 py-16 sm:py-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="font-ledger text-[11px] font-semibold text-[#E83A2E]">{'>>'}</span>
              <span className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35">How it works</span>
              <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
              <span className="font-ledger text-[10px] uppercase tracking-[0.16em] text-black/30">/three-steps</span>
            </div>
            <h2 className="mt-5 max-w-2xl text-[28px] sm:text-[38px] lg:text-[40px] font-bold tracking-[-0.03em] leading-[1.08] text-[#16130F]">
              From messy URL to tracked link. <span className="text-[#E83A2E]">In seconds.</span>
            </h2>
          </Reveal>

          <div className="relative mt-12">
            {/* connector — marching dashes reading left→right as "flow" */}
            <svg aria-hidden="true" className="hidden lg:block absolute left-0 right-0 top-6 w-full h-2" viewBox="0 0 1000 8" preserveAspectRatio="none">
              <line x1="60" y1="4" x2="940" y2="4" stroke="rgba(22,19,15,0.14)" strokeWidth="1.5" strokeDasharray="6 7" className="ln-dash" />
            </svg>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 90}>
                  <div className="relative">
                    <span className="relative z-10 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#16130F] text-white font-ledger text-[14px] font-semibold">
                      {s.n}
                    </span>
                    <h3 className="mt-4 text-[18px] font-bold tracking-[-0.02em] text-[#16130F]">{s.title}</h3>
                    <p className="mt-1.5 max-w-xs text-[14px] font-medium text-black/50 leading-relaxed">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={120}>
            <a href={createUrl} className={`group mt-12 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] transition-colors duration-200 ${FOCUS_RING}`}>
              Create your first link
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </a>
          </Reveal>
        </div>
      </section>

      {/* ===================== FOOTER · ink close ===================== */}
      <footer className="relative bg-[#16130F] text-white overflow-hidden">
        {/* graph paper on ink */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, #000 0%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, #000 0%, transparent 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 60% at 85% 0%, rgba(232,58,46,0.14) 0%, transparent 55%)' }}
        />

        <div className="relative max-w-5xl mx-auto px-6 sm:px-10 lg:px-14 py-14">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            {/* Powered by — left, borderless, prominent */}
            <a
              href={appUrl}
              aria-label="Powered by DigiOne.ai"
              className={`group flex flex-col items-start gap-2 hover:opacity-90 transition-opacity rounded-sm ${FOCUS_RING}`}
            >
              <span className="font-ledger text-[9px] tracking-[0.2em] text-white/40 uppercase">Powered by</span>
              <span className="text-[38px] sm:text-[44px] font-bold tracking-tight text-white leading-none">
                DigiOne
                <span className="font-ledger text-[16px] text-[#FF6B5C] font-semibold ml-0.5 align-super">.ai</span>
              </span>
            </a>

            {/* Brand + quick links — right of the row, left-aligned text */}
            <div>
              <span className="inline-flex items-center gap-2">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9.5 7.5H7a4.5 4.5 0 0 0 0 9h2.5" stroke="#fff" strokeWidth="2.1" />
                  <path d="M14.5 7.5H17a4.5 4.5 0 0 1 0 9h-2.5" stroke="#fff" strokeWidth="2.1" />
                  <path d="M8.5 12h7" stroke="#FF6B5C" strokeWidth="2.1" />
                </svg>
                <span className="text-[26px] leading-none text-white" style={{ fontFamily: BRAND_FONT }}>
                  {brand}
                  <span className="text-[#FF6B5C]">.{tld}</span>
                </span>
              </span>
              <p className="mt-3 max-w-xs text-[13.5px] font-medium text-white/55 leading-relaxed">
                The branded link shortener — analytics, QR codes and smart targeting built in.
              </p>
              <div className="mt-5 flex items-center gap-5">
                <a href={createUrl} className={`font-ledger text-[11px] uppercase tracking-[0.14em] text-white/55 hover:text-white transition-colors ${FOCUS_RING}`}>
                  Create a link
                </a>
                <a href={appUrl} className={`font-ledger text-[11px] uppercase tracking-[0.14em] text-white/55 hover:text-white transition-colors ${FOCUS_RING}`}>
                  All of DigiOne
                </a>
              </div>
            </div>
          </div>

          {/* Legal line */}
          <div className="mt-12 pt-6 border-t border-white/[0.09] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-ledger text-[10px] uppercase tracking-[0.16em] text-white/35">© {new Date().getFullYear()} {shortDomain}</p>
            <p className="font-ledger text-[10px] uppercase tracking-[0.16em] text-white/35">© {new Date().getFullYear()} DigiOne.ai · All rights reserved</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        shown ? 'opacity-100 translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-4'
      } ${className}`}
    >
      {children}
    </div>
  );
}