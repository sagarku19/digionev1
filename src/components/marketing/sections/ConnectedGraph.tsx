'use client';

import { useState, type CSSProperties } from 'react';
import InView from '@/src/components/marketing/InView';
import { SectionShell } from '@/src/components/marketing/Ledger';
import { DigiOneLogoDark } from '@/src/components/assets/DigiOneLogo';
import {
  Instagram,
  Send,
  MessageCircle,
  Youtube,
  Store,
  LayoutTemplate,
  Link2,
  IndianRupee,
  TicketPercent,
  FileDown,
  UserPlus,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';

const THEME_VARS: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--cg-mut': 'rgba(22,19,15,0.33)',
    '--cg-fact': 'rgba(22,19,15,0.4)',
    '--cg-wire': 'rgba(22,19,15,0.3)',
    '--cg-dot': 'rgba(22,19,15,0.11)',
    '--cg-ghost': 'rgba(22,19,15,0.14)',
    '--cg-vwire': 'rgba(22,19,15,0.25)',
    '--cg-chip-brd': 'transparent',
    '--cg-tray-bg': 'rgba(255,255,255,0.7)',
    '--cg-tray-brd': 'rgba(22,19,15,0.08)',
    '--cg-line': 'rgba(22,19,15,0.06)',
    '--cg-card-bg': '#FFFFFF',
    '--cg-card-brd': 'rgba(22,19,15,0.08)',
    '--cg-card-ink': '#16130F',
    '--cg-card-mut': 'rgba(22,19,15,0.35)',
    '--cg-card-mut2': 'rgba(22,19,15,0.3)',
    '--cg-card-tag': 'rgba(22,19,15,0.4)',
    '--cg-card-tag-brd': 'rgba(22,19,15,0.1)',
    '--cg-spark': 'rgba(22,19,15,0.15)',
    '--cg-green': '#047857',
  },
  dark: {
    '--cg-mut': 'rgba(255,255,255,0.42)',
    '--cg-fact': 'rgba(255,255,255,0.45)',
    '--cg-wire': 'rgba(255,255,255,0.3)',
    '--cg-dot': 'rgba(255,255,255,0.1)',
    '--cg-ghost': 'rgba(255,255,255,0.18)',
    '--cg-vwire': 'rgba(255,255,255,0.28)',
    '--cg-chip-brd': 'rgba(255,255,255,0.16)',
    '--cg-tray-bg': 'rgba(255,255,255,0.06)',
    '--cg-tray-brd': 'rgba(255,255,255,0.12)',
    '--cg-line': 'rgba(255,255,255,0.1)',
    '--cg-card-bg': '#211B15',
    '--cg-card-brd': 'rgba(255,255,255,0.12)',
    '--cg-card-ink': '#F5F1EA',
    '--cg-card-mut': 'rgba(255,255,255,0.4)',
    '--cg-card-mut2': 'rgba(255,255,255,0.32)',
    '--cg-card-tag': 'rgba(255,255,255,0.45)',
    '--cg-card-tag-brd': 'rgba(255,255,255,0.16)',
    '--cg-spark': 'rgba(255,255,255,0.2)',
    '--cg-green': '#34D399',
  },
};

const PLATFORMS: { icon: LucideIcon; name: string }[] = [
  { icon: Instagram, name: 'Instagram' },
  { icon: Send, name: 'Telegram' },
  { icon: MessageCircle, name: 'WhatsApp' },
  { icon: Youtube, name: 'YouTube' },
];

const SURFACES: { icon: LucideIcon; label: string; featured?: boolean }[] = [
  { icon: Store, label: 'STORE', featured: true },
  { icon: LayoutTemplate, label: 'SITE' },
  { icon: Link2, label: 'BIO' },
  { icon: IndianRupee, label: 'PAY' },
];

const PRODUCTS = [
  { type: 'COURSE', name: 'Reels Masterclass', price: '₹1,999' },
  { type: 'PRESET', name: 'Preset Pack Vol. 3', price: '₹499' },
];

const METRICS: { label: string; value: string; detail: string; money?: boolean; spark?: boolean }[] = [
  { label: 'ANALYTICS', value: '1,284', detail: 'clicks · last 7 days', spark: true },
  { label: 'LEADS', value: '+112', detail: 'captured · 7 days' },
  { label: 'CUSTOMERS', value: '+38', detail: 'buyers today' },
  { label: 'EARNINGS', value: '₹48,290', detail: 'settled · T+0', money: true },
];

