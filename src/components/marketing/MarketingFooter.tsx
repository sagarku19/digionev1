import Link from 'next/link';
import { DigiOneLogo } from '@/src/components/assets/DigiOneLogo';

export default function MarketingFooter() {
  return (
    <footer className="bg-white pt-2 pb-8 overflow-hidden relative">

      <div
        className="absolute top-0 inset-x-0 h-24 pointer-events-none z-20"
        style={{ background: 'linear-gradient(to bottom, #ffffff 0%, transparent 100%)' }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.045) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 45%, transparent 80%)',
          maskImage: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 45%, transparent 80%)',
        }}
      />

      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '700px', height: '280px',
          background: 'radial-gradient(ellipse at center, rgba(232,58,46,0.06) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 flex flex-col relative z-10">

        <div className="w-full flex justify-center mb-6 sm:mb-8 select-none">
          <div className="flex items-baseline justify-center pointer-events-none leading-none">
            <span
              className="text-[14vw] sm:text-[15vw] md:text-[16vw] font-black tracking-[-0.05em]"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.04) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.15,
                paddingBottom: '0.08em',
                display: 'inline-block',
              }}
            >
              DigiOne
            </span>
            <span
              className="text-[5vw] sm:text-[6vw] font-black ml-1 self-start mt-[2vw]"
              style={{
                background: 'linear-gradient(135deg, #E83A2E 0%, #ff7043 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1,
              }}
            >
              .ai
            </span>
          </div>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-black/[0.08] to-transparent mb-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2 shrink-0">
            <DigiOneLogo width={20} height={20} />
            <span className="text-[13px] font-bold text-gray-400 tracking-tight">DigiOne AI Pvt. Ltd.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2">
            {[
              { href: '/contact', label: 'Contact' },
              { href: '/refunds', label: 'Refund policy' },
              { href: '/privacy', label: 'Privacy' },
              { href: '/terms', label: 'Terms' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] font-medium text-gray-400 hover:text-gray-800 transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
