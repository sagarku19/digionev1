import InView from '@/src/components/marketing/InView';
import { LayoutTemplate, MessageCircle, Zap, Network, Banknote, Fingerprint, CheckCircle2 } from 'lucide-react';

const BuilderGraphic = (
  <div className="mt-7 w-full rounded-2xl overflow-hidden border border-gray-100 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] bg-white">
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      </div>
      <div className="flex-1 mx-3 bg-white border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-400 font-medium">
        digione.ai/arjun-sharma
      </div>
      <span className="text-[9px] font-bold text-[#E83A2E] bg-[#E83A2E]/10 px-2 py-0.5 rounded-md">Live</span>
    </div>
    <div className="flex" style={{ height: 140 }}>
      <div className="w-1/2 border-r border-gray-100 p-3 bg-white space-y-2 overflow-hidden">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Editor</p>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-700">Hero Headline</p>
          <p className="text-[9px] text-gray-400 leading-snug">Buy my Figma Masterclass ↗</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-[#E83A2E]/15 flex items-center justify-center">
            <div className="w-2 h-2 rounded-sm bg-[#E83A2E]/50" />
          </div>
          <p className="text-[9px] text-gray-500">Button • Buy Now</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-100" />
          <p className="text-[9px] text-gray-400">Image block</p>
        </div>
      </div>
      <div className="w-1/2 p-3 bg-[#fafafa] flex flex-col items-center justify-center gap-2 overflow-hidden">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest self-start">Preview</p>
        <div className="w-full bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
          <p className="text-[11px] font-black text-gray-900 leading-tight">Figma Masterclass</p>
          <p className="text-[9px] text-gray-400 mt-0.5">by Arjun Sharma</p>
          <div className="mt-2 bg-[#E83A2E] text-white text-[9px] font-bold rounded-full px-3 py-1 inline-block">
            Buy Now — ₹999
          </div>
        </div>
      </div>
    </div>
  </div>
);

const DMGraphic = (
  <div className="mt-7 mx-auto w-full max-w-[270px] rounded-2xl bg-white border border-gray-100 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] overflow-hidden">
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 flex items-center justify-center text-white text-[10px] font-black shrink-0">P</div>
      <div>
        <p className="text-[11px] font-bold text-gray-900">@priya.designs</p>
        <p className="text-[9px] text-gray-400">82.4K followers</p>
      </div>
      <div className="ml-auto flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Bot Active
      </div>
    </div>
    <div className="px-4 pt-3 pb-1">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Trigger keyword</p>
      <div className="flex gap-1.5">
        {['COURSE', 'LINK', 'PDF'].map(k => (
          <span key={k} className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-[9px] font-black text-gray-600">{k}</span>
        ))}
      </div>
    </div>
    <div className="px-4 pt-3 pb-4 space-y-2">
      <div className="flex justify-end">
        <span className="bg-gray-100 text-gray-600 text-[10px] font-medium px-3 py-1.5 rounded-2xl rounded-br-sm">COURSE 👀</span>
      </div>
      <div className="flex justify-start">
        <div className="bg-[#E83A2E] text-white text-[10px] font-semibold px-3 py-2 rounded-2xl rounded-bl-sm max-w-[200px] leading-snug shadow-sm">
          Hey Priya! 🎉 Here's your link → digione.ai/priya/course
        </div>
      </div>
      <p className="text-[9px] text-gray-400 text-center">Replied in 0.3s · Auto</p>
    </div>
  </div>
);

const WorkflowGraphic = (
  <div className="mt-7 mx-auto w-full max-w-[270px] rounded-2xl bg-white border border-gray-100 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
      <p className="text-[11px] font-black text-gray-800">On Purchase Flow</p>
      <span className="flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Running
      </span>
    </div>
    <div className="p-4 space-y-2.5">
      {[
        { icon: '⚡', label: 'Trigger: New sale', sub: 'Rahul Verma · ₹1,499', done: true },
        { icon: '💬', label: 'WhatsApp receipt sent', sub: '+91 98765 43210', done: true },
        { icon: '📧', label: 'Mailchimp tag added', sub: '"course-buyer" list', done: true },
        { icon: '🔗', label: 'Delivery link sent', sub: 'digione.ai/access/r8xk2', done: false },
      ].map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[12px] shrink-0 ${step.done ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
            {step.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-gray-800 truncate">{step.label}</p>
            <p className="text-[9px] text-gray-400 truncate">{step.sub}</p>
          </div>
          {step.done
            ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            : <div className="w-4 h-4 rounded-full border-2 border-amber-300 border-t-transparent animate-spin shrink-0" />
          }
        </div>
      ))}
    </div>
  </div>
);

const AffiliateGraphic = (
  <div className="mt-7 w-full rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-[0_12px_40px_-10px_rgba(0,0,0,0.10)]">
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
      <p className="text-[11px] font-black text-gray-800">Affiliate Leaderboard</p>
      <span className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">This month</span>
    </div>
    <div className="divide-y divide-gray-50">
      {[
        { rank: '🥇', name: 'Sneha Iyer', sales: 34, earned: '₹18,700', pct: 72 },
        { rank: '🥈', name: 'Karan Singh', sales: 21, earned: '₹11,550', pct: 48 },
        { rank: '🥉', name: 'Ananya Roy', sales: 14, earned: '₹7,700', pct: 30 },
      ].map((r, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <span className="text-[14px] shrink-0">{r.rank}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-gray-800">{r.name}</p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-400" style={{ width: `${r.pct}%` }} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] font-black text-gray-900">{r.earned}</p>
            <p className="text-[9px] text-gray-400">{r.sales} sales</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PayoutGraphic = (
  <div className="mt-7 w-full rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-[0_12px_40px_-10px_rgba(0,0,0,0.10)]">
    <div className="p-5 bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
      <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 mb-1">Available Balance</p>
      <p className="text-[26px] font-black tracking-tight leading-none">₹1,24,850</p>
      <p className="text-[9px] opacity-60 mt-1">Cashfree · Instant UPI</p>
    </div>
    <div className="divide-y divide-gray-50">
      {[
        { name: 'Arjun Sharma', upi: 'arjun@upi', amt: '+₹4,200', time: '2 min ago', status: 'Paid' },
        { name: 'Vikram Joshi', upi: 'vikram@okicici', amt: '+₹11,500', time: '1 hr ago', status: 'Paid' },
        { name: 'Neha Kapoor', upi: 'neha@paytm', amt: '+₹3,800', time: 'Processing', status: 'Pending' },
      ].map((p, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[11px] font-black shrink-0">
            {p.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-gray-800">{p.name}</p>
            <p className="text-[9px] text-gray-400">{p.upi}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-[11px] font-black ${p.status === 'Paid' ? 'text-emerald-600' : 'text-amber-500'}`}>{p.amt}</p>
            <p className="text-[9px] text-gray-400">{p.time}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LedgerGraphic = (
  <div className="mt-7 mx-auto w-full max-w-[270px] rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-[0_12px_40px_-10px_rgba(0,0,0,0.10)]">
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
      <p className="text-[11px] font-black text-gray-800">Transaction Ledger</p>
      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">Verified</span>
    </div>
    <div className="divide-y divide-gray-50">
      {[
        { id: '#TXN-8821', name: 'Rahul Verma', amt: '₹1,499', tag: 'Course' },
        { id: '#TXN-8820', name: 'Sneha Iyer', amt: '₹499', tag: 'Ebook' },
        { id: '#TXN-8819', name: 'Karan Singh', amt: '₹2,999', tag: 'Template' },
      ].map((t, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-gray-800">{t.name}</p>
            <p className="text-[9px] text-gray-400">{t.id} · {t.tag}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] font-black text-gray-900">{t.amt}</p>
            <p className="text-[9px] text-green-500 font-bold">🔒 Locked</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const features = [
  { icon: LayoutTemplate, title: "Split-Screen Visual Builder", desc: "Build high-converting stores, Link-in-Bio pages, and funnels with our real-time split-screen editor. No code needed.", tag: "Builder", colSpan: "md:col-span-2", accent: "from-orange-500 to-[#E83A2E]", graphic: BuilderGraphic },
  { icon: MessageCircle, title: "Smart AI Instagram DMs", desc: "Turn comments into cash. Trigger automated, AI-driven DMs the moment a follower says a keyword.", tag: "AI", colSpan: "md:col-span-1", accent: "from-[#E83A2E] to-rose-500", graphic: DMGraphic },
  { icon: Zap, title: "Automated Workflows", desc: "Connect WhatsApp bots, Mailchimp, and Telegram. Let the platform do the heavy lifting while you sleep.", tag: "Automation", colSpan: "md:col-span-1", accent: "from-amber-500 to-orange-500", graphic: WorkflowGraphic },
  { icon: Network, title: "Built-in Affiliate Engine", desc: "Launch scalable affiliate programs instantly. Let your fans sell your products and earn collaboratively.", tag: "Growth", colSpan: "md:col-span-2", accent: "from-violet-500 to-indigo-500", graphic: AffiliateGraphic },
  { icon: Banknote, title: "Instant UPI Payouts", desc: "Funds hit your account via Cashfree — same day. Built on Indian-first infrastructure for real creators.", tag: "Payments", colSpan: "md:col-span-2", accent: "from-emerald-500 to-teal-500", graphic: PayoutGraphic },
  { icon: Fingerprint, title: "Tamper-proof Ledger", desc: "Every transaction securely locked. Dispute-proof records for total peace of mind.", tag: "Security", colSpan: "md:col-span-1", accent: "from-blue-500 to-cyan-500", graphic: LedgerGraphic },
];

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-36 bg-[#fafafa] relative overflow-hidden">

      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 30%, #000 10%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 30%, #000 10%, transparent 100%)',
        }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '900px', height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(232,58,46,0.06) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">

        <InView className="text-center mb-16 sm:mb-20">
          <div className="iv">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-5 bg-[#E83A2E]/[0.07] px-4 py-1.5 rounded-full border border-[#E83A2E]/15">
              Unfair Advantage
            </p>
            <h2 className="text-[2rem] sm:text-5xl md:text-[3.25rem] font-black text-gray-900 mb-5 tracking-[-0.035em] leading-[1.1]">
              Everything wired together.
              <br />
              <span className="text-gray-400 font-black">Zero duct-tape required.</span>
            </h2>
            <p className="text-base sm:text-xl font-medium text-gray-500 max-w-xl mx-auto leading-relaxed">
              Landing pages, AI bots, automation logic, and payment rails — one unified stack.
            </p>
          </div>
        </InView>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <InView key={i} style={{ '--delay': `${i * 80}ms` }} className={feat.colSpan}>
                <div className="iv relative overflow-hidden p-6 sm:p-9 rounded-[24px] sm:rounded-[28px] bg-white border border-black/[0.055] hover:border-black/[0.10] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-500 group cursor-default h-full">
                  <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${feat.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-50 border border-black/[0.05] text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">
                    {feat.tag}
                  </div>
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${feat.accent} flex items-center justify-center mb-5 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.25)] group-hover:scale-110 group-hover:-rotate-3 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-[18px] sm:text-[20px] font-black text-gray-900 mb-3 tracking-tight leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-gray-500 font-medium text-[14px] sm:text-[15px] leading-relaxed max-w-[380px]">
                    {feat.desc}
                  </p>
                  <div className="relative z-10 w-full">{feat.graphic}</div>
                  <div className={`absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-gradient-to-tl ${feat.accent} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-700 pointer-events-none`} />
                </div>
              </InView>
            );
          })}
        </div>
      </div>
    </section>
  );
}