const METRIC_TOPS = ['top-[27.4%]', 'top-[41.3%]', 'top-[55.5%]', 'top-[69.4%]'];

const WIRES_INK = [
  'M140 225 V205',
  'M220 300 H410',
  'M590 300 H730',
  'M730 300 V178 Q730 170 738 170 H780',
  'M730 300 V264 Q730 256 738 256 H780',
  'M730 300 V336 Q730 344 738 344 H780',
  'M730 300 V422 Q730 430 738 430 H780',
  'M315 332 V358',
  'M440 345 V472 Q440 480 432 480 H240',
  'M500 345 V510',
];

const PULSES = [
  { d: 'M500 253 V95', dur: '2.6s', begin: '0s' },
  { d: 'M140 225 V205', dur: '2s', begin: '0.6s' },
  { d: 'M220 300 H410', dur: '2s', begin: '0.9s' },
  { d: 'M590 300 H730 V178 Q730 170 738 170 H780', dur: '2.4s', begin: '0.3s' },
  { d: 'M590 300 H730 V264 Q730 256 738 256 H780', dur: '2.4s', begin: '2.1s' },
  { d: 'M590 300 H730 V336 Q730 344 738 344 H780', dur: '2.4s', begin: '0.9s' },
  { d: 'M590 300 H730 V422 Q730 430 738 430 H780', dur: '2.4s', begin: '1.5s' },
  { d: 'M440 345 V472 Q440 480 432 480 H240', dur: '2.4s', begin: '1.8s' },
  { d: 'M500 345 V510', dur: '2.6s', begin: '1.2s' },
];

const FACTS = [
  'SHORT LINKS — GEO · DEVICE · REFERRER',
  'AUTO DM — COMMENT → REPLY IN 0.3s',
  'INSTANT DELIVERY — FILES · LINKS · LIBRARY',
];

