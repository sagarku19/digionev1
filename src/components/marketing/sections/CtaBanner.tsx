import Link from 'next/link';
import InView from '@/src/components/marketing/InView';
import { ArrowRight, Sparkles } from 'lucide-react';

const lineOneFeatures = [
  'Link in Bio', 'Landing Pages', 'Sales Funnels', 'Digital Products',
  'Courses', 'Service Checkout', 'Product Upsells', 'Waitlists',
  'Link in Bio', 'Landing Pages', 'Sales Funnels', 'Digital Products',
  'Courses', 'Service Checkout', 'Product Upsells', 'Waitlists'
];

const lineTwoFeatures = [
  'Email Marketing', 'Affiliate Engine', 'Auto DMs', 'Discount Codes',
  'Upsell Funnels', 'Real-time Analytics', 'Abandoned Cart', 'Webhooks',
  'Email Marketing', 'Affiliate Engine', 'Auto DMs', 'Discount Codes',
  'Upsell Funnels', 'Real-time Analytics', 'Abandoned Cart', 'Webhooks'
];

export default function CtaBanner() {
  return (
    <section className="py-14 sm:py-16 bg-white relative overflow-hidden pb-0">

      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            top: '-30%', left: '50%', transform: 'translateX(-50%)',
            width: '900px', height: '600px',
            background: 'radial-gradient(ellipse at center, rgba(232,58,46,0.09) 0%, rgba(255,120,60,0.05) 45%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'ctaBloom 10s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '0%', right: '-15%',
            width: '500px', height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.06) 0%, transparent 65%)',
            filter: 'blur(80px)',
            animation: 'ctaBloomB 14s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '0%', left: '-15%',
            width: '500px', height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(251,146,60,0.07) 0%, transparent 65%)',
            filter: 'blur(80px)',
            animation: 'ctaBloomC 16s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, #000 20%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, #000 20%, transparent 100%)',
          }}
        />
      </div>

      <style>{`
        @keyframes ctaBloom {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.08) translateY(-20px); }
        }
        @keyframes ctaBloomB {
          0%, 100% { transform: scale(1) translateY(0); }
          55% { transform: scale(1.1) translateY(18px); }
        }
        @keyframes ctaBloomC {
          0%, 100% { transform: scale(1) translateY(0); }
          45% { transform: scale(1.08) translateY(-15px); }
        }
        @keyframes scrollLeft {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-50% - 0.5rem)); }
        }
        @keyframes scrollRight {
          from { transform: translateX(calc(-50% - 0.5rem)); }
          to { transform: translateX(0); }
        }
        .animate-scroll-left {
          animation: scrollLeft 35s linear infinite;
        }
        .animate-scroll-right {
          animation: scrollRight 35s linear infinite;
        }
      `}</style>

      <div className="relative w-full px-5 sm:px-8 text-center z-10 flex flex-col h-full">
        <InView>
          <div className="iv max-w-4xl mx-auto flex flex-col items-center mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E83A2E]/[0.07] border border-[#E83A2E]/15 text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Everything you need
            </div>

            <h2 className="text-[32px] sm:text-[56px] md:text-[68px] font-black text-gray-900 tracking-[-0.04em] leading-[1.05] mb-6 max-w-3xl mx-auto drop-shadow-sm">
              Start selling
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #E83A2E 0%, #ff7043 60%, #E83A2E 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmer 4s linear infinite',
                }}
              >
                in 30 minutes.
              </span>
            </h2>

            <p className="text-[15px] sm:text-[19px] text-gray-500 font-medium leading-relaxed mb-8 sm:mb-10 max-w-md mx-auto px-2 sm:px-0">
              No credit card. No setup fee. Just your products, your audience, and your income.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="group w-full sm:w-auto px-9 py-4 rounded-full bg-[#E83A2E] text-white font-black text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_28px_-4px_rgba(232,58,46,0.38)] hover:shadow-[0_14px_36px_-4px_rgba(232,58,46,0.48)] hover:-translate-y-0.5 transition-all duration-300 ring-1 ring-white/10"
              >
                Create your free store
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-9 py-4 rounded-full border border-black/10 bg-white/70 backdrop-blur-md text-gray-700 font-bold text-[15px] flex items-center justify-center gap-2 hover:border-black/20 hover:bg-white transition-all duration-300 shadow-sm"
              >
                Sign in
              </Link>
            </div>

            <p className="mt-7 text-[12px] font-semibold text-gray-400 tracking-widest uppercase">
              Free forever plan &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; Setup in 2 minutes
            </p>
          </div>
        </InView>

        {/* Seamless Animated Marquee Feature List - Moved to very bottom */}
        <div className="w-full mt-auto pb-2 flex flex-col gap-3 relative pointer-events-none"
          style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>

          {/* Line 1: Sites & Product Upsells */}
          <div className="flex overflow-hidden">
            <div className="flex w-max animate-scroll-left gap-3 group hover:[animation-play-state:paused] pointer-events-auto">
              {lineOneFeatures.map((feature, i) => (
                <div
                  key={`l1-${i}`}
                  className="px-5 py-2.5 bg-white/50 backdrop-blur-md border border-white/80 rounded-xl text-[14px] font-bold text-gray-700 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] whitespace-nowrap flex items-center justify-center transition-all duration-300 hover:scale-[1.03] hover:bg-white/80 hover:border-[#E83A2E]/40 hover:text-[#E83A2E] hover:shadow-[0_8px_25px_-4px_rgba(232,58,46,0.15)] ring-1 ring-inset ring-white/30"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2 opacity-40" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Line 2: Marketing Tools */}
          <div className="flex overflow-hidden">
            <div className="flex w-max animate-scroll-right gap-3 group hover:[animation-play-state:paused] pointer-events-auto">
              {lineTwoFeatures.map((feature, i) => (
                <div
                  key={`l2-${i}`}
                  className="px-5 py-2.5 bg-white/50 backdrop-blur-md border border-white/80 rounded-xl text-[14px] font-bold text-gray-700 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] whitespace-nowrap flex items-center justify-center transition-all duration-300 hover:scale-[1.03] hover:bg-white/80 hover:border-[#E83A2E]/40 hover:text-[#E83A2E] hover:shadow-[0_8px_25px_-4px_rgba(232,58,46,0.15)] ring-1 ring-inset ring-white/30"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2 opacity-40" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
