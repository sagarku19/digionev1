"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import { Rails } from '@/src/components/marketing/Ledger';

const METRICS = [
  { value: "₹4.2 Cr+", label: "earned by creators" },
  { value: "12,400+", label: "products sold securely" },
  { value: "99.9%", label: "checkout uptime" },
  { value: "10%", label: "flat fee — you keep 90%" },
];

const PAYMENTS = [
  { initial: 'D', name: 'Design Masterclass', amt: '+₹4,200', amtClass: 'text-emerald-600', sub: '2m ago · UPI', subClass: 'text-black/30' },
  { initial: 'N', name: 'Notion Templates Pack', amt: '+₹11,500', amtClass: 'text-emerald-600', sub: '1h ago · Card', subClass: 'text-black/30' },
  { initial: 'F', name: 'Freelance Toolkit', amt: '+₹3,800', amtClass: 'text-amber-600', sub: 'Processing', subClass: 'text-amber-500' },
];

const WEEK_BARS = [
  { h: '35%', hot: false, d: 'M' },
  { h: '52%', hot: false, d: 'T' },
  { h: '42%', hot: false, d: 'W' },
  { h: '68%', hot: false, d: 'T' },
  { h: '55%', hot: false, d: 'F' },
  { h: '92%', hot: true, d: 'S' },
  { h: '74%', hot: false, d: 'S' },
];

const TOP_PRODUCTS = [
  { name: 'Design Masterclass', initial: 'D', w: '82%', amt: '₹42,300', sales: '212 sales' },
  { name: 'Notion Templates Pack', initial: 'N', w: '58%', amt: '₹28,150', sales: '141 sales' },
  { name: 'Freelance Toolkit', initial: 'F', w: '34%', amt: '₹11,900', sales: '64 sales' },
];

const KPIS = [
  { label: 'Visitors', value: '12.4K', delta: '+8.2%' },
  { label: 'Conversion', value: '4.8%', delta: '+0.4%' },
  { label: 'Customers', value: '1,824', delta: '+126' },
  { label: 'Avg order', value: '₹740', delta: '+₹38' },
];

