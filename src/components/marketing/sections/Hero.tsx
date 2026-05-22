"use client";

import Link from 'next/link';
import { ArrowRight, Zap, TrendingUp } from 'lucide-react';

export default function Hero() {
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
      `}</style>

      {/* Floating cards */}
      <div
        className="hidden xl:block absolute top-[50%] left-20 z-20"
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

      <div
        className="hidden xl:block absolute top-[26%] right-20 z-20"
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

      <div
        className="hidden xl:block absolute top-[70%] right-25 z-20"
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

      </div>

    </section>
  );
}
