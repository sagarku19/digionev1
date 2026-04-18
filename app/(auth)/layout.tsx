import { ReactNode } from 'react';
import Link from 'next/link';
import { Star, CheckCircle2 } from 'lucide-react';
import { DigiOneLogo } from '@/src/components/assets/DigiOneLogo';

const FEATURES = [
  'UPI payouts within 24 hours',
  'Lowest 5% platform fee on Pro',
  'Your store goes live instantly',
  'Affiliate engine built-in',
];

const AVATARS = [
  'https://i.pravatar.cc/40?img=1',
  'https://i.pravatar.cc/40?img=5',
  'https://i.pravatar.cc/40?img=9',
  'https://i.pravatar.cc/40?img=12',
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ══════════════════════════════════════════
          LEFT BRANDING PANEL — 40%
      ══════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col w-[40%] shrink-0 relative overflow-hidden" style={{
        background: 'linear-gradient(160deg, #ffffff 0%, #fdf9f8 60%, #fef3f1 100%)',
      }}>

        {/* ── Decorative background ── */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Large red glow — top right */}
          <div style={{
            position: 'absolute', top: '-20%', right: '-25%',
            width: '600px', height: '600px',
            backgroundImage: 'radial-gradient(circle, rgba(232,58,46,0.09) 0%, transparent 60%)',
            filter: 'blur(70px)',
          }} />
          {/* Small warm glow — bottom left */}
          <div style={{
            position: 'absolute', bottom: '-15%', left: '-20%',
            width: '450px', height: '450px',
            backgroundImage: 'radial-gradient(circle, rgba(255,140,60,0.07) 0%, transparent 60%)',
            filter: 'blur(80px)',
          }} />
          {/* Dot grid — fades to bottom */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 75%)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 75%)',
          }} />
          {/* Thin red accent line — left edge */}
          <div style={{
            position: 'absolute', top: '12%', left: 0,
            width: '3px', height: '76%',
            backgroundImage: 'linear-gradient(to bottom, transparent, rgba(232,58,46,0.25), transparent)',
            borderRadius: '0 2px 2px 0',
          }} />
        </div>

        <style>{`
          @keyframes lp-shimmer {
            from { background-position: 0% center; }
            to   { background-position: 200% center; }
          }
          @keyframes lp-dot {
            0%,100% { opacity:1; transform:scale(1); }
            50%      { opacity:.35; transform:scale(.7); }
          }
        `}</style>

        {/* ── Logo ── */}
        <div className="relative z-10 px-12 pt-12">
          <Link href="/" className="inline-flex items-center gap-3.5 group">
            <DigiOneLogo
              width={44}
              height={44}
              className="group-hover:scale-105 transition-transform duration-300 shrink-0"
            />
            <div className="leading-none">
              <span className="text-[22px] font-black tracking-[-0.03em] text-gray-900">
                DigiOne
              </span>
              <sup className="text-[10px] text-gray-400 font-bold ml-0.5 relative -top-3">.ai</sup>
            </div>
          </Link>
        </div>

        {/* ── Main copy ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12 py-6">

          {/* Live pill */}
          <div className="inline-flex items-center gap-2 self-start mb-8 px-3 py-1.5 rounded-full bg-white/80 border border-black/[0.07] shadow-[0_2px_8px_rgba(0,0,0,0.05)] backdrop-blur-sm">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] shrink-0"
              style={{ animation: 'lp-dot 2.2s ease-in-out infinite' }}
            />
            <span className="text-[11.5px] font-semibold text-gray-500 tracking-wide">
              <strong className="text-gray-800 font-bold">10,000+</strong> Indian creators · Live
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-black tracking-[-0.04em] leading-[1.05] mb-5"
            style={{ fontSize: 'clamp(36px, 3.2vw, 50px)' }}
          >
            <span className="text-gray-900">Build your creator</span>
            <br />
            <span style={{
              backgroundImage: 'linear-gradient(135deg, #E83A2E 0%, #ff7040 55%, #E83A2E 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              animation: 'lp-shimmer 6s linear infinite',
            }}>
              business.
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-[14px] text-gray-400 font-medium leading-[1.75] mb-10 max-w-[240px]">
            Automate your sales, DMs, and payouts —{' '}
            <span className="text-gray-600 font-semibold">no code needed.</span>
          </p>

          {/* Feature checklist */}
          <div className="space-y-3.5 mb-12">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#E83A2E]/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#E83A2E]" strokeWidth={2.5} />
                </div>
                <span className="text-[13px] font-medium text-gray-600">{f}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/70 border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] backdrop-blur-sm w-fit">
            <div className="flex -space-x-2">
              {AVATARS.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
                />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-0.5 mb-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[11.5px] font-semibold text-gray-500 leading-none">
                Loved by creators across India
              </p>
            </div>
          </div>
        </div>

        {/* ── Bottom footer ── */}
        <div className="relative z-10 px-12 pb-10">
          <div className="h-px bg-gradient-to-r from-transparent via-black/8 to-transparent mb-5" />
          <p className="text-[11px] text-gray-300 font-medium">
            © {new Date().getFullYear()} DigiOne.ai · All rights reserved
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT FORM PANEL
      ══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen bg-[#f5f5f5] px-5 py-4 sm:px-8 overflow-y-auto">

        {/* Mobile logo */}
        <div className="md:hidden mb-6 flex items-center gap-2.5">
          <DigiOneLogo width={32} height={32} />
          <span className="text-[18px] font-black tracking-[-0.025em] text-gray-900">
            DigiOne<sup className="text-[8px] text-gray-400 font-bold ml-px relative -top-1.5">.ai</sup>
          </span>
        </div>

        {/* Form card */}
        <div className="w-full max-w-[400px] bg-white rounded-2xl border border-black/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04)] px-7 py-7">
          {children}
        </div>
      </div>
    </div>
  );
}
