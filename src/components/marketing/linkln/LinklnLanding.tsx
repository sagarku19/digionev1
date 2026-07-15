'use client';

import { useRef, useState, useEffect } from 'react';
import { Link2, Copy, Check, QrCode, Download, MousePointerClick, Loader2 } from 'lucide-react';
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

// Brand script face. Succulent isn't in next/font/google's known list, so it's
// loaded via a Google Fonts <link> (hoisted to <head> by Next) and applied inline.
const BRAND_FONT = "'Succulent', cursive";

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
    <main className="relative min-h-screen bg-white overflow-hidden flex flex-col px-6 sm:px-10 py-5 selection:bg-[#E83A2E]/15">
      {/* Brand script font (Succulent) — hoisted to <head> by Next */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Succulent&display=swap" rel="stylesheet" />

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

          {/* Floating QR card */}
          <div className="ln-float absolute -right-5 -top-5 rounded-xl border border-black/[0.08] bg-white p-2.5 shadow-[0_18px_44px_-24px_rgba(22,19,15,0.45)]">
            <QRCodeCanvas value={`https://${shortDomain}`} size={58} level="M" includeMargin={false} fgColor="#16130F" />
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

        {/* Powered by — always the last element, always still */}
        <div className="mt-6 flex justify-center">
          <a
            href={appUrl}
            className={`inline-flex items-center gap-2.5 rounded-full border border-black/[0.08] bg-[#FAF8F6] pl-3.5 pr-4 py-1.5 hover:border-black/[0.18] hover:bg-white transition-colors ${FOCUS_RING}`}
          >
            <span className="font-ledger text-[9px] tracking-[0.16em] text-black/40 uppercase">Powered by</span>
            <span aria-hidden="true" className="w-px h-3 bg-black/[0.12]" />
            <span className="text-[13.5px] font-bold tracking-tight text-[#16130F]">
              DigiOne
              <span className="font-ledger text-[8px] text-[#E83A2E] font-semibold ml-0.5 align-super">.ai</span>
            </span>
          </a>
        </div>
      </div>
    </main>
  );
}