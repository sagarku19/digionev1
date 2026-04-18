import Link from 'next/link';
import InView from '@/src/components/marketing/InView';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function CtaBanner() {
  return (
    <section className="py-28 sm:py-36 bg-white relative overflow-hidden pb-0">

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
      `}</style>

      <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center z-10">
        <InView>
          <div className="iv">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E83A2E]/[0.07] border border-[#E83A2E]/15 text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              Get started today
            </div>

            <h2 className="text-[42px] sm:text-[56px] md:text-[68px] font-black text-gray-900 tracking-[-0.04em] leading-[1.05] mb-6">
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

            <p className="text-[17px] sm:text-[19px] text-gray-500 font-medium leading-relaxed mb-10 max-w-md mx-auto">
              No credit card. No setup fee. Just your products, your audience, and your income.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="group w-full sm:w-auto px-9 py-4 rounded-full bg-[#E83A2E] text-white font-black text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_28px_-4px_rgba(232,58,46,0.38)] hover:shadow-[0_14px_36px_-4px_rgba(232,58,46,0.48)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Create your free store
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-9 py-4 rounded-full border border-black/10 bg-white text-gray-700 font-bold text-[15px] flex items-center justify-center gap-2 hover:border-black/20 hover:bg-gray-50 transition-all duration-300"
              >
                Sign in
              </Link>
            </div>

            <p className="mt-7 text-[12px] font-semibold text-gray-400 tracking-widest uppercase">
              Free forever plan &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; Setup in 2 minutes
            </p>
          </div>
        </InView>
      </div>
    </section>
  );
}
