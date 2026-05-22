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
  Plus,
  GripVertical,
  Eye,
  Monitor,
  Smartphone,
  RotateCcw,
  RotateCw,
  type LucideIcon,
} from 'lucide-react';

type Feature = {
  icon: LucideIcon;
  title: string;
  desc: string;
  tag: string;
  layout: 'wide' | 'narrow';
  accent: string;
  iconBg: string;
  tagColor: string;
  graphic: () => React.ReactElement;
};

/* ==========================================================================
   GRAPHICS
   ========================================================================== */

const graphicCard =
  'rounded-2xl overflow-hidden border border-black/[0.06] bg-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.10)]';

const BuilderGraphic = () => (
  <div className={graphicCard}>
    {/* Browser chrome */}
    <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50/90 border-b border-black/[0.05]">
      <div className="flex gap-1.5 shrink-0">
        <div className="w-2 h-2 rounded-full bg-[#FF5F57]" />
        <div className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
        <div className="w-2 h-2 rounded-full bg-[#28C840]" />
      </div>
      <div className="flex items-center gap-0.5 shrink-0 ml-1">
        <RotateCcw className="w-2.5 h-2.5 text-gray-300" />
        <RotateCw className="w-2.5 h-2.5 text-gray-300" />
      </div>
      <div className="flex items-center bg-white border border-black/[0.08] rounded overflow-hidden shrink-0">
        <div className="px-1.5 py-0.5 bg-gray-100/80">
          <Monitor className="w-2.5 h-2.5 text-gray-600" />
        </div>
        <div className="px-1.5 py-0.5">
          <Smartphone className="w-2.5 h-2.5 text-gray-300" />
        </div>
      </div>
      <div className="flex-1 flex justify-center min-w-0">
        <span className="inline-flex items-center gap-1 text-[8px] text-gray-500 font-medium bg-white border border-black/[0.06] px-2 py-0.5 rounded-md max-w-full">
          <span className="w-1 h-1 rounded-full bg-green-500 shrink-0" />
          <span className="truncate">digione.ai/arjun</span>
        </span>
      </div>
      <button className="shrink-0 bg-[#E83A2E] text-white text-[8px] font-black px-2 py-0.5 rounded-full leading-none">
        Publish
      </button>
    </div>

    {/* Main editor */}
    <div className="grid grid-cols-5 divide-x divide-black/[0.05]" style={{ minHeight: 220 }}>

      {/* Layers panel */}
      <div className="col-span-2 bg-gray-50/60 flex flex-col">
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-black/[0.05]">
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em]">Layers</span>
          <Plus className="w-2.5 h-2.5 text-gray-300" />
        </div>
        <div className="flex-1 p-1.5 space-y-0.5">
          {/* Active layer — Hero */}
          <div className="relative flex items-center gap-1.5 bg-white border border-[#E83A2E]/20 rounded-lg pl-2.5 pr-1.5 py-1.5 ring-2 ring-[#E83A2E]/[0.10] shadow-sm overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E83A2E] rounded-l-lg" />
            <GripVertical className="w-2.5 h-2.5 text-gray-200 shrink-0" />
            <div className="w-2 h-2 rounded-sm bg-gradient-to-br from-[#E83A2E] to-orange-400 shrink-0" />
            <span className="text-[9px] font-bold text-gray-900 flex-1 truncate">Hero</span>
            <Eye className="w-2.5 h-2.5 text-gray-400 shrink-0" />
          </div>
          {/* Inactive layers */}
          {[
            { swatch: 'bg-violet-400', label: 'Products' },
            { swatch: 'bg-blue-400', label: 'Testimonials' },
            { swatch: 'bg-emerald-400', label: 'CTA' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/60 transition-colors">
              <GripVertical className="w-2.5 h-2.5 text-gray-200 shrink-0" />
              <div className={`w-2 h-2 rounded-sm ${l.swatch} shrink-0 opacity-70`} />
              <span className="text-[9px] text-gray-500 font-medium flex-1 truncate">{l.label}</span>
              <Eye className="w-2.5 h-2.5 text-gray-200 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="col-span-3 relative bg-[#f0f0f0] flex flex-col overflow-hidden">
        {/* dot grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
            backgroundSize: '10px 10px',
          }}
        />
        {/* Mini page frame */}
        <div className="relative flex-1 p-2 flex flex-col justify-start overflow-hidden">
          <div className="w-full rounded-lg overflow-hidden border border-black/[0.08] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.10)] bg-white flex flex-col">
            {/* Hero strip */}
            <div className="bg-gradient-to-br from-[#E83A2E]/[0.10] to-orange-50 px-2.5 py-2.5 border-b border-black/[0.05] flex flex-col gap-1.5">
              <div className="flex gap-1.5 items-center">
                <div className="h-1.5 w-14 rounded-full bg-gray-700/20" />
                <div className="h-1.5 w-8 rounded-full bg-gray-400/20" />
              </div>
              <div className="h-1 w-10 rounded-full bg-gray-400/15" />
              <div className="self-start bg-[#E83A2E] rounded-full px-2 py-0.5">
                <div className="h-1 w-7 rounded-full bg-white/60" />
              </div>
            </div>
            {/* Products strip */}
            <div className="px-2.5 py-2 border-b border-black/[0.05] flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex-1 rounded-md bg-gray-50 border border-black/[0.05] p-1.5 flex flex-col gap-1">
                  <div className="w-full h-3 rounded bg-gray-200/80" />
                  <div className="w-3/4 h-1 rounded-full bg-gray-200/60" />
                  <div className="w-1/2 h-1 rounded-full bg-gray-200/50" />
                </div>
              ))}
            </div>
            {/* Testimonials strip */}
            <div className="px-2.5 py-2 flex gap-2.5">
              {[
                'from-violet-300 to-indigo-400',
                'from-rose-300 to-pink-400',
              ].map((grad, n) => (
                <div key={n} className="flex items-start gap-1 flex-1 min-w-0">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${grad} shrink-0`} />
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 pt-0.5">
                    <div className="h-1 w-full rounded-full bg-gray-200/70" />
                    <div className="h-1 w-3/4 rounded-full bg-gray-200/50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="relative flex items-center justify-between px-2.5 py-1.5 border-t border-black/[0.06] bg-white/80">
          <span className="text-[7px] text-gray-400 font-medium truncate">Auto-saved · 2s ago</span>
          <span className="flex items-center gap-1 text-[7px] font-black text-green-600 shrink-0 ml-1">
            <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

    </div>
  </div>
);

const DMGraphic = () => (
  <div className={`${graphicCard} mx-auto`}>
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
    <div className="px-3.5 pt-2.5 pb-1.5">
      <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5">Triggers</p>
      <div className="flex gap-1 flex-wrap">
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
    <div className="px-3.5 pt-2 pb-3.5 space-y-1.5">
      <div className="flex justify-end">
        <span className="bg-gray-100 text-gray-700 text-[10px] font-semibold px-3 py-1.5 rounded-[14px] rounded-br-sm">
          COURSE 👀
        </span>
      </div>
      <div className="flex justify-start">
        <div className="bg-gradient-to-br from-[#E83A2E] to-rose-500 text-white text-[10px] font-semibold px-3 py-2 rounded-[14px] rounded-bl-sm max-w-[200px] leading-snug shadow-[0_2px_10px_-2px_rgba(232,58,46,0.35)]">
          Hey Priya! 🎉 Here&apos;s your link → digione.ai/priya/course
        </div>
      </div>
      <p className="text-[8px] text-gray-400 text-center pt-0.5 font-medium">Replied in 0.3s · Auto</p>
    </div>
  </div>
);

const WorkflowGraphic = () => (
  <div className={`${graphicCard} mx-auto`}>
    <div className="px-3.5 py-3 border-b border-black/[0.05] bg-gray-50/50 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
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
            className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] shrink-0 ${
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
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
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
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 50%, rgba(255,255,255,0.35) 0%, transparent 45%), radial-gradient(circle at 85% 20%, rgba(255,255,255,0.15) 0%, transparent 40%)',
        }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-70 mb-1">
            Available Balance
          </p>
          <p className="text-[26px] font-black tracking-tight leading-none">₹1,24,850</p>
          <p className="text-[9px] opacity-70 mt-1 font-medium">Cashfree · Instant UPI</p>
        </div>
        <button className="bg-white/20 backdrop-blur-sm border border-white/25 text-white text-[9px] font-black rounded-full px-2.5 py-1 hover:bg-white/30 transition-colors">
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
            <p className={`text-[11px] font-black leading-tight ${p.paid ? 'text-emerald-600' : 'text-amber-500'}`}>
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
  <div className={`${graphicCard} mx-auto`}>
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
          <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center shrink-0">
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
            <p className="text-[9px] text-green-600 font-bold leading-tight">🔒 Locked</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ==========================================================================
   FEATURES CONFIG
   ========================================================================== */

const features: Feature[] = [
  {
    icon: LayoutTemplate,
    title: 'Split-Screen Visual Builder',
    desc: 'Build high-converting stores, Link-in-Bio pages, and funnels with a real-time editor. Zero code, zero friction.',
    tag: 'Builder',
    layout: 'wide',
    accent: 'from-orange-500 to-[#E83A2E]',
    iconBg: 'bg-gradient-to-br from-orange-500 to-[#E83A2E]',
    tagColor: 'text-orange-500 bg-orange-50 border-orange-200/60',
    graphic: BuilderGraphic,
  },
  {
    icon: MessageCircle,
    title: 'AI Instagram DMs',
    desc: 'Turn comments into cash. Auto-reply with custom links the moment a follower drops a keyword.',
    tag: 'AI',
    layout: 'narrow',
    accent: 'from-[#E83A2E] to-rose-500',
    iconBg: 'bg-gradient-to-br from-[#E83A2E] to-rose-500',
    tagColor: 'text-rose-500 bg-rose-50 border-rose-200/60',
    graphic: DMGraphic,
  },
  {
    icon: Zap,
    title: 'Automated Workflows',
    desc: 'Chain WhatsApp, Mailchimp, and Telegram. Platform handles the grind while you sleep.',
    tag: 'Automation',
    layout: 'narrow',
    accent: 'from-amber-500 to-orange-500',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    tagColor: 'text-amber-600 bg-amber-50 border-amber-200/60',
    graphic: WorkflowGraphic,
  },
  {
    icon: Network,
    title: 'Built-in Affiliate Engine',
    desc: 'Launch scalable affiliate programs instantly. Let your biggest fans become your salesforce — commissions, tracking, leaderboards all included.',
    tag: 'Growth',
    layout: 'wide',
    accent: 'from-violet-500 to-indigo-500',
    iconBg: 'bg-gradient-to-br from-violet-500 to-indigo-500',
    tagColor: 'text-violet-600 bg-violet-50 border-violet-200/60',
    graphic: AffiliateGraphic,
  },
  {
    icon: Banknote,
    title: 'Instant UPI Payouts',
    desc: 'Funds hit your account same-day via Cashfree. Indian-first payment infra, built for real creators — no 7-day hold, no hidden cuts.',
    tag: 'Payments',
    layout: 'wide',
    accent: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    tagColor: 'text-emerald-600 bg-emerald-50 border-emerald-200/60',
    graphic: PayoutGraphic,
  },
  {
    icon: Fingerprint,
    title: 'Tamper-proof Ledger',
    desc: 'Every transaction cryptographically sealed. Dispute-proof records, zero surprises.',
    tag: 'Security',
    layout: 'narrow',
    accent: 'from-blue-500 to-cyan-500',
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    tagColor: 'text-blue-600 bg-blue-50 border-blue-200/60',
    graphic: LedgerGraphic,
  },
];

/* ==========================================================================
   CARD SHELL
   ========================================================================== */

const CardShell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`relative overflow-hidden rounded-[24px] sm:rounded-[28px] bg-white border border-black/[0.06] hover:border-black/10 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_56px_-16px_rgba(0,0,0,0.12)] hover:-translate-y-[3px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group h-full ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({ feat }: { feat: Feature }) => {
  const Icon = feat.icon;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-2xl ${feat.iconBg} flex items-center justify-center shadow-[0_4px_14px_-3px_rgba(0,0,0,0.25)] group-hover:scale-[1.08] group-hover:-rotate-3 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0`}
        >
          <Icon className="w-5 h-5 text-white" strokeWidth={2.1} />
        </div>
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${feat.tagColor}`}>
          {feat.tag}
        </span>
      </div>
      <div>
        <h3 className="text-[19px] sm:text-[21px] font-black text-gray-900 mb-2.5 tracking-[-0.02em] leading-[1.2]">
          {feat.title}
        </h3>
        <p className="text-gray-500 font-medium text-[13.5px] sm:text-[14px] leading-[1.6] max-w-[40ch]">
          {feat.desc}
        </p>
      </div>
    </div>
  );
};

const GraphicSurface = ({ feat, className = '' }: { feat: Feature; className?: string }) => {
  const Graphic = feat.graphic;
  return (
    <div className={`relative rounded-2xl bg-gray-50/80 p-4 sm:p-5 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 30%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 30%, transparent 100%)',
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
    <section id="features" className="py-16 sm:py-24 bg-[#fafafa] relative overflow-hidden">
      {/* top hairline */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/[0.08] to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/[0.06] to-transparent" />

      {/* subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          WebkitMaskImage: 'radial-gradient(ellipse 100% 60% at 50% 0%, #000 0%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 100% 60% at 50% 0%, #000 0%, transparent 100%)',
        }}
      />

      {/* brand glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none opacity-60"
        style={{
          width: '800px',
          height: '400px',
          background: 'radial-gradient(ellipse at center top, rgba(232,58,46,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">

        {/* ============ HEADER ============ */}
        <InView className="text-center mb-10 sm:mb-20">
          <div className="iv">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E83A2E]/[0.07] border border-[#E83A2E]/15 text-[11px] font-black uppercase tracking-[0.2em] text-[#E83A2E] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] animate-pulse" />
              Unfair Advantage
            </div>
            <h2 className="text-[2rem] sm:text-[3.25rem] md:text-[4rem] font-black text-gray-900 mb-5 tracking-[-0.035em] leading-[1.05]">
              Everything wired together.
            </h2>
            <p className="text-[15px] sm:text-[17px] font-medium text-gray-500 max-w-lg mx-auto leading-relaxed">
              Landing pages, AI bots, automation logic, and payment rails — one unified stack.
            </p>
          </div>
        </InView>

        {/* ============ BENTO GRID ============ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {features.map((feat, i) => {
            const isWide = feat.layout === 'wide';
            return (
              <InView
                key={i}
                style={{ '--delay': `${i * 60}ms` }}
                className={isWide ? 'md:col-span-2' : 'md:col-span-1'}
              >
                <div className="iv h-full">
                  <CardShell>
                    {/* accent top bar — visible on hover */}
                    <div
                      className={`absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r ${feat.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />
                    {/* ambient corner glow */}
                    <div
                      className={`absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-tl ${feat.accent} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-700 pointer-events-none blur-3xl`}
                    />

                    {isWide ? (
                      /* WIDE — horizontal on md+, vertical stack on mobile */
                      <div className="flex flex-col md:flex-row h-full">
                        <div className="flex-none md:w-[42%] p-7 sm:p-10 flex flex-col justify-center">
                          <CardHeader feat={feat} />
                        </div>
                        <div className="flex-1 p-4 sm:p-5 md:pl-0 flex items-center">
                          <GraphicSurface feat={feat} className="w-full" />
                        </div>
                      </div>
                    ) : (
                      /* NARROW — vertical stack */
                      <div className="flex flex-col h-full">
                        <div className="p-6 sm:p-8 lg:p-9">
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
      </div>
    </section>
  );
}
