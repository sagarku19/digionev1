import InView from '@/src/components/marketing/InView';
import { Star, TrendingUp } from 'lucide-react';

const testimonials = [
  {
    quote: "Made ₹1.2L in the first month. The UPI payout hit my account the same day. Nothing else works this smoothly for Indian creators.",
    name: "Arjun Sharma",
    title: "UI/UX Educator",
    meta: "50K+ students",
    stat: "₹1.2L",
    statLabel: "first month",
    avatar: "A",
  },
  {
    quote: "I moved from Gumroad. Saving 5% on every transaction matters when your volume grows. The checkout conversion is genuinely 2x better.",
    name: "Riya Mehta",
    title: "Design Systems Architect",
    meta: "8K+ customers",
    stat: "2×",
    statLabel: "checkout conversion",
    avatar: "P",
  },
  {
    quote: "The visual builder is incredible. I didn't need to hire a developer to build my photography preset store. Literally done in an hour.",
    name: "Rahul Verma",
    title: "Automotive Photographer",
    meta: "120+ products sold",
    stat: "1 hr",
    statLabel: "setup time",
    avatar: "R",
  },
];

export default function Testimonials() {
  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-[#131110] relative overflow-hidden">

      {/* Vermilion bloom — top center */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '-25%', left: '50%', transform: 'translateX(-50%)',
          width: '900px', height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(232,58,46,0.16) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Dot grid — faint white */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 40%, #000 10%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 40%, #000 10%, transparent 100%)',
        }}
      />

      {/* Grain */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
        <filter id="testimonial-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.70" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#testimonial-grain)" />
      </svg>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">

        <InView className="text-center mb-10 sm:mb-16">
          <div className="iv">
            <div className="flex items-center justify-center gap-4 mb-5 sm:mb-6">
              <span aria-hidden="true" className="h-px w-8 sm:w-12 bg-white/[0.15]" />
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#FF6B5C]">
                <span aria-hidden="true" className="text-white/25 mr-3 select-none">04</span>
                Testimonials
              </p>
              <span aria-hidden="true" className="h-px w-8 sm:w-12 bg-white/[0.15]" />
            </div>
            <h2 className="text-[2rem] sm:text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] font-black text-white tracking-[-0.035em] leading-[1.1]">
              Creators earning
              <br />
              <span
                className="font-display"
                style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.4)', color: 'transparent' }}
              >
                with DigiOne.
              </span>
            </h2>
          </div>
        </InView>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {testimonials.map((t, i) => (
            <InView key={i} style={{ '--delay': `${i * 100}ms` }}>
              <div className="iv relative overflow-hidden p-5 sm:p-8 rounded-[24px] sm:rounded-[28px] bg-white/[0.045] border border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-400 group flex flex-col h-full">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#E83A2E] to-[#FF7043] opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

                <div className="flex gap-1 text-amber-400 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <div className="flex items-baseline gap-2.5 mb-5">
                  <span className="inline-flex items-center gap-1.5 text-[#FF6B5C]">
                    <TrendingUp className="w-4 h-4 shrink-0 translate-y-0.5" />
                    <span className="font-display font-black text-[26px] sm:text-[30px] text-white leading-none tracking-tight">{t.stat}</span>
                  </span>
                  <span className="text-[12px] font-semibold text-white/40">{t.statLabel}</span>
                </div>

                <p className="text-white/75 font-medium leading-relaxed text-[15px] sm:text-[16px] flex-1 mb-7">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3 pt-6 border-t border-white/[0.08]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E83A2E] to-[#FF7043] flex items-center justify-center text-white font-black text-sm shadow-[0_4px_14px_-4px_rgba(232,58,46,0.5)] shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-black text-white">{t.name}</h4>
                    <p className="text-[12px] text-white/45 font-semibold">{t.title} · {t.meta}</p>
                  </div>
                </div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}
