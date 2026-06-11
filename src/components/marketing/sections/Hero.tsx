"use client";

import Link from 'next/link';
import { ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { useAuthSession } from '@/hooks/useAuthSession';

const PLATFORM_LOGOS = ["YouTube", "Instagram", "Spotify", "Substack", "Teachable", "Notion", "Twitter", "Patreon", "WhatsApp", "Gumroad"];

const TRUST_STATS = [
  {
    value: "₹4.2 Cr+",
    label: "earned by creators",
    bars: ["bg-[#E83A2E]/20", "bg-[#E83A2E]/40", "bg-[#E83A2E]/25", "bg-[#E83A2E]"],
  },
  {
    value: "12,400+",
    label: "products sold securely",
    bars: ["bg-violet-200", "bg-violet-300", "bg-violet-400", "bg-violet-500"],
  },
  {
    value: "99.9%",
    label: "uptime SLA",
    bars: ["bg-emerald-200", "bg-emerald-300", "bg-emerald-300", "bg-emerald-500"],
  },
];

const SPARK_HEIGHTS = ["40%", "60%", "50%", "100%"];

export default function Hero() {
  const { isLoggedIn } = useAuthSession();

  return (
    <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden bg-white selection:bg-[#E83A2E]/20">

      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60 sm:opacity-100">
        {/* Blob 1 — red, top-center */}
        <div
          className="absolute rounded-full"
          style={{
            top: '-10%', left: '50%', transform: 'translateX(-50%)',
            width: '900px', height: '600px',
            background: 'radial-gradient(ellipse at center, rgba(232,58,46,0.48) 0%, rgba(255,120,80,0.22) 50%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'blobA 12s ease-in-out infinite',
            willChange: 'transform',
          }}
        />
        {/* Blob 2 — orange, top-right */}
        <div
          className="absolute rounded-full"
          style={{
            top: '-5%', right: '-5%',
            width: '600px', height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(251,146,60,0.40) 0%, transparent 65%)',
            filter: 'blur(40px)',
            animation: 'blobB 17s ease-in-out infinite',
            willChange: 'transform',
          }}
        />
        {/* Blob 3 — violet, top-left */}
        <div
          className="absolute rounded-full"
          style={{
            top: '0%', left: '-5%',
            width: '550px', height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.34) 0%, transparent 65%)',
            filter: 'blur(45px)',
            animation: 'blobC 20s ease-in-out infinite',
            willChange: 'transform',
          }}
        />
        {/* Blob 4 — indigo, bottom-right */}
        <div className="hidden sm:block">
          <div
            className="absolute rounded-full"
            style={{
              bottom: '0%', right: '10%',
              width: '500px', height: '400px',
              background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.30) 0%, transparent 65%)',
              filter: 'blur(50px)',
              animation: 'blobD 14s ease-in-out infinite',
              willChange: 'transform',
            }}
          />
        </div>
        {/* Blob 5 — amber, bottom-left */}
        <div className="hidden sm:block">
          <div
            className="absolute rounded-full"
            style={{
              bottom: '0%', left: '10%',
              width: '480px', height: '380px',
              background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.30) 0%, transparent 65%)',
              filter: 'blur(45px)',
              animation: 'blobE 22s ease-in-out infinite',
              willChange: 'transform',
            }}
          />
        </div>
        {/* Dot grid — fades in from top, holds through center, fades to bottom */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 12%, rgba(0,0,0,0.5) 75%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 12%, rgba(0,0,0,0.5) 75%, transparent 100%)',
          }}
        />
        {/* Grain texture — adds tactile depth over the blob mesh */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.025] sm:opacity-[0.045]" xmlns="http://www.w3.org/2000/svg">
          <filter id="hero-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.70" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hero-grain)" />
        </svg>
      </div>

      <style>{`
        @keyframes blobA {
          0%, 100% { transform: translateX(-50%) translateY(0px) scale(1); }
          33%  { transform: translateX(-52%) translateY(-35px) scale(1.07); }
          66%  { transform: translateX(-48%) translateY(-15px) scale(1.03); }
        }
        @keyframes blobB {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          40%  { transform: translateY(30px) translateX(-20px) scale(1.09); }
          75%  { transform: translateY(10px) translateX(10px) scale(1.04); }
        }
        @keyframes blobC {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          30%  { transform: translateY(-25px) translateX(15px) scale(1.05); }
          70%  { transform: translateY(15px) translateX(-10px) scale(1.08); }
        }
        @keyframes blobD {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50%  { transform: translateY(-30px) translateX(-20px) scale(1.10); }
        }
        @keyframes blobE {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          45%  { transform: translateY(-20px) translateX(25px) scale(1.06); }
          80%  { transform: translateY(10px) translateX(-10px) scale(0.97); }
        }
        @keyframes floatCard1 {
          0%, 100% { transform: rotate(-6deg) translateY(0px); }
          50% { transform: rotate(-6deg) translateY(-10px); }
        }
        @keyframes floatCard2 {
          0%, 100% { transform: rotate(5deg) translateY(0px); }
          50% { transform: rotate(5deg) translateY(-14px); }
        }
        @keyframes floatCard3 {
          0%, 100% { transform: rotate(-4deg) translateY(0px); }
          50% { transform: rotate(-4deg) translateY(-8px); }
        }
        @keyframes floatCard4 {
          0%, 100% { transform: rotate(7deg) translateY(0px); }
          50% { transform: rotate(7deg) translateY(-12px); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashFlow {
          to { stroke-dashoffset: -12; }
        }
      `}</style>

      {/* Content */}
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 flex flex-col items-center text-center z-10">

        <div
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white border border-black/8 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.10)] text-[11px] sm:text-[13px] font-semibold text-gray-600 mb-5 sm:mb-12"
          style={{ animation: 'heroFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          {/* <span className="flex items-center gap-0.5 text-amber-400">
            {[...Array(3)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />)}
          </span> */}
          <span>Trusted by <strong className="text-gray-900">10,000+</strong> Indian creators</span>
          <span className="w-px h-3 sm:h-3.5 bg-black/10" />
          <span className="flex items-center gap-1 text-[#E83A2E] font-bold">
            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" /> Live
          </span>
        </div>

        <div
          className="mb-5 sm:mb-10"
          style={{ animation: 'heroFadeUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.06s both' }}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:gap-x-0">
            {['Digital Product', 'Automation Flow', 'AI Tools', 'No-Code Website'].map((tag, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <span className="hidden sm:inline mx-4 text-gray-300 text-[22px] font-light select-none">|</span>}
                <span className="text-[11px] sm:text-[17px] font-bold tracking-wide text-gray-900 uppercase">{tag}</span>
              </span>
            ))}
          </div>
        </div>

        <h1
          className="text-[32px] min-[480px]:text-[42px] sm:text-[68px] md:text-[82px] lg:text-[96px] font-black tracking-[-0.04em] leading-[1.05] max-w-4xl"
          style={{ animation: 'heroFadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.12s both' }}
        >
          <span className="text-gray-500">Setup in minutes.</span>
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #E83A2E 0%, #ff7043 50%, #E83A2E 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 4s linear infinite',
            }}
          >
            Sell on autopilot.
          </span>
        </h1>

        <p
          className="mt-6 sm:mt-10 text-[14px] sm:text-[20px] font-medium text-gray-500 max-w-2xl leading-relaxed px-4 sm:px-0"
          style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.18s both' }}
        >
          The only platform that turns your audience into automated income. No coding, no complicated setups — just results.
        </p>

        <div
          className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto px-4 sm:px-0"
          style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.26s both' }}
        >
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto group px-8 py-4 rounded-2xl bg-[#E83A2E] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_24px_-4px_rgba(232,58,46,0.35)] hover:shadow-[0_14px_32px_-4px_rgba(232,58,46,0.45)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Go to your dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
              <Link
                href="/contact-team"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-black/10 bg-white text-gray-700 font-bold text-[15px] flex items-center justify-center gap-2 hover:border-black/20 hover:bg-gray-50 transition-all duration-300"
              >
                Contact the team
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="w-full sm:w-auto group px-8 py-4 rounded-2xl bg-[#E83A2E] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_24px_-4px_rgba(232,58,46,0.35)] hover:shadow-[0_14px_32px_-4px_rgba(232,58,46,0.45)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Start building free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
              <Link
                href="/invite"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-black/10 bg-white text-gray-700 font-bold text-[15px] flex items-center justify-center gap-2 hover:border-black/20 hover:bg-gray-50 transition-all duration-300"
              >
                Request an invite
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>

        <div className="mt-8 sm:hidden flex items-center gap-3 justify-center">
          <div className="flex -space-x-2">
            {['#E83A2E', '#8b5cf6', '#10b981', '#f59e0b'].map((c, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-white shadow-sm" style={{ background: `linear-gradient(135deg, ${c}, ${c}99)` }} />
            ))}
          </div>
          <p className="text-[12px] text-gray-500 font-medium">
            <strong className="text-gray-900">1,200+</strong> creators joined this week
          </p>
        </div>

        {/* Dashboard product shot */}
        <div
          aria-hidden="true"
          className="relative w-full max-w-5xl mx-auto mt-12 sm:mt-20 mb-4 sm:mb-8"
          style={{ animation: 'heroFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.34s both' }}
        >
          {/* Floating cards disabled for now — flip `false` to re-enable */}
          {false && (<>
          {/* Floating card — purchase (left corner) */}
          <div
            className="hidden xl:block absolute -left-28 top-1/3 z-20"
            style={{ animation: 'floatCard1 7s ease-in-out infinite' }}
          >
            <div className="bg-white border border-black/[0.07] rounded-2xl px-4 py-3.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.14)] w-[220px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E83A2E] to-orange-400 flex items-center justify-center shrink-0 text-lg leading-none">🧑</div>
                <div>
                  <p className="text-[10px] font-black text-gray-900 leading-none">Arjun Sharma</p>
                  <p className="text-[9px] text-gray-400 leading-none mt-0.5">just purchased</p>
                </div>
                <span className="ml-auto text-[9px] font-bold text-gray-400">2s ago</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                <span className="text-[11px] font-bold text-gray-700">Masterclass Course</span>
                <span className="text-[11px] font-black text-emerald-600">₹999</span>
              </div>
            </div>
          </div>

          {/* Floating card — revenue (top-right corner) */}
          <div
            className="hidden xl:block absolute -right-28 -top-10 z-20"
            style={{ animation: 'floatCard2 9s ease-in-out infinite' }}
          >
            <div className="bg-white border border-black/[0.07] rounded-2xl px-4 py-4 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.16)] w-52.5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">+24% today</span>
              </div>
              <p className="text-[10px] font-semibold text-gray-400 leading-none mb-1">Revenue today</p>
              <p className="text-[22px] font-black text-gray-900 leading-none tracking-tight">₹38,240</p>
              <div className="mt-2.5 h-1 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full w-[72%] rounded-full bg-linear-to-r from-violet-400 to-indigo-500" />
              </div>
            </div>
          </div>

          {/* Floating card — auto DMs (bottom-right corner) */}
          <div
            className="hidden xl:block absolute -right-20 bottom-24 z-20"
            style={{ animation: 'floatCard3 11s ease-in-out infinite' }}
          >
            <div className="bg-white border border-black/[0.07] rounded-2xl px-4 py-3.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.14)] flex items-center gap-3 w-[210px]">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E83A2E] to-orange-400 flex items-center justify-center shadow-sm shrink-0">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-400 leading-none mb-1">Auto DMs sent</p>
                <p className="text-[16px] font-black text-gray-900 leading-none">3,821</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-black text-green-600">Live</span>
              </div>
            </div>
          </div>
          </>)}

