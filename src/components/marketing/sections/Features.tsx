import React from 'react';
import InView from '@/src/components/marketing/InView';
import {
  LayoutTemplate,
  MessageCircle,
  Zap,
  Network,
  Banknote,
  Fingerprint,
  CheckCircle2,
  ArrowUpRight,
  Plus,
  type LucideIcon,
} from 'lucide-react';

type Feature = {
  icon: LucideIcon;
  title: string;
  desc: string;
  tag: string;
  layout: 'wide' | 'narrow';
  accent: string;
  surface: string;
  graphic: () => React.ReactElement;
};

/* ==========================================================================
   GRAPHICS
   Unified design language across all six:
   - White surface, 1px border-black/6, radius-2xl
   - Shadow: 0 8px 24px -8px rgba(0,0,0,0.08)
   - Internal type scale: tag 9px / primary 10-11px / secondary 9px
   - Consistent chrome paddings (px-3.5 py-2.5 for headers)
   ========================================================================== */

const graphicCard =
  'rounded-2xl overflow-hidden border border-black/[0.06] bg-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)]';

const BuilderGraphic = () => (
  <div className={graphicCard}>
    {/* browser chrome */}
    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50/80 border-b border-black/[0.05]">
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#FF5F57]" />
        <div className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
        <div className="w-2 h-2 rounded-full bg-[#28C840]" />
      </div>
      <div className="flex-1 flex justify-center">
        <span className="inline-flex items-center gap-1.5 text-[9px] text-gray-500 font-medium bg-white border border-black/[0.05] px-2.5 py-0.5 rounded-md">
          <span className="w-1 h-1 rounded-full bg-green-500" />
          digione.ai/arjun
        </span>
      </div>
      <span className="text-[8px] font-black text-[#E83A2E] bg-[#E83A2E]/10 px-1.5 py-0.5 rounded">LIVE</span>
    </div>
    {/* split view */}
    <div className="grid grid-cols-5 divide-x divide-black/[0.05]" style={{ minHeight: 172 }}>
      {/* editor column */}
      <div className="col-span-2 p-3 bg-gray-50/50 space-y-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em]">Layers</span>
          <Plus className="w-2.5 h-2.5 text-gray-300" />
        </div>
        <div className="bg-white border border-[#E83A2E]/30 rounded-lg px-2 py-1.5 ring-2 ring-[#E83A2E]/10">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-[#E83A2E]" />
            <span className="text-[9px] font-bold text-gray-900">Hero</span>
          </div>
          <p className="text-[8px] text-gray-400 mt-0.5">Figma Masterclass</p>
        </div>
        {[
          { color: 'bg-[#E83A2E]/20', label: 'CTA Button' },
          { color: 'bg-gray-200', label: 'Image' },
          { color: 'bg-gray-200', label: 'Reviews' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 px-2 py-1 rounded">
            <div className={`w-3 h-3 rounded ${l.color}`} />
            <span className="text-[9px] text-gray-500 font-medium">{l.label}</span>
          </div>
        ))}
      </div>
      {/* preview column */}
      <div className="col-span-3 p-3 bg-white flex flex-col items-center justify-center">
        <div className="w-full bg-gradient-to-b from-[#fff5f4] to-white border border-black/[0.05] rounded-xl p-3 text-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E83A2E] to-orange-500 mx-auto mb-1.5 shadow-sm" />
          <p className="text-[11px] font-black text-gray-900 leading-tight">Figma Masterclass</p>
          <p className="text-[8px] text-gray-400 mt-0.5 font-medium">by Arjun Sharma</p>
          <div className="mt-2 bg-[#E83A2E] text-white text-[9px] font-black rounded-full px-3 py-1.5 inline-block shadow-sm">
            Buy Now — ₹999
          </div>
        </div>
        <span className="text-[8px] text-green-600 font-bold flex items-center gap-1 mt-2">
          <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" /> Auto-saved
        </span>
      </div>
    </div>
  </div>
);

const DMGraphic = () => (
  <div className={`${graphicCard} mx-auto max-w-[280px]`}>
    <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-black/[0.05] bg-gray-50/50">
      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm">
        P
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-gray-900 truncate">@priya.designs</p>
        <p className="text-[9px] text-gray-400">82.4K followers</p>
      </div>
      <div className="ml-auto flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 border border-green-200/70 px-1.5 py-0.5 rounded-full shrink-0">
        <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
        Active
      </div>
    </div>
    <div className="px-3.5 pt-3 pb-1">
      <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5">Triggers</p>
      <div className="flex gap-1">
        {['COURSE', 'LINK', 'PDF'].map((k) => (
          <span
            key={k}
            className="px-1.5 py-0.5 bg-gray-100 border border-black/[0.05] rounded text-[9px] font-black text-gray-600"
          >
            {k}
          </span>
        ))}
      </div>
    </div>
    <div className="px-3.5 pt-2.5 pb-3.5 space-y-1.5">
      <div className="flex justify-end">
        <span className="bg-gray-100 text-gray-700 text-[10px] font-semibold px-3 py-1.5 rounded-[14px] rounded-br-sm">
          COURSE 👀
        </span>
      </div>
      <div className="flex justify-start">
        <div className="bg-gradient-to-br from-[#E83A2E] to-rose-500 text-white text-[10px] font-semibold px-3 py-2 rounded-[14px] rounded-bl-sm max-w-[200px] leading-snug shadow-sm">
          Hey Priya! 🎉 Here&apos;s your link → digione.ai/priya/course
        </div>
      </div>
      <p className="text-[8px] text-gray-400 text-center pt-0.5 font-medium">Replied in 0.3s · Auto</p>
    </div>
  </div>
);

const WorkflowGraphic = () => (
  <div className={`${graphicCard} mx-auto max-w-[280px]`}>
    <div className="px-3.5 py-3 border-b border-black/[0.05] bg-gray-50/50 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full bg-gray-400" />
        <p className="text-[11px] font-black text-gray-800">Purchase Flow</p>
      </div>
      <span className="flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 border border-green-200/70 px-1.5 py-0.5 rounded-full">
        <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" /> Running
      </span>
    </div>
    <div className="p-3 space-y-1.5">
      {[
        { icon: '⚡', label: 'New sale', sub: 'Rahul · ₹1,499', done: true },
        { icon: '💬', label: 'WhatsApp sent', sub: '+91 98765 43210', done: true },
        { icon: '📧', label: 'Mailchimp tagged', sub: '"course-buyer"', done: true },
        { icon: '🔗', label: 'Delivery link', sub: 'Generating...', done: false },
      ].map((step, i) => (
        <div key={i} className="flex items-center gap-2.5 px-1">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] shrink-0 ${
              step.done ? 'bg-green-50 border border-green-200/70' : 'bg-amber-50 border border-amber-200/70'
            }`}
          >
            {step.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-800 truncate leading-tight">{step.label}</p>
            <p className="text-[9px] text-gray-400 truncate leading-tight">{step.sub}</p>
          </div>
          {step.done ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-amber-300 border-t-transparent animate-spin shrink-0" />
          )}
        </div>
      ))}
    </div>
  </div>
);

const AffiliateGraphic = () => (
  <div className={graphicCard}>
    <div className="flex items-center justify-between px-3.5 py-3 border-b border-black/[0.05] bg-gray-50/50">
      <p className="text-[11px] font-black text-gray-800">Top Affiliates</p>
      <span className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-200/60 px-2 py-0.5 rounded-full">
        This month
      </span>
    </div>
    <div className="divide-y divide-black/[0.04]">
      {[
        { rank: '🥇', name: 'Sneha Iyer', sales: 34, earned: '₹18,700', pct: 72 },
        { rank: '🥈', name: 'Karan Singh', sales: 21, earned: '₹11,550', pct: 48 },
        { rank: '🥉', name: 'Ananya Roy', sales: 14, earned: '₹7,700', pct: 30 },
      ].map((r, i) => (
        <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
          <span className="text-[15px] shrink-0 w-5 text-center">{r.rank}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-gray-800 truncate">{r.name}</p>
            <div className="mt-1 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                style={{ width: `${r.pct}%` }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] font-black text-gray-900 leading-tight">{r.earned}</p>
            <p className="text-[9px] text-gray-400 leading-tight">{r.sales} sales</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PayoutGraphic = () => (
  <div className={graphicCard}>
    <div className="relative p-4 bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-600 text-white overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 40%)',
        }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-70 mb-1">
            Available Balance
          </p>
          <p className="text-[24px] font-black tracking-tight leading-none">₹1,24,850</p>
          <p className="text-[9px] opacity-70 mt-1 font-medium">Cashfree · Instant UPI</p>
        </div>
        <button className="bg-white/15 backdrop-blur-sm border border-white/25 text-white text-[9px] font-black rounded-full px-2.5 py-1 hover:bg-white/25 transition-colors">
          Withdraw
        </button>
      </div>
    </div>
    <div className="divide-y divide-black/[0.04]">
      {[
        { name: 'Arjun Sharma', upi: 'arjun@upi', amt: '+₹4,200', time: '2m ago', paid: true },
        { name: 'Vikram Joshi', upi: 'vikram@okicici', amt: '+₹11,500', time: '1h ago', paid: true },
        { name: 'Neha Kapoor', upi: 'neha@paytm', amt: '+₹3,800', time: 'Processing', paid: false },
      ].map((p, i) => (
        <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm">
            {p.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-gray-800 truncate leading-tight">{p.name}</p>
            <p className="text-[9px] text-gray-400 leading-tight">{p.upi}</p>
          </div>
          <div className="text-right shrink-0">
            <p
              className={`text-[11px] font-black leading-tight ${
                p.paid ? 'text-emerald-600' : 'text-amber-500'
              }`}
            >
              {p.amt}
            </p>
            <p className="text-[9px] text-gray-400 leading-tight">{p.time}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LedgerGraphic = () => (
  <div className={`${graphicCard} mx-auto max-w-[280px]`}>
    <div className="flex items-center justify-between px-3.5 py-3 border-b border-black/[0.05] bg-gray-50/50">
      <p className="text-[11px] font-black text-gray-800">Ledger</p>
      <span className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-full">
        <Fingerprint className="w-2.5 h-2.5" />
        Verified
      </span>
    </div>
    <div className="divide-y divide-black/[0.04]">
      {[
        { id: '#TXN-8821', name: 'Rahul Verma', amt: '₹1,499', tag: 'Course' },
        { id: '#TXN-8820', name: 'Sneha Iyer', amt: '₹499', tag: 'Ebook' },
        { id: '#TXN-8819', name: 'Karan Singh', amt: '₹2,999', tag: 'Template' },
      ].map((t, i) => (
        <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/70 flex items-center justify-center shrink-0">
            <Fingerprint className="w-3 h-3 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-gray-800 truncate leading-tight">{t.name}</p>
            <p className="text-[9px] text-gray-400 leading-tight">
              {t.id} · {t.tag}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] font-black text-gray-900 leading-tight">{t.amt}</p>
            <p className="text-[9px] text-green-600 font-bold leading-tight flex items-center justify-end gap-0.5">
              🔒 Locked
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ==========================================================================
   FEATURES CONFIG
   layout: 'wide' = col-span-2 on desktop, horizontal content+graphic split
           'narrow' = col-span-1, vertical stack
   ========================================================================== */

const features: Feature[] = [
  {
    icon: LayoutTemplate,
    title: 'Split-Screen Visual Builder',
    desc: 'Build high-converting stores, Link-in-Bio pages, and funnels with a real-time editor. Zero code, zero friction.',
    tag: 'Builder',
    layout: 'wide',
    accent: 'from-orange-500 to-[#E83A2E]',
    surface: 'from-[#fff6f4] to-[#fff]',
    graphic: BuilderGraphic,
  },
  {
    icon: MessageCircle,
    title: 'AI Instagram DMs',
    desc: 'Turn comments into cash. Auto-reply with custom links the moment a follower drops a keyword.',
    tag: 'AI',
    layout: 'narrow',
    accent: 'from-[#E83A2E] to-rose-500',
    surface: 'from-rose-50/60 to-white',
    graphic: DMGraphic,
  },
  {
    icon: Zap,
    title: 'Automated Workflows',
    desc: 'Chain WhatsApp, Mailchimp, and Telegram. Platform handles the grind while you sleep.',
    tag: 'Automation',
    layout: 'narrow',
    accent: 'from-amber-500 to-orange-500',
    surface: 'from-amber-50/60 to-white',
    graphic: WorkflowGraphic,
  },
  {
    icon: Network,
    title: 'Built-in Affiliate Engine',
    desc: 'Launch scalable affiliate programs instantly. Let your biggest fans become your salesforce — commissions, tracking, leaderboards all included.',
    tag: 'Growth',
    layout: 'wide',
    accent: 'from-violet-500 to-indigo-500',
    surface: 'from-violet-50/60 to-white',
    graphic: AffiliateGraphic,
  },
  {
    icon: Banknote,
    title: 'Instant UPI Payouts',
    desc: 'Funds hit your account same-day via Cashfree. Indian-first payment infra, built for real creators — no 7-day hold, no hidden cuts.',
    tag: 'Payments',
    layout: 'wide',
    accent: 'from-emerald-500 to-teal-500',
    surface: 'from-emerald-50/60 to-white',
    graphic: PayoutGraphic,
  },
  {
    icon: Fingerprint,
    title: 'Tamper-proof Ledger',
    desc: 'Every transaction cryptographically sealed. Dispute-proof records, zero surprises.',
    tag: 'Security',
    layout: 'narrow',
    accent: 'from-blue-500 to-cyan-500',
    surface: 'from-blue-50/60 to-white',
    graphic: LedgerGraphic,
  },
];

/* ==========================================================================
   CARD COMPONENTS
   ========================================================================== */

const CardShell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`relative overflow-hidden rounded-[22px] sm:rounded-[26px] bg-white border border-black/[0.06] hover:border-black/[0.11] hover:shadow-[0_18px_50px_-14px_rgba(0,0,0,0.10)] hover:-translate-y-[2px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group h-full ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({ feat }: { feat: Feature }) => {
  const Icon = feat.icon;
  return (
    <>
      <div className="flex items-center gap-2 mb-5">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${feat.accent} flex items-center justify-center shadow-[0_4px_12px_-3px_rgba(0,0,0,0.25)] group-hover:scale-105 group-hover:-rotate-2 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]`}
        >
          <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-white" strokeWidth={2.2} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
          {feat.tag}
        </span>
      </div>
      <h3 className="text-[18px] sm:text-[20px] lg:text-[22px] font-black text-gray-900 mb-2.5 tracking-[-0.015em] leading-[1.2]">
        {feat.title}
      </h3>
      <p className="text-gray-500 font-medium text-[13.5px] sm:text-[14.5px] leading-[1.55] max-w-[42ch]">
        {feat.desc}
      </p>
    </>
  );
};

const GraphicSurface = ({ feat, className = '' }: { feat: Feature; className?: string }) => {
  const Graphic = feat.graphic;
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br ${feat.surface} p-4 sm:p-5 overflow-hidden ${className}`}
    >
      {/* dotted grid backdrop */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 100%)',
          maskImage:
            'radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 100%)',
        }}
      />
      <div className="relative">
        <Graphic />
      </div>
    </div>
  );
};

/* ==========================================================================
   MAIN
   ========================================================================== */

export default function Features() {
  return (
    <section id="features" className="py-10 sm:py-18 bg-[#fafafa] relative overflow-hidden">
      {/* top hairline */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />

      {/* dotted background (subtle) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at 50% 25%, #000 10%, transparent 100%)',
          maskImage:
            'radial-gradient(ellipse 80% 60% at 50% 25%, #000 10%, transparent 100%)',
        }}
      />

      {/* brand glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '900px',
          height: '500px',
          background:
            'radial-gradient(ellipse at center, rgba(232,58,46,0.07) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        {/* ============ HEADER ============ */}
        <InView className="text-center mb-14 sm:mb-20">
          <div className="iv">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-6 bg-[#E83A2E]/[0.07] px-4 py-1.5 rounded-full border border-[#E83A2E]/15">
              <span className="w-1 h-1 rounded-full bg-[#E83A2E]" />
              Unfair Advantage
            </p>
            <h2 className="text-[2.1rem] sm:text-5xl md:text-[3.5rem] font-black text-gray-900 mb-5 tracking-[-0.035em] leading-[1.05]">
              Everything wired together.
              <br />
              <span className="text-gray-400">Zero duct-tape required.</span>
            </h2>
            <p className="text-[15px] sm:text-xl font-medium text-gray-500 max-w-xl mx-auto leading-relaxed">
              Landing pages, AI bots, automation logic, and payment rails — one unified stack.
            </p>
          </div>
        </InView>

        {/* ============ BENTO GRID ============ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {features.map((feat, i) => {
            const isWide = feat.layout === 'wide';
            return (
              <InView
                key={i}
                style={{ '--delay': `${i * 70}ms` }}
                className={isWide ? 'md:col-span-2' : 'md:col-span-1'}
              >
                <div className="iv h-full">
                  <CardShell>
                    {/* accent hairline on hover */}
                    <div
                      className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${feat.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />
                    {/* ambient accent glow on hover */}
                    <div
                      className={`absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-tl ${feat.accent} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-700 pointer-events-none blur-2xl`}
                    />

                    {isWide ? (
                      /* ============ WIDE CARD ============
                         Horizontal on desktop, vertical on mobile */
                      <div className="flex flex-col md:flex-row h-full">
                        <div className="flex-1 p-6 sm:p-8 md:p-9 flex flex-col justify-center md:max-w-[44%]">
                          <CardHeader feat={feat} />
                        </div>
                        <div className="flex-1 p-4 sm:p-5 md:p-6 md:pl-0 flex items-center">
                          <GraphicSurface feat={feat} className="w-full" />
                        </div>
                      </div>
                    ) : (
                      /* ============ NARROW CARD ============
                         Vertical stack on all sizes */
                      <div className="flex flex-col h-full">
                        <div className="p-6 sm:p-7">
                          <CardHeader feat={feat} />
                        </div>
                        <div className="mt-auto p-4 sm:p-5 pt-0">
                          <GraphicSurface feat={feat} />
                        </div>
                      </div>
                    )}
                  </CardShell>
                </div>
              </InView>
            );
          })}
        </div>

        {/* ============ BOTTOM CTA STRIP ============ */}
        {/* <InView className="mt-14 sm:mt-20 text-center">
          <div className="iv">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 text-[14px] sm:text-[15px] font-bold text-gray-700 hover:text-[#E83A2E] transition-colors group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] animate-pulse" />
              And 40+ more features shipping every month
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </InView> */}
      </div>
    </section>
  );
}