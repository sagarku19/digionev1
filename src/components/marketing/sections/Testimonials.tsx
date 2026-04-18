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
    color: "from-[#E83A2E] to-orange-500",
  },
  {
    quote: "I moved from Gumroad. Saving 5% on every transaction matters when your volume grows. The checkout conversion is genuinely 2x better.",
    name: "Priya Mehta",
    title: "Design Systems Architect",
    meta: "8K+ customers",
    stat: "2×",
    statLabel: "checkout conversion",
    avatar: "P",
    color: "from-violet-500 to-indigo-500",
  },
  {
    quote: "The visual builder is incredible. I didn't need to hire a developer to build my photography preset store. Literally done in an hour.",
    name: "Rahul Verma",
    title: "Automotive Photographer",
    meta: "120+ products sold",
    stat: "1 hr",
    statLabel: "setup time",
    avatar: "R",
    color: "from-teal-500 to-emerald-500",
  },
];

export default function Testimonials() {
  return (
    <section className="py-28 sm:py-36 bg-[#fafafa] relative overflow-hidden">

      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 70%, #000 10%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 70%, #000 10%, transparent 100%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">

        <InView className="text-center mb-16">
          <div className="iv">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-5 bg-[#E83A2E]/[0.07] px-4 py-1.5 rounded-full border border-[#E83A2E]/15">
              Testimonials
            </p>
            <h2 className="text-4xl sm:text-5xl md:text-[3.25rem] font-black text-gray-900 tracking-[-0.035em] leading-[1.1]">
              Creators earning
              <br />
              <span className="text-gray-400">with DigiOne.</span>
            </h2>
          </div>
        </InView>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <InView key={i} style={{ '--delay': `${i * 100}ms` }}>
              <div className="iv relative overflow-hidden p-8 rounded-[28px] bg-white border border-black/[0.055] hover:border-black/[0.10] hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-400 group flex flex-col">
                <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${t.color} opacity-0 group-hover:opacity-100 transition-opacity duration-400`} />

                <div className="flex gap-1 text-amber-400 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <div className="flex items-center gap-2 mb-5">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-br ${t.color} shadow-sm`}>
                    <TrendingUp className="w-3.5 h-3.5 text-white" />
                    <span className="text-white font-black text-[15px]">{t.stat}</span>
                  </div>
                  <span className="text-[12px] font-semibold text-gray-400">{t.statLabel}</span>
                </div>

                <p className="text-gray-700 font-medium leading-relaxed text-[15px] flex-1 mb-7">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3 pt-6 border-t border-black/[0.05]">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-black text-gray-900">{t.name}</h4>
                    <p className="text-[12px] text-gray-500 font-semibold">{t.title} · {t.meta}</p>
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