<div className="relative flex items-end">

  {/* ============ Phone — storefront product page (md+) ============ */}
  <div className="hidden md:block w-[260px] lg:w-[292px] shrink-0 relative z-20">
    {/* Device frame — dark titanium body with side buttons */}
    <div className="relative rounded-[3rem] bg-gray-900 p-[5px] shadow-[0_24px_70px_-24px_rgba(0,0,0,0.35),0_8px_24px_-8px_rgba(0,0,0,0.2)]">
      {/* Side buttons */}
      <div className="absolute -left-[2px] top-24 w-[3px] h-7 rounded-l bg-gray-700" />
      <div className="absolute -left-[2px] top-36 w-[3px] h-12 rounded-l bg-gray-700" />
      <div className="absolute -left-[2px] top-52 w-[3px] h-12 rounded-l bg-gray-700" />
      <div className="absolute -right-[2px] top-32 w-[3px] h-16 rounded-r bg-gray-700" />

      {/* Screen */}
      <div className="relative rounded-[2.65rem] bg-white overflow-hidden text-left">
        {/* Status bar + Dynamic Island */}
        <div className="relative flex items-center justify-between px-7 pt-3.5 pb-1">
          <span className="text-[10px] font-bold text-gray-900 tracking-tight">9:41</span>
          <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-[88px] h-[26px] rounded-full bg-black flex items-center justify-end pr-2.5">
            <div className="w-2 h-2 rounded-full bg-gray-800 ring-1 ring-gray-700/60" />
          </div>
          <div className="flex items-center gap-1">
            {/* Signal */}
            <div className="flex items-end gap-[1.5px]">
              <span className="w-[2.5px] h-[4px] rounded-[1px] bg-gray-900" />
              <span className="w-[2.5px] h-[6px] rounded-[1px] bg-gray-900" />
              <span className="w-[2.5px] h-[8px] rounded-[1px] bg-gray-900" />
              <span className="w-[2.5px] h-[10px] rounded-[1px] bg-gray-300" />
            </div>
            {/* Battery */}
            <div className="ml-1 flex items-center">
              <div className="w-[18px] h-[9px] rounded-[3px] border border-gray-400 p-[1.5px]">
                <div className="h-full w-3/4 rounded-[1px] bg-gray-900" />
              </div>
              <div className="w-[1.5px] h-[4px] rounded-r bg-gray-400 ml-[1px]" />
            </div>
          </div>
        </div>

        {/* App nav bar */}
        <div className="flex items-center justify-between px-5 pt-2 pb-2.5 border-b border-black/[0.05]">
          <span className="text-[12px] text-gray-400">‹</span>
          <span className="text-[9px] font-bold text-gray-500 tracking-tight">digione.ai/arjun</span>
          <span className="text-[12px] text-gray-400">⋯</span>
        </div>

        <div className="px-4 lg:px-5 pb-6 pt-3.5">
          {/* Product cover */}
          <div className="relative h-36 lg:h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-[#E83A2E] via-[#F0512F] to-orange-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:22px_22px]" />
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
            <span className="absolute top-2.5 left-2.5 text-[8px] font-black tracking-wider text-white bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2 py-0.5">BESTSELLER</span>
            <span className="absolute top-2.5 right-2.5 text-[8px] font-black text-white/90 bg-black/25 backdrop-blur-sm rounded-full px-2 py-0.5">▶ 6h 20m</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.25)] flex items-center justify-center">
                <span className="block w-0 h-0 border-l-[12px] border-l-[#E83A2E] border-y-[8px] border-y-transparent ml-1" />
              </div>
            </div>
            {/* Progress strip */}
            <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/20">
              <div className="h-full w-1/3 bg-white/90" />
            </div>
          </div>

          {/* Rating row */}
          <div className="mt-3.5 flex items-center gap-1.5">
            <span className="text-[10px] text-amber-400 tracking-tight leading-none">★★★★★</span>
            <span className="text-[9px] font-black text-gray-900">4.9</span>
            <span className="text-[8px] text-gray-400">(1,213)</span>
            <span className="ml-auto text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">⚡ Instant access</span>
          </div>

          {/* Title + creator */}
          <p className="mt-2 text-[15px] lg:text-[16px] font-black text-gray-900 leading-tight">Design Masterclass — Figma to Freelance</p>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="relative w-5 h-5 rounded-full bg-gradient-to-br from-[#E83A2E] to-orange-400 shrink-0 ring-2 ring-white shadow-sm flex items-center justify-center">
              <span className="text-[7px] font-black text-white">A</span>
            </div>
            <span className="text-[9px] font-bold text-gray-500">Arjun Mehta</span>
            <span className="text-[8px] font-black text-white bg-sky-500 rounded-full w-3 h-3 flex items-center justify-center leading-none">✓</span>
          </div>

          {/* What's included */}
          <div className="mt-3.5 grid grid-cols-3 gap-1.5">
            {[
              { icon: '▶', label: '42 lessons' },
              { icon: '⬇', label: '12 files' },
              { icon: '∞', label: 'Lifetime' },
            ].map((f, i) => (
              <div key={i} className="bg-gray-50 border border-black/[0.05] rounded-lg px-2 py-1.5 text-center">
                <p className="text-[9px] text-gray-900 leading-none">{f.icon}</p>
                <p className="text-[7px] font-bold text-gray-500 mt-1">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Description skeleton */}
          <div className="mt-3.5 space-y-1.5">
            <div className="sk-shimmer h-1.5 w-full rounded-full" />
            <div className="sk-shimmer h-1.5 w-5/6 rounded-full" />
            <div className="sk-shimmer h-1.5 w-3/5 rounded-full" />
          </div>

          {/* Price row */}
          <div className="mt-4 flex items-end gap-2">
            <span className="text-[24px] font-black text-gray-900 leading-none tracking-tight">₹999</span>
            <span className="text-[12px] font-bold text-gray-300 line-through leading-none">₹1,999</span>
            <span className="ml-auto text-[8px] font-black text-[#E83A2E] bg-[#E83A2E]/[0.07] border border-[#E83A2E]/15 rounded-full px-2 py-0.5">50% OFF</span>
          </div>

          {/* Buy button */}
          <div className="mt-3.5 h-11 rounded-xl bg-gradient-to-b from-[#F0432F] to-[#E83A2E] shadow-[0_8px_20px_-6px_rgba(232,58,46,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            <span className="text-[12px] font-black text-white tracking-wide">Buy now</span>
            <span className="text-[11px] text-white/80">→</span>
          </div>

          {/* Trust row */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            <div className="flex -space-x-1.5">
              {['from-violet-400 to-violet-500', 'from-sky-400 to-sky-500', 'from-amber-400 to-amber-500'].map((g, i) => (
                <div key={i} className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${g} ring-[1.5px] ring-white`} />
              ))}
            </div>
            <p className="text-[8px] font-semibold text-gray-400">2,140 students · UPI · Cards · Instant delivery</p>
          </div>
        </div>

        {/* Home indicator */}
        <div className="pt-1 pb-2">
          <div className="mx-auto w-24 h-1 rounded-full bg-gray-900/90" />
        </div>
      </div>
    </div>
  </div>

  {/* Sync string between phone and dashboard (md+) */}
  <div className="hidden md:flex items-center w-8 lg:w-12 shrink-0 self-center z-30">
    <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] shrink-0" />
    <svg className="flex-1 h-3" viewBox="0 0 100 12" preserveAspectRatio="none" fill="none">
      <path d="M0 6 H100" stroke="#E83A2E" strokeWidth="2.5" strokeDasharray="6 6" style={{ animation: 'dashFlow 0.9s linear infinite' }} />
    </svg>
    <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] shrink-0" />
  </div>

  {/* ============ Browser frame — seller dashboard ============ */}
  <div className="relative flex-1 min-w-0 rounded-t-2xl border border-black/[0.08] border-b-0 bg-white shadow-[0_-20px_80px_-24px_rgba(0,0,0,0.16),0_30px_80px_-30px_rgba(0,0,0,0.20)] overflow-hidden text-left">
    {/* Chrome bar */}
    <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-gray-50/90 border-b border-black/[0.06]">
      <div className="flex gap-1.5 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      </div>
      <span className="mx-auto inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-500 font-medium bg-white border border-black/[0.07] px-4 sm:px-8 py-1 rounded-md">
        <svg className="w-2.5 h-2.5 text-gray-400" viewBox="0 0 12 12" fill="none">
          <rect x="2" y="5" width="8" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4 5V3.5a2 2 0 1 1 4 0V5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        digione.ai/dashboard/earnings
      </span>
      <div className="w-[52px] shrink-0" />
    </div>

    <div className="flex">


      {/* Main area */}
      <div className="flex-1 min-w-0">

        <div className="p-3.5 sm:p-4">
          {/* Balance card */}
          <div className="relative rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-3.5 sm:p-4 text-white overflow-hidden shadow-[0_12px_32px_-12px_rgba(16,185,129,0.5)]">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 12% 60%, rgba(255,255,255,0.35) 0%, transparent 45%), radial-gradient(circle at 90% 10%, rgba(255,255,255,0.2) 0%, transparent 40%)' }}
            />
            <div className="absolute -right-6 -bottom-10 w-36 h-36 rounded-full border-[14px] border-white/[0.07]" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] opacity-75 mb-1.5">Available Balance</p>
                <p className="text-[22px] sm:text-[26px] font-black tracking-tight leading-none">₹1,24,850<span className="text-[13px] sm:text-[14px] opacity-60">.00</span></p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[8px] sm:text-[9px] font-black bg-white/15 border border-white/20 rounded-full px-2 py-0.5">↑ ₹18,400 this week</span>
                  <span className="text-[8px] sm:text-[9px] opacity-70 font-medium">Cashfree · Instant UPI</span>
                </div>
              </div>
              <span className="shrink-0 bg-white text-emerald-700 text-[10px] font-black rounded-xl px-3.5 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">Withdraw →</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-3">
            {/* Incoming payments */}
            <div className="bg-white border border-black/[0.06] rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">Incoming payments</p>
                <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { initial: 'R', tone: 'from-violet-400 to-violet-500', name: 'Design Masterclass', amt: '+₹4,200', amtClass: 'text-emerald-600', sub: '2m ago · UPI', subClass: 'text-gray-300' },
                  { initial: 'S', tone: 'from-sky-400 to-sky-500', name: 'Notion Templates Pack', amt: '+₹11,500', amtClass: 'text-emerald-600', sub: '1h ago · Card', subClass: 'text-gray-300' },
                  { initial: 'P', tone: 'from-amber-400 to-amber-500', name: 'Freelance Toolkit', amt: '+₹3,800', amtClass: 'text-amber-600', sub: 'Processing', subClass: 'text-amber-500' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50/60 border border-black/[0.04] rounded-xl px-3 py-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${row.tone} shrink-0 flex items-center justify-center ring-2 ring-white shadow-sm`}>
                      <span className="text-[9px] font-black text-white">{row.initial}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-900 truncate leading-tight">{row.name}</p>
                      <div className="sk-shimmer h-1.5 w-2/5 rounded-full mt-1.5" />
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[12px] font-black leading-tight ${row.amtClass}`}>{row.amt}</p>
                      <p className={`text-[8px] font-semibold leading-tight mt-0.5 ${row.subClass}`}>{row.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue chart — md+ only */}
            <div className="hidden md:flex flex-col bg-white border border-black/[0.06] rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">Revenue · 7d</p>
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">↑ 24%</span>
              </div>
              <p className="text-[16px] font-black text-gray-900 mb-3">₹82,350</p>
              <div className="flex items-end gap-1.5 flex-1 min-h-[56px]">
                {[
                  { h: '35%', c: 'bg-gray-100', d: 'M' },
                  { h: '52%', c: 'bg-gray-200', d: 'T' },
                  { h: '42%', c: 'bg-gray-100', d: 'W' },
                  { h: '68%', c: 'bg-gray-200', d: 'T' },
                  { h: '55%', c: 'bg-gray-100', d: 'F' },
                  { h: '92%', c: 'bg-gradient-to-t from-[#E83A2E] to-orange-400', d: 'S', hot: true },
                  { h: '74%', c: 'bg-[#E83A2E]/25', d: 'S' },
                ].map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                    {bar.hot && <span className="text-[7px] font-black text-[#E83A2E] bg-[#E83A2E]/[0.08] rounded px-1 py-px">₹21.4K</span>}
                    <div className={`w-full rounded-md ${bar.c}`} style={{ height: bar.h }} />
                    <span className={`text-[7px] font-bold ${bar.hot ? 'text-gray-900' : 'text-gray-300'}`}>{bar.d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row — top products + store KPIs */}
          <div className="mt-3 hidden sm:grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-3">
            <div className="bg-white border border-black/[0.06] rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">Top products</p>
                <span className="text-[9px] font-bold text-gray-400 bg-gray-50 border border-black/[0.05] px-2 py-0.5 rounded-full">This week ▾</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { name: 'Design Masterclass', emoji: '🎨', w: '82%', amt: '₹42,300', sales: '212 sales' },
                  { name: 'Notion Templates Pack', emoji: '📦', w: '58%', amt: '₹28,150', sales: '141 sales' },
                  { name: 'Freelance Toolkit', emoji: '🚀', w: '34%', amt: '₹11,900', sales: '64 sales' },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-black/[0.05] shrink-0 flex items-center justify-center text-[12px]">{p.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-900 truncate leading-tight mb-1.5">{p.name}</p>
                      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#E83A2E] to-orange-400" style={{ width: p.w }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-black text-gray-900 leading-tight">{p.amt}</p>
                      <p className="text-[8px] text-gray-400 leading-tight mt-0.5">{p.sales}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Visitors', value: '12.4K', delta: '+8.2%' },
                { label: 'Conversion', value: '4.8%', delta: '+0.4%' },
                { label: 'Customers', value: '1,824', delta: '+126' },
                { label: 'Avg order', value: '₹740', delta: '+₹38' },
              ].map((k, i) => (
                <div key={i} className="bg-white border border-black/[0.06] rounded-xl p-3 flex flex-col justify-between hover:border-black/[0.1] transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-400">{k.label}</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[16px] font-black text-gray-900 leading-none mt-1.5 tracking-tight">{k.value}</p>
                    <p className="text-[8px] font-bold text-emerald-600 mt-1">↑ {k.delta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>
          {/* Bottom fade into next section */}
          <div className="absolute bottom-0 inset-x-0 h-20 sm:h-24 bg-gradient-to-b from-transparent to-white pointer-events-none z-10" />
        </div>

        {/* Platforms + trust stats (merged from the old Marquee section) */}
        <div
          className="w-full mt-10 sm:mt-16"
          style={{ animation: 'heroFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.42s both' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-8">
            Creators from these platforms use DigiOne
          </p>
          <div className="relative flex overflow-x-hidden">
            <div
              className="flex items-center gap-4 whitespace-nowrap"
              style={{ animation: 'marqueescroll 25s linear infinite', minWidth: '200%' }}
            >
              {[...PLATFORM_LOGOS, ...PLATFORM_LOGOS, ...PLATFORM_LOGOS].map((logo, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-5 py-2 bg-white border border-black/[0.07] rounded-full text-[13px] font-bold text-gray-400 tracking-wider uppercase shadow-[0_2px_10px_-4px_rgba(0,0,0,0.06)]"
                >
                  {logo}
                </span>
              ))}
            </div>
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          </div>
          <div className="mt-8 sm:mt-12 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            {TRUST_STATS.map((s, i) => (
              <div
                key={i}
                className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-7 text-center border border-black/[0.07] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]"
              >
                <div className="text-2xl sm:text-4xl font-black text-gray-900 mb-1">{s.value}</div>
                <div className="text-[12px] sm:text-sm text-gray-500 leading-tight">{s.label}</div>
                <div aria-hidden="true" className="mt-3 sm:mt-4 flex items-end justify-center gap-1 h-4">
                  {s.bars.map((barClass, j) => (
                    <div key={j} className={`w-2 rounded-sm ${barClass}`} style={{ height: SPARK_HEIGHTS[j] }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </section>
  );
}