const Junction = ({
  label,
  route,
  step,
  className = '',
}: {
  label: string;
  route?: string;
  step?: string;
  className?: string;
}) => (
  <span className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 ${className}`}>
    {step && (
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 font-ledger text-[8px] text-[color:var(--cg-mut)] whitespace-nowrap">
        {step} /
      </span>
    )}
    <span className="inline-flex items-center bg-[#16130F] border border-[color:var(--cg-chip-brd)] text-white rounded-md px-3 py-1.5 font-ledger text-[9.5px] font-medium tracking-[0.14em] whitespace-nowrap">
      {label}
    </span>
    {route && (
      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 font-ledger text-[8px] text-[color:var(--cg-mut)] whitespace-nowrap">
        {route}
      </span>
    )}
  </span>
);

const ShortLinkChip = () => (
  <span className="inline-flex items-center gap-2 bg-[#16130F] border border-[color:var(--cg-chip-brd)] text-white rounded-md px-3 py-1.5 font-ledger text-[10px] font-medium whitespace-nowrap">
    <span className="relative flex w-1.5 h-1.5">
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
    </span>
    <span>
      linkln.me<span className="text-[#FF6B5C]">/zpk4de</span>
    </span>
  </span>
);

const LeadFormChip = () => (
  <span className="inline-flex items-center gap-2 bg-[color:var(--cg-card-bg)] border border-[color:var(--cg-card-brd)] rounded-md px-3 py-1.5 font-ledger text-[9px] font-semibold tracking-[0.1em] text-[color:var(--cg-card-ink)] whitespace-nowrap">
    LEAD FORM
    <span className="font-medium text-[color:var(--cg-green)]">+38 today</span>
  </span>
);

const FollowersChip = () => (
  <span className="h-[34px] rounded-md border border-[color:var(--cg-card-brd)] bg-[color:var(--cg-card-bg)] px-3 inline-flex items-center gap-1.5 font-ledger text-[9px] text-[color:var(--cg-card-ink)] whitespace-nowrap shadow-[0_8px_24px_-16px_rgba(22,19,15,0.25)]">
    <UserPlus className="w-3 h-3 text-[color:var(--cg-green)]" strokeWidth={1.8} />
    +126 followers
  </span>
);

const CouponTag = () => (
  <span className="inline-flex items-center gap-1.5 bg-[color:var(--cg-card-bg)] border border-dashed border-[#E83A2E]/45 rounded-md px-2.5 py-1 font-ledger text-[8.5px] font-semibold tracking-[0.1em] text-[#E83A2E] whitespace-nowrap">
    <TicketPercent className="w-3 h-3" strokeWidth={1.8} />
    COUPON · AFFILIATE
  </span>
);

const LibraryCard = ({ className = '' }: { className?: string }) => (
  <div
    className={`rounded-lg border border-[color:var(--cg-card-brd)] bg-[color:var(--cg-card-bg)] shadow-[0_8px_24px_-16px_rgba(22,19,15,0.25)] px-3 py-2.5 w-[176px] ${className}`}
  >
    <p className="font-ledger text-[8.5px] tracking-[0.16em] text-[color:var(--cg-card-mut)]">BUYER LIBRARY</p>
    <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-[color:var(--cg-card-ink)]">
      <FileDown className="w-3 h-3 shrink-0" strokeWidth={1.8} />
      files.zip
      <span className="ml-auto font-ledger text-[8.5px] font-normal text-[#E83A2E]">↓ download</span>
    </p>
    <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-[color:var(--cg-card-ink)]">
      <Link2 className="w-3 h-3 shrink-0" strokeWidth={1.8} />
      bonus links ×3
      <span className="ml-auto font-ledger text-[8.5px] font-normal text-[#E83A2E]">→ open</span>
    </p>
    <p className="mt-1.5 font-ledger text-[8px] text-[color:var(--cg-card-mut2)]">instant · no email chasing</p>
  </div>
);

const PlatformChip = ({ icon: Icon, name }: { icon: LucideIcon; name: string }) => (
  <span className="inline-flex items-center gap-1.5 bg-[color:var(--cg-card-bg)] border border-[color:var(--cg-card-brd)] rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[color:var(--cg-card-ink)] whitespace-nowrap">
    <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
    {name}
  </span>
);

const HubCard = ({ className = '' }: { className?: string }) => (
  <div
    className={`relative rounded-xl bg-[#16130F] border border-[color:var(--cg-chip-brd)] px-5 py-4 text-center overflow-hidden shadow-[0_24px_60px_-30px_rgba(22,19,15,0.55)] ${className}`}
  >
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(circle at 85% 15%, rgba(232,58,46,0.28) 0%, transparent 55%)' }}
    />
    <div className="relative flex justify-center">
      <DigiOneLogoDark width={30} height={30} />
    </div>
    <p className="relative font-ledger text-[9px] text-white/40 mt-2">{'>>'} /dashboard</p>
  </div>
);

const SurfaceTile = ({ icon: Icon, label, featured }: { icon: LucideIcon; label: string; featured?: boolean }) => (
  <span
    className={`w-[52px] rounded-lg border flex flex-col items-center justify-center gap-1 py-2 ${
      featured ? 'bg-[#16130F] border-[color:var(--cg-chip-brd)]' : 'bg-[color:var(--cg-card-bg)] border-[color:var(--cg-card-brd)]'
    }`}
  >
    <Icon className={`w-4 h-4 ${featured ? 'text-[#FF6B5C]' : 'text-[color:var(--cg-card-ink)]'}`} strokeWidth={1.8} />
    <span className={`font-ledger text-[7px] tracking-[0.12em] ${featured ? 'text-white/60' : 'text-[color:var(--cg-card-tag)]'}`}>
      {label}
    </span>
  </span>
);

const ProductMini = ({ className = '' }: { className?: string }) => (
  <div className={`rounded-lg border border-[color:var(--cg-card-brd)] bg-[color:var(--cg-card-bg)] px-2.5 py-2 space-y-1.5 ${className}`}>
    {PRODUCTS.map((p) => (
      <div key={p.name} className="flex items-center gap-1.5">
        <span className="font-ledger text-[6.5px] tracking-[0.08em] text-[color:var(--cg-card-tag)] border border-[color:var(--cg-card-tag-brd)] rounded px-1 py-0.5 shrink-0">
          {p.type}
        </span>
        <span className="text-[10px] font-semibold text-[color:var(--cg-card-ink)] truncate">{p.name}</span>
        <span className="ml-auto font-ledger text-[9.5px] text-[color:var(--cg-card-ink)] shrink-0">{p.price}</span>
      </div>
    ))}
  </div>
);

const MetricCard = ({
  label,
  value,
  detail,
  money = false,
  spark = false,
  compact = false,
}: {
  label: string;
  value: string;
  detail: string;
  money?: boolean;
  spark?: boolean;
  compact?: boolean;
}) => (
  <div
    className={`rounded-lg border border-[color:var(--cg-card-brd)] bg-[color:var(--cg-card-bg)] shadow-[0_8px_24px_-16px_rgba(22,19,15,0.25)] ${
      compact ? 'px-2.5 py-2' : 'px-3.5 py-2.5 w-[160px]'
    }`}
  >
    <p className="font-ledger text-[8.5px] tracking-[0.16em] text-[color:var(--cg-card-mut)]">{label}</p>
    <div className="flex items-end justify-between gap-2 mt-0.5">
      <p
        className={`font-ledger font-semibold leading-none tracking-tight text-[color:var(--cg-card-ink)] ${
          compact ? 'text-[13px]' : 'text-[17px]'
        }`}
      >
        {value}
      </p>
      {spark && !compact && (
        <span aria-hidden="true" className="flex items-end gap-[2px] h-4">
          {[35, 55, 40, 70, 60, 100].map((h, i) => (
            <span
              key={i}
              style={{ height: `${h}%` }}
              className={`w-[3px] rounded-sm ${i === 5 ? 'bg-[#E83A2E]' : 'bg-[color:var(--cg-spark)]'}`}
            />
          ))}
        </span>
      )}
    </div>
    <p className={`font-ledger text-[8.5px] mt-1 ${money ? 'text-[color:var(--cg-green)]' : 'text-[color:var(--cg-card-mut2)]'}`}>{detail}</p>
  </div>
);

const VWire = () => (
  <span aria-hidden="true" className="block mx-auto h-7 w-0 border-l border-dashed border-[color:var(--cg-vwire)]" />
);

export default function ConnectedGraph() {
  const [dark, setDark] = useState(false);

  const themeToggle = (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${
        dark ? 'border-white/[0.16] bg-white/[0.06]' : 'border-black/[0.1] bg-white'
      }`}
    >
      <button
        type="button"
        aria-label="Light mode"
        aria-pressed={!dark}
        onClick={() => setDark(false)}
        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors duration-300 ${
          !dark ? 'bg-[#16130F] text-white' : 'text-white/40 hover:text-white/70'
        }`}
      >
        <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.8} />
      </button>
      <button
        type="button"
        aria-label="Dark mode"
        aria-pressed={dark}
        onClick={() => setDark(true)}
        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors duration-300 ${
          dark ? 'bg-white text-[#16130F]' : 'text-black/35 hover:text-black/60'
        }`}
      >
        <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.8} />
      </button>
    </span>
  );

  return (
    <SectionShell
      id="cg-graph"
      index="03"
      route="/dashboard"
      title={
        <span className="lg:whitespace-nowrap">
          Every tool on one wire.{' '}
          <span className="text-[#E83A2E]">Runs itself.</span>
        </span>
      }
      sub="Sell, grow, track, get paid — one dashboard. Every block feeds the next, no glue code."
      aside={<div className="hidden lg:block lg:mt-1.5">{themeToggle}</div>}
      tone={dark ? 'ink' : 'paper'}
    >
      <style>{`
        @keyframes cgDash { to { stroke-dashoffset: -16; } }
        #cg-graph { transition: background-color 0.5s ease; }
        #cg-graph h2, #cg-graph p, #cg-graph span, #cg-graph div {
          transition: color 0.4s ease, background-color 0.4s ease, border-color 0.4s ease;
        }
        #cg-graph svg * { transition: stroke 0.45s ease; }
      `}</style>

      <div style={THEME_VARS[dark ? 'dark' : 'light'] as CSSProperties}>
        {/* Theme toggle on small screens — control row below the header (on lg it lives in the header aside) */}
        <div className="mt-6 sm:mt-8 flex justify-end lg:hidden">
          {themeToggle}
        </div>

        {/* ---------- Desktop diagram ---------- */}
        <InView className="mt-4 sm:mt-5 lg:mt-8">
          <div className="iv hidden lg:block relative w-full aspect-[1000/585] select-none">
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(var(--cg-dot) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
                WebkitMaskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, #000 35%, transparent 100%)',
                maskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, #000 35%, transparent 100%)',
              }}
            />

            <svg
              aria-hidden="true"
              viewBox="0 0 1000 620"
              preserveAspectRatio="none"
              fill="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <g strokeWidth="1.8" strokeLinecap="round" strokeDasharray="0.5 7.5">
                {WIRES_INK.map((d) => (
                  <path key={d} d={d} style={{ stroke: 'var(--cg-wire)', animation: 'cgDash 1.4s linear infinite' }} />
                ))}
                <path
                  d="M500 253 V95"
                  stroke="rgba(232,58,46,0.55)"
                  style={{ animation: 'cgDash 1.4s linear infinite' }}
                />
              </g>
              {PULSES.map((p, i) => (
                <g key={i}>
                  <circle r="7" fill="rgba(232,58,46,0.16)">
                    <animateMotion dur={p.dur} begin={p.begin} repeatCount="indefinite" path={p.d} />
                  </circle>
                  <circle r="2.6" fill="#E83A2E">
                    <animateMotion dur={p.dur} begin={p.begin} repeatCount="indefinite" path={p.d} />
                  </circle>
                </g>
              ))}
            </svg>

            {/* Share tray */}
            <div className="absolute left-1/2 top-[10%] -translate-x-1/2 -translate-y-1/2 z-10 w-[54%]">
              <div className="rounded-xl border border-[color:var(--cg-tray-brd)] bg-[color:var(--cg-tray-bg)] backdrop-blur-[2px] px-3 py-2.5 flex items-center justify-center gap-2">
                {PLATFORMS.map((p) => (
                  <PlatformChip key={p.name} {...p} />
                ))}
                <span aria-hidden="true" className="hidden xl:block w-12 h-[30px] rounded-lg border border-dashed border-[color:var(--cg-ghost)]" />
              </div>
              <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-ledger text-[9px] tracking-[0.14em] text-[color:var(--cg-mut)] whitespace-nowrap">
                DROP YOUR LINK ANYWHERE
              </p>
            </div>

            {/* Short link */}
            <span className="absolute left-1/2 top-[27.4%] -translate-x-1/2 -translate-y-1/2 z-10">
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 font-ledger text-[8px] text-[color:var(--cg-mut)] whitespace-nowrap">
                01 /
              </span>
              <ShortLinkChip />
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 font-ledger text-[8px] text-[color:var(--cg-mut)] whitespace-nowrap">
                /dashboard/links
              </span>
            </span>

            {/* Lead capture */}
            <span className="absolute left-[14%] top-[25.5%] -translate-x-1/2 -translate-y-1/2 z-10">
              <LeadFormChip />
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 font-ledger text-[8px] text-[color:var(--cg-mut)] whitespace-nowrap">
                /dashboard/marketing/leads
              </span>
            </span>

            {/* Products + storefront surfaces */}
            <div className="absolute left-[14%] top-[48.4%] -translate-x-1/2 -translate-y-1/2 z-10 w-[150px]">
              <ProductMini />
              <div className="mt-2 grid grid-cols-2 gap-2 justify-items-center">
                {SURFACES.map((s) => (
                  <SurfaceTile key={s.label} {...s} />
                ))}
              </div>
              <p className="mt-2 text-center font-ledger text-[8.5px] tracking-[0.16em] text-[color:var(--cg-mut)]">
                YOUR CATALOG
              </p>
              <p className="mt-0.5 text-center font-ledger text-[8px] text-[color:var(--cg-mut)]">/dashboard/products · /sites</p>
            </div>

            <Junction label="CHECKOUT" route="/checkout" step="02" className="left-[31.5%] top-[48.4%]" />

            {/* Coupon + affiliate levers feeding checkout */}
            <span className="absolute left-[31.5%] top-[61%] -translate-x-1/2 -translate-y-1/2 z-10">
              <CouponTag />
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 font-ledger text-[8px] text-[color:var(--cg-mut)] whitespace-nowrap">
                /dashboard/marketing
              </span>
            </span>

            <Junction label="TRACKING" route="/dashboard/analytics" step="04" className="left-[66%] top-[48.4%]" />
            <Junction label="AUTO DM" route="/dashboard/autodm" step="05" className="left-1/2 top-[69.4%]" />

            <div className="absolute left-1/2 top-[48.4%] -translate-x-1/2 -translate-y-1/2 z-10 w-[180px]">
              <HubCard />
            </div>

            {METRICS.map((m, i) => (
              <div key={m.label} className={`absolute left-[86.5%] ${METRIC_TOPS[i]} -translate-x-1/2 -translate-y-1/2 z-10`}>
                <MetricCard {...m} />
              </div>
            ))}

            {/* Buyer library — instant delivery */}
            <div className="absolute left-[14%] top-[82%] -translate-x-1/2 -translate-y-1/2 z-10">
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 font-ledger text-[8px] text-[color:var(--cg-mut)] whitespace-nowrap">
                03 / DELIVERY
              </span>
              <LibraryCard />
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 font-ledger text-[8px] text-[color:var(--cg-mut)] whitespace-nowrap">
                /account/library
              </span>
            </div>

            {/* DM queue */}
            <div className="absolute left-1/2 top-[86.5%] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
              <span aria-hidden="true" className="w-16 h-[34px] rounded-md border border-dashed border-[color:var(--cg-ghost)]" />
              <span className="h-[34px] rounded-md border border-[color:var(--cg-card-brd)] bg-[color:var(--cg-card-bg)] px-3 flex items-center font-ledger text-[9px] text-[color:var(--cg-card-ink)] whitespace-nowrap shadow-[0_8px_24px_-16px_rgba(22,19,15,0.25)]">
                <span className="ml-1">digione.ai<span className="text-[#E83A2E]">/link/..</span></span>
              </span>
              <FollowersChip />
              <span aria-hidden="true" className="w-16 h-[34px] rounded-md border border-dashed border-[color:var(--cg-ghost)]" />
            </div>
            <p className="absolute left-1/2 top-[94.5%] -translate-x-1/2 font-ledger text-[9px] tracking-[0.1em] text-[color:var(--cg-mut)] whitespace-nowrap">
              comment &ldquo;LINK&rdquo; → follow-gate → reply · 0.3s · while you sleep
            </p>
          </div>
        </InView>

        {/* ---------- Mobile flow ---------- */}
        <InView className="mt-8 lg:hidden">
          <div className="iv">
            <div className="rounded-xl border border-[color:var(--cg-tray-brd)] bg-[color:var(--cg-tray-bg)] px-3 py-2.5 flex flex-wrap items-center justify-center gap-2">
              {PLATFORMS.map((p) => (
                <PlatformChip key={p.name} {...p} />
              ))}
            </div>
            <p className="mt-2 text-center font-ledger text-[9px] tracking-[0.14em] text-[color:var(--cg-mut)]">
              DROP YOUR LINK ANYWHERE
            </p>

            <VWire />
            <div className="flex justify-center">
              <ShortLinkChip />
            </div>

            <VWire />
            <div className="max-w-[240px] mx-auto">
              <HubCard />
            </div>

            <VWire />
            <ProductMini className="max-w-[260px] mx-auto" />
            <div className="mt-2 flex justify-center gap-2">
              {SURFACES.map((s) => (
                <SurfaceTile key={s.label} {...s} />
              ))}
            </div>

            <VWire />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <CouponTag />
              <LeadFormChip />
            </div>

            <VWire />
            <LibraryCard className="mx-auto" />

            <VWire />
            <div className="grid grid-cols-2 gap-2">
              {METRICS.map((m) => (
                <MetricCard key={m.label} {...m} compact />
              ))}
            </div>

            <VWire />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center bg-[#16130F] border border-[color:var(--cg-chip-brd)] text-white rounded-md px-3 py-1.5 font-ledger text-[9.5px] font-medium tracking-[0.14em]">
                AUTO DM
              </span>
              <FollowersChip />
            </div>
            <p className="mt-2 text-center font-ledger text-[9px] tracking-[0.1em] text-[color:var(--cg-mut)]">
              comment &ldquo;LINK&rdquo; → follow-gate → reply · 0.3s
            </p>
          </div>
        </InView>

        <InView className="mt-8 sm:mt-10 lg:mt-0 -mb-8 sm:-mb-12 lg:-mb-14">
          <div className="iv border-t border-[color:var(--cg-line)] pt-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-x-8 sm:gap-y-3 sm:justify-between">
            {FACTS.map((f) => (
              <span key={f} className="font-ledger text-[10px] sm:text-[11px] tracking-[0.12em] text-[color:var(--cg-fact)]">
                <span aria-hidden="true" className="text-[#E83A2E] mr-2">✳</span>
                {f}
              </span>
            ))}
          </div>
        </InView>
      </div>
    </SectionShell>
  );
}