export default function Hero() {
  const { isLoggedIn } = useAuthSession();

  return (
    <section className="relative bg-white overflow-hidden selection:bg-[#E83A2E]/15">

      {/* Technical graph-paper field */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(22,19,15,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
        }}
      />

      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes heroFadeIn {
          to { opacity: 1; }
        }
        @keyframes heroDashFlow {
          to { stroke-dashoffset: -24; }
        }
        @keyframes heroPing {
          0%   { transform: scale(0.6); opacity: 0.7; }
          80%, 100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      <Rails className="pt-28 sm:pt-36">
        <div className="px-5 sm:px-10 lg:px-14">

          {/* Animated revenue plot — engineered-ledger ornament */}
          <svg
            aria-hidden="true"
            viewBox="0 0 380 250"
            fill="none"
            className="hidden xl:block absolute right-10 xl:right-14 top-32 w-[350px] pointer-events-none select-none"
            style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s both' }}
          >
            <defs>
              <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E83A2E" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#E83A2E" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Registration crosses */}
            <g stroke="rgba(22,19,15,0.22)" strokeWidth="1">
              <path d="M8 12 v8 M4 16 h8" />
              <path d="M372 232 v8 M368 236 h8" />
            </g>

            {/* Baseline — marching dashes */}
            <line
              x1="10" y1="218" x2="350" y2="218"
              stroke="rgba(22,19,15,0.14)" strokeWidth="1"
              strokeDasharray="4 4"
              style={{ animation: 'heroDashFlow 1.6s linear infinite' }}
            />

            {/* Week ticks + labels */}
            <g stroke="rgba(22,19,15,0.18)" strokeWidth="1">
              {[10, 78, 146, 214, 282, 350].map(x => (
                <line key={x} x1={x} y1="218" x2={x} y2="223" />
              ))}
            </g>
            <g className="font-ledger" fill="rgba(22,19,15,0.3)" fontSize="8">
              {['W1', 'W2', 'W3', 'W4', 'W5', 'W6'].map((w, i) => (
                <text key={w} x={10 + i * 68} y="236" textAnchor="middle">{w}</text>
              ))}
            </g>

            {/* Last period — ghost curve */}
            <path
              d="M10 214 C 60 210, 95 196, 135 192 S 205 178, 245 164 S 315 142, 350 128"
              stroke="rgba(22,19,15,0.16)" strokeWidth="1.5"
              strokeDasharray="3 5" strokeLinecap="round"
            />

            {/* This period — area fill */}
            <path
              d="M10 210 C 60 202, 90 172, 130 164 S 190 148, 220 118 S 300 92, 350 56 V 218 H 10 Z"
              fill="url(#heroArea)"
              opacity="0"
              style={{ animation: 'heroFadeIn 0.9s ease 1.7s forwards' }}
            />

            {/* This period — self-drawing curve */}
            <path
              d="M10 210 C 60 202, 90 172, 130 164 S 190 148, 220 118 S 300 92, 350 56"
              stroke="#E83A2E" strokeWidth="2" strokeLinecap="round"
              strokeDasharray="600" strokeDashoffset="600"
              style={{ animation: 'heroDraw 1.8s cubic-bezier(0.65,0,0.35,1) 0.7s forwards' }}
            />

            {/* Endpoint — pulsing data dot */}
            <g opacity="0" style={{ animation: 'heroFadeIn 0.4s ease 2.3s forwards' }}>
              <circle
                cx="350" cy="56" r="6" fill="#E83A2E" opacity="0.35"
                style={{
                  animation: 'heroPing 2.2s cubic-bezier(0,0,0.2,1) 2.5s infinite',
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                }}
              />
              <circle cx="350" cy="56" r="3.5" fill="#E83A2E" />
              <circle cx="350" cy="56" r="3.5" stroke="#fff" strokeWidth="1.5" fill="none" />
            </g>

            {/* Endpoint label */}
            <g opacity="0" style={{ animation: 'heroFadeIn 0.5s ease 2.5s forwards' }}>
              <rect x="284" y="30" width="54" height="20" rx="5" fill="#16130F" />
              <text className="font-ledger" x="311" y="43" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600">
                ₹21.4K
              </text>
            </g>

            {/* Kicker label */}
            <text className="font-ledger" x="10" y="22" fill="rgba(22,19,15,0.3)" fontSize="9" letterSpacing="1.5">
              REVENUE · LIVE
            </text>
            <text className="font-ledger" x="10" y="38" fill="#E83A2E" fontSize="10" fontWeight="600" opacity="0" style={{ animation: 'heroFadeIn 0.5s ease 2.6s forwards' }}>
              ↑ 24% vs last period
            </text>
          </svg>

          {/* Eyebrow */}
          <p
            className="font-ledger text-[11px] sm:text-[12px] font-medium tracking-[0.08em] text-black/45 uppercase"
            style={{ animation: 'heroFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
          >
            <span className="text-[#E83A2E] font-semibold">{'>>'}</span>
            &nbsp;&nbsp;Built for Indian creators · No code
          </p>

          {/* Headline */}
          <h1
            className="mt-6 sm:mt-8 text-[40px] sm:text-[56px] lg:text-[68px] font-bold tracking-[-0.04em] leading-[1.02] text-[#16130F] max-w-3xl"
            style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.08s both' }}
          >
            Setup in minutes.
            <br />
            <span className="text-[#E83A2E]">Sell on autopilot.</span>
          </h1>

          <p
            className="mt-6 sm:mt-7 text-[15px] sm:text-[17px] font-medium text-black/50 max-w-xl leading-relaxed"
            style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.14s both' }}
          >
            DigiOne is the storefront, checkout, and automation stack for Indian
            creators. Upload your product, share your link — the system handles
            delivery, payments, and payouts.
          </p>

          {/* CTAs */}
          <div
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center gap-3"
            style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}
          >
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] transition-colors duration-200"
                >
                  Go to your dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </Link>
                <Link
                  href="/contact-team"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-black/[0.12] hover:border-black/[0.25] text-[#16130F] font-semibold text-[14px] transition-colors duration-200"
                >
                  Contact the team
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] transition-colors duration-200"
                >
                  Start building free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </Link>
                <Link
                  href="/invite"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-black/[0.12] hover:border-black/[0.25] text-[#16130F] font-semibold text-[14px] transition-colors duration-200"
                >
                  Request an invite
                </Link>
              </>
            )}
            <span className="font-ledger text-[11px] text-black/35 sm:ml-3">
              Free forever plan · No credit card
            </span>
          </div>

          {/* ============ Dashboard frame ============ */}
          <div
            aria-hidden="true"
            className="relative mt-14 sm:mt-20"
            style={{ animation: 'heroFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s both' }}
          >
            <div className="relative rounded-t-xl border border-b-0 border-black/[0.1] bg-white overflow-hidden shadow-[0_-12px_60px_-30px_rgba(22,19,15,0.18)]">
              {/* Chrome bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FAF8F6] border-b border-black/[0.07]">
                <div className="flex gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full border border-black/[0.15]" />
                  <span className="w-2.5 h-2.5 rounded-full border border-black/[0.15]" />
                  <span className="w-2.5 h-2.5 rounded-full border border-black/[0.15]" />
                </div>
                <span className="mx-auto font-ledger text-[10px] sm:text-[11px] text-black/45 bg-white border border-black/[0.07] px-4 sm:px-8 py-1 rounded-md">
                  digione.ai/dashboard/earnings
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 font-ledger text-[10px] font-medium text-emerald-700 shrink-0">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              </div>

              <div className="p-3.5 sm:p-5">
                {/* Balance card — ink */}
                <div className="relative rounded-xl bg-[#16130F] p-4 sm:p-5 text-white overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-50 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(232,58,46,0.22) 0%, transparent 45%)' }}
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="font-ledger text-[9px] sm:text-[10px] tracking-[0.18em] text-white/40 uppercase mb-2">Available balance</p>
                      <p className="font-ledger text-[24px] sm:text-[30px] font-semibold tracking-tight leading-none">
                        ₹1,24,850<span className="text-[14px] text-white/35">.00</span>
                      </p>
                      <div className="mt-3 flex items-center gap-2.5">
                        <span className="font-ledger text-[9px] sm:text-[10px] text-emerald-400">↑ ₹18,400 this week</span>
                        <span className="font-ledger text-[9px] sm:text-[10px] text-white/30">Instant UPI · Direct to bank</span>
                      </div>
                    </div>
                    <span className="shrink-0 bg-[#E83A2E] text-white font-semibold text-[11px] rounded-lg px-3.5 py-2">
                      Withdraw →
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-3">
                  {/* Incoming payments */}
                  <div className="bg-white border border-black/[0.07] rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-ledger text-[9px] tracking-[0.18em] text-black/35 uppercase">Incoming payments</p>
                      <span className="flex items-center gap-1 font-ledger text-[9px] font-medium text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        LIVE
                      </span>
                    </div>
                    <div className="space-y-2">
                      {PAYMENTS.map((row, i) => (
                        <div key={i} className="flex items-center gap-3 border border-black/[0.05] rounded-lg px-3 py-2">
                          <div className="w-7 h-7 rounded-md bg-[#16130F] text-white shrink-0 flex items-center justify-center">
                            <span className="font-ledger text-[10px] font-medium">{row.initial}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-[#16130F] truncate leading-tight">{row.name}</p>
                            <p className={`font-ledger text-[9px] leading-tight mt-0.5 ${row.subClass}`}>{row.sub}</p>
                          </div>
                          <p className={`font-ledger text-[12px] font-semibold shrink-0 ${row.amtClass}`}>{row.amt}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Revenue chart — md+ */}
                  <div className="hidden md:flex flex-col bg-white border border-black/[0.07] rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-ledger text-[9px] tracking-[0.18em] text-black/35 uppercase">Revenue · 7d</p>
                      <span className="font-ledger text-[9px] font-medium text-emerald-700">↑ 24%</span>
                    </div>
                    <p className="font-ledger text-[18px] font-semibold text-[#16130F] mb-3">₹82,350</p>
                    <div className="flex items-end gap-1.5 flex-1 min-h-[56px]">
                      {WEEK_BARS.map((bar, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                          {bar.hot && (
                            <span className="font-ledger text-[8px] font-medium text-[#E83A2E]">₹21.4K</span>
                          )}
                          <div
                            className={`w-full rounded-sm ${bar.hot ? 'bg-[#E83A2E]' : 'bg-black/[0.08]'}`}
                            style={{ height: bar.h }}
                          />
                          <span className={`font-ledger text-[8px] ${bar.hot ? 'text-[#16130F]' : 'text-black/25'}`}>{bar.d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom row — top products + KPIs */}
                <div className="mt-3 hidden sm:grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-3">
                  <div className="bg-white border border-black/[0.07] rounded-xl p-3.5">
                    <p className="font-ledger text-[9px] tracking-[0.18em] text-black/35 uppercase mb-3">Top products</p>
                    <div className="space-y-2.5">
                      {TOP_PRODUCTS.map((p, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-md bg-[#FAF8F6] border border-black/[0.07] shrink-0 flex items-center justify-center">
                            <span className="font-ledger text-[10px] font-medium text-black/55">{p.initial}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-[#16130F] truncate leading-tight mb-1.5">{p.name}</p>
                            <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden">
                              <div className="h-full rounded-full bg-[#E83A2E]" style={{ width: p.w }} />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-ledger text-[11px] font-semibold text-[#16130F] leading-tight">{p.amt}</p>
                            <p className="font-ledger text-[8px] text-black/30 leading-tight mt-0.5">{p.sales}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {KPIS.map((k, i) => (
                      <div key={i} className="bg-white border border-black/[0.07] rounded-xl p-3.5 flex flex-col justify-between">
                        <p className="font-ledger text-[8px] tracking-[0.15em] text-black/35 uppercase">{k.label}</p>
                        <div>
                          <p className="font-ledger text-[17px] font-semibold text-[#16130F] leading-none mt-1.5">{k.value}</p>
                          <p className="font-ledger text-[9px] font-medium text-emerald-700 mt-1">↑ {k.delta}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom fade into metrics strip */}
            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-b from-transparent to-white pointer-events-none" />
          </div>
        </div>

        {/* ============ Metrics ledger strip ============ */}
        <div
          className="border-t border-black/[0.08] grid grid-cols-2 lg:grid-cols-4"
          style={{ animation: 'heroFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s both' }}
        >
          {METRICS.map((m, i) => (
            <div
              key={i}
              className={`px-5 sm:px-10 lg:px-14 py-6 sm:py-8 ${i > 0 ? 'border-l border-black/[0.08]' : ''} ${
                i >= 2 ? 'border-t lg:border-t-0 border-black/[0.08]' : ''
              } ${i === 2 ? 'border-l-0 lg:border-l' : ''}`}
            >
              <p className="font-ledger text-[22px] sm:text-[28px] font-semibold tracking-tight text-[#16130F] leading-none">
                {m.value}
              </p>
              <p className="mt-2 text-[12px] sm:text-[13px] font-medium text-black/40">{m.label}</p>
            </div>
          ))}
        </div>
      </Rails>
    </section>
  );
}
