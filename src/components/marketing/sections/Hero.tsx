"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star, Zap, TrendingUp, IndianRupee, Users } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen pt-28 sm:pt-36 pb-0 overflow-hidden bg-white selection:bg-[#E83A2E]/20">

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            top: '-20%', left: '50%', transform: 'translateX(-50%)',
            width: '1000px', height: '700px',
            background: 'radial-gradient(ellipse at center, rgba(232,58,46,0.10) 0%, rgba(255,120,80,0.05) 45%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'bloomA 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '-10%', right: '-10%',
            width: '600px', height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(251,146,60,0.10) 0%, transparent 65%)',
            filter: 'blur(80px)',
            animation: 'bloomB 15s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '10%', left: '-12%',
            width: '500px', height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, transparent 65%)',
            filter: 'blur(80px)',
            animation: 'bloomC 18s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 65%)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 65%)',
          }}
        />
      </div>

      <style>{`
        @keyframes bloomA {
          0%, 100% { transform: translateX(-50%) translateY(0) scale(1); }
          50% { transform: translateX(-50%) translateY(-30px) scale(1.06); }
        }
        @keyframes bloomB {
          0%, 100% { transform: translateY(0) scale(1); }
          60% { transform: translateY(25px) scale(1.08); }
        }
        @keyframes bloomC {
          0%, 100% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-20px) scale(1.04); }
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
        className="hidden xl:block absolute top-[26%] left-6 z-20"
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
        className="hidden xl:block absolute top-[18%] right-6 z-20"
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
        className="hidden xl:block absolute top-[40%] right-10 z-20"
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-black/8 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.10)] text-[13px] font-semibold text-gray-600 mb-8"
          style={{ animation: 'heroFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <span className="flex items-center gap-0.5 text-amber-400">
            {[...Array(3)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
          </span>
          <span>Trusted by <strong className="text-gray-900">10,000+</strong> Indian creators</span>
          <span className="w-px h-3.5 bg-black/10" />
          <span className="flex items-center gap-1 text-[#E83A2E] font-bold">
            <Zap className="w-3 h-3 fill-current" /> Live
          </span>
        </div>

        <div
          className="flex flex-wrap items-center justify-center gap-x-0 gap-y-1 mb-7"
          style={{ animation: 'heroFadeUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.06s both' }}
        >
          {['Digital Product', 'Automation Flow', 'AI Tools', 'No-Code Website'].map((tag, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && <span className="mx-2 sm:mx-4 text-gray-300 text-[14px] sm:text-[22px] font-light select-none">|</span>}
              <span className="text-[12px] sm:text-[17px] font-bold tracking-wide text-gray-900 uppercase">{tag}</span>
            </span>
          ))}
        </div>

        <h1
          className="text-[42px] sm:text-[68px] md:text-[82px] lg:text-[96px] font-black tracking-[-0.04em] leading-[1.05] max-w-4xl"
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
          className="mt-6 sm:mt-8 text-[15px] sm:text-[20px] font-medium text-gray-500 max-w-2xl leading-relaxed px-2 sm:px-0"
          style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.18s both' }}
        >
          The only platform that turns your audience into automated income. No coding, no complicated setups — just results.
        </p>

        <div
          className="mt-10 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
          style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.26s both' }}
        >
          <Link
            href="/signup"
            className="w-full sm:w-auto group px-8 py-4 rounded-full bg-[#E83A2E] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_24px_-4px_rgba(232,58,46,0.35)] hover:shadow-[0_14px_32px_-4px_rgba(232,58,46,0.45)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Start building free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-full border border-black/10 bg-white text-gray-700 font-bold text-[15px] flex items-center justify-center gap-2 hover:border-black/20 hover:bg-gray-50 transition-all duration-300"
          >
            Sign in
          </Link>
        </div>

        <p
          className="mt-5 text-[10px] sm:text-[12px] font-semibold text-gray-400 tracking-widest uppercase px-4 sm:px-0 text-center"
          style={{ animation: 'heroFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.38s both' }}
        >
          No credit card &nbsp;·&nbsp; Setup in 2 minutes &nbsp;·&nbsp; Free forever plan
        </p>

        {/* Dashboard image */}
        <div
          className="mt-16 sm:mt-20 relative w-full max-w-[1100px]"
          style={{ animation: 'heroFadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.38s both' }}
        >
          <div
            className="absolute -inset-x-12 bottom-0 h-40 pointer-events-none"
            style={{ background: 'linear-gradient(to top, white 20%, transparent 100%)', zIndex: 10 }}
          />
          <div
            className="absolute inset-x-0 -bottom-8 mx-auto h-28 w-2/3 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(232,58,46,0.15) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
          <div className="relative rounded-t-[20px] overflow-hidden shadow-[0_30px_100px_-20px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#E83A2E]/50 to-transparent z-20" />
            <div className="bg-[#f5f5f5] border-b border-black/[0.06] px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white border border-black/8 rounded-md px-3 py-1.5 text-[11px] text-gray-400 font-medium w-full max-w-xs mx-auto text-center">
                  digione.ai/dashboard
                </div>
              </div>
            </div>
            <Image
              src="/image.webp"
              alt="DigiOne Dashboard"
              width={1100}
              height={620}
              className="w-full h-auto object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
