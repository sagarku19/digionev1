import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { DigiOneLogo } from '@/src/components/assets/DigiOneLogo';

const FEATURES = [
  'UPI payouts within 24 hours',
  'Lowest 5% platform fee on Pro',
  'Your store goes live instantly',
  'Affiliate engine built-in',
];

const METRICS = [
  { value: '₹4.2 Cr+', label: 'earned by creators' },
  { value: '12,400+', label: 'products sold' },
  { value: '99.9%', label: 'checkout uptime' },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white selection:bg-[#E83A2E]/15">

      {/* ══════════════════════════════════════════
          LEFT BRANDING PANEL — 40%
      ══════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col w-[40%] shrink-0 relative overflow-hidden bg-[#FAF8F6] border-r border-black/[0.08]">

        {/* Graph-paper field */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(22,19,15,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 0%, #000 0%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 90% 80% at 50% 0%, #000 0%, transparent 100%)',
          }}
        />

        {/* ── Logo ── */}
        <div className="relative z-10 px-12 pt-10">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <DigiOneLogo width={24} height={24} className="group-hover:scale-105 transition-transform duration-300 shrink-0" />
            <span className="text-[17px] font-bold tracking-tight text-[#16130F]">
              DigiOne<span className="font-ledger text-[9px] text-[#E83A2E] font-semibold ml-0.5 align-super">.ai</span>
            </span>
          </Link>
        </div>

        {/* ── Main copy ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12 py-6">

          {/* Kicker */}
          <p className="font-ledger text-[11px] font-medium tracking-[0.08em] text-black/45 uppercase mb-7">
            <span className="text-[#E83A2E] font-semibold">{'>>'}</span>
            &nbsp;&nbsp;10,000+ Indian creators · Live
          </p>

          {/* Headline */}
          <h1 className="text-[36px] lg:text-[44px] font-bold tracking-[-0.035em] leading-[1.05] text-[#16130F] mb-5">
            Build your creator
            <br />
            <span className="text-[#E83A2E]">business.</span>
          </h1>

          {/* Subtext */}
          <p className="text-[14px] text-black/50 font-medium leading-relaxed mb-10 max-w-[280px]">
            Automate your sales, DMs, and payouts —{' '}
            <span className="text-[#16130F] font-semibold">no code needed.</span>
          </p>

          {/* Feature ledger */}
          <div className="space-y-3 mb-12">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3.5">
                <span className="font-ledger text-[10px] font-semibold text-[#E83A2E] shrink-0">
                  {'>>'}
                </span>
                <span className="text-[13.5px] font-medium text-black/65">{f}</span>
              </div>
            ))}
          </div>

          {/* Metrics strip */}
          <div className="border-y border-black/[0.08] grid grid-cols-3 divide-x divide-black/[0.08] w-fit">
            {METRICS.map((m) => (
              <div key={m.label} className="px-5 first:pl-0 py-4">
                <p className="font-ledger text-[17px] font-semibold tracking-tight text-[#16130F] leading-none">
                  {m.value}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-black/40">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom footer ── */}
        <div className="relative z-10 px-12 pb-8">
          <div className="h-px bg-black/[0.07] mb-4" />
          <p className="font-ledger text-[10px] text-black/35">
            © {new Date().getFullYear()} DigiOne.ai · All rights reserved
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT FORM PANEL
      ══════════════════════════════════════════ */}
      <div className="relative flex-1 flex flex-col justify-center items-center min-h-screen bg-white px-4 py-6 sm:px-8 overflow-y-auto">

        <Link
          href="/"
          aria-label="Back to home"
          title="Back to home"
          className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/[0.1] bg-black/[0.04] text-black/50 transition hover:text-[#16130F] hover:bg-black/[0.08] focus-visible:outline-none"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>

        {/* Mobile logo */}
        <div className="md:hidden mb-5 flex items-center gap-2">
          <DigiOneLogo width={24} height={24} />
          <span className="text-[16px] font-bold tracking-tight text-[#16130F]">
            DigiOne<span className="font-ledger text-[9px] text-[#E83A2E] font-semibold ml-0.5 align-super">.ai</span>
          </span>
        </div>

        {/* Form card */}
        <div className="w-full max-w-[400px] bg-white rounded-xl border border-black/[0.1] shadow-[0_16px_50px_-30px_rgba(22,19,15,0.25)] px-5 py-6 sm:px-7 sm:py-7">
          {children}
        </div>
      </div>
    </div>
  );
}
