import InView from '@/src/components/marketing/InView';
import { Rails, Kicker } from '@/src/components/marketing/Ledger';

const RAIL_STEPS = [
  {
    title: 'Buyer pays',
    desc: 'UPI, cards, and netbanking through Cashfree-hosted checkout.',
  },
  {
    title: 'Payment verified',
    desc: 'A signed webhook confirms the charge server-side. No client-side trust.',
  },
  {
    title: 'Access delivered',
    desc: 'Files and courses unlock the moment the payment clears.',
  },
  {
    title: 'Balance credited',
    desc: 'A hash-stamped entry lands in your earnings ledger.',
  },
  {
    title: 'Payout, instantly',
    desc: 'Withdraw to your bank over UPI whenever you want.',
  },
];

const FACTS = [
  'FLAT 10% FEE — YOU KEEP 90%',
  'KYC-SECURED WITHDRAWALS',
  'POWERED BY CASHFREE',
];

export default function MoneyRail() {
  return (
    <section className="relative bg-[#16130F] overflow-hidden">
      {/* Atmosphere */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div
          className="absolute rounded-full"
          style={{
            top: '-30%', left: '50%', transform: 'translateX(-50%)',
            width: '900px', height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(232,58,46,0.14) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
          <filter id="money-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.70" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#money-grain)" />
        </svg>
      </div>

      <style>{`
        @keyframes railDash { to { stroke-dashoffset: -14; } }
      `}</style>

      <Rails tone="ink">
        <div className="px-5 sm:px-10 lg:px-14 py-14 sm:py-20 lg:py-24">
          <InView>
            <div className="iv">
              <Kicker index="03" route="/dashboard/earnings" dark />
              <div className="mt-7 sm:mt-9 max-w-2xl">
                <h2 className="text-[28px] sm:text-[38px] lg:text-[44px] font-bold tracking-[-0.03em] leading-[1.08] text-white">
                  Money moves like clockwork.
                </h2>
                <p className="mt-4 text-[15px] sm:text-[16px] leading-relaxed font-medium text-white/55">
                  Every rupee follows one verified path — no manual confirmation, no
                  payment limbo, no spreadsheets at midnight.
                </p>
              </div>
            </div>
          </InView>

          <InView className="mt-12 sm:mt-16">
            <div className="iv relative">
              {/* Connector — desktop */}
              <svg
                aria-hidden="true"
                className="hidden lg:block absolute top-[5px] left-[5%] right-[5%] w-[90%] h-[2px] overflow-visible"
                preserveAspectRatio="none"
                viewBox="0 0 100 2"
                fill="none"
              >
                <path
                  d="M0 1 H100"
                  stroke="rgba(232,58,46,0.55)"
                  strokeWidth="1.5"
                  strokeDasharray="5 9"
                  vectorEffect="non-scaling-stroke"
                  style={{ animation: 'railDash 1.2s linear infinite' }}
                />
              </svg>

              <ol className="grid grid-cols-1 lg:grid-cols-5 gap-y-10 lg:gap-x-8">
                {RAIL_STEPS.map((step, i) => (
                  <li key={i} className="relative lg:pt-9 flex lg:block items-start gap-4">
                    {/* Node */}
                    <span className="lg:absolute lg:top-0 lg:left-0 mt-1 lg:mt-0 w-[11px] h-[11px] rounded-full bg-[#E83A2E] shadow-[0_0_0_4px_rgba(232,58,46,0.18)] shrink-0" />
                    <div>
                      <p className="font-ledger text-[10px] text-white/30 mb-1.5 tracking-[0.1em]">
                        {String(i + 1).padStart(2, '0')} /
                      </p>
                      <h3 className="text-[15px] font-bold text-white tracking-tight mb-1.5">{step.title}</h3>
                      <p className="text-[13px] text-white/45 font-medium leading-relaxed max-w-[36ch] lg:max-w-none">
                        {step.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </InView>

          <InView className="mt-12 sm:mt-16">
            <div className="iv border-t border-white/[0.09] pt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
              {FACTS.map((f, i) => (
                <span key={i} className="font-ledger text-[10px] sm:text-[11px] tracking-[0.12em] text-white/40">
                  <span aria-hidden="true" className="text-[#FF6B5C] mr-2">✳</span>
                  {f}
                </span>
              ))}
            </div>
          </InView>
        </div>
      </Rails>
    </section>
  );
}
