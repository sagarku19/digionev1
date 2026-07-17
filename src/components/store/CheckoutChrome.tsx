'use client';

// Minimal commerce chrome for the buyer cart/checkout flow — deliberately NOT
// the marketing nav (fewer exits on a conversion surface). Engineered-ledger
// language: ink/vermilion/paper, font-ledger step indicator + secure badge.
// /cart and /checkout are both one-page checkouts (products + pay together), so
// the flow is just Checkout → Access. Mounted once in the (buyer) layout.

import Link from 'next/link';
import { Lock, Check } from 'lucide-react';
import { DigiOneLogo } from '@/src/components/assets/DigiOneLogo';

const STEPS = [
  { key: 'checkout', label: 'Checkout' },
  { key: 'done', label: 'Access' },
] as const;

export default function CheckoutChrome() {
  const activeIdx = 0;

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.07] bg-[#FAF8F6]/85 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Wordmark */}
          <Link
            href="/discover"
            className="group flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/20"
          >
            <DigiOneLogo width={20} height={20} className="transition-transform duration-300 group-hover:scale-105" />
            <span className="text-[15px] font-bold tracking-tight text-[#16130F]">
              DigiOne<span className="font-ledger align-super text-[9px] font-semibold text-[#E83A2E] ml-0.5">.ai</span>
            </span>
          </Link>

          {/* Step indicator — desktop */}
          <ol className="hidden items-center gap-2.5 font-ledger text-[10px] uppercase tracking-[0.16em] sm:flex">
            {STEPS.map((s, i) => {
              const done = i < activeIdx;
              const active = i === activeIdx;
              return (
                <li key={s.key} className="flex items-center gap-2.5">
                  <span className={`flex items-center gap-1.5 ${active ? 'text-[#16130F]' : done ? 'text-[#16130F]/70' : 'text-black/30'}`}>
                    <span
                      className={`grid h-4 w-4 place-items-center rounded-full text-[9px] leading-none ${
                        active
                          ? 'bg-[#E83A2E] text-white'
                          : done
                          ? 'bg-[#16130F] text-white'
                          : 'border border-black/15 text-black/30'
                      }`}
                    >
                      {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : i + 1}
                    </span>
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && <span aria-hidden="true" className="text-[#E83A2E]/50">{'>>'}</span>}
                </li>
              );
            })}
          </ol>

          {/* Secure badge */}
          <div className="flex items-center gap-1.5 font-ledger text-[10px] uppercase tracking-[0.16em] text-black/45">
            <Lock className="h-3.5 w-3.5 text-[#16130F]/60" strokeWidth={2} />
            <span>Secure</span>
            <span className="hidden sm:inline">·&nbsp;256-bit SSL</span>
          </div>
        </div>
      </div>
    </header>
  );
}
