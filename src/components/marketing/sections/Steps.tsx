import InView from '@/src/components/marketing/InView';
import { UserPlus, Upload, IndianRupee } from 'lucide-react';

const stepGraphicCard =
  'rounded-2xl border border-black/[0.06] bg-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.10)] p-4 text-left w-full max-w-[240px]';

const DragDots = () => (
  <div className="grid grid-cols-2 gap-[3px] shrink-0">
    {[0, 1, 2, 3, 4, 5].map((d) => (
      <span key={d} className="w-[3px] h-[3px] rounded-full bg-gray-300" />
    ))}
  </div>
);

const SignupGraphic = () => (
  <div className={stepGraphicCard}>
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E83A2E] to-orange-400 shrink-0" />
      <div className="sk-shimmer h-2 w-1/2 rounded-full" />
    </div>
    <div className="sk-shimmer h-4 w-full rounded-lg mb-2" />
    <div className="sk-shimmer h-4 w-full rounded-lg mb-3" />
    <div className="h-5 rounded-lg bg-[#E83A2E] flex items-center justify-center">
      <div className="h-1 w-1/3 rounded-full bg-white/60" />
    </div>
  </div>
);

const BuilderGraphic = () => (
  <div className={stepGraphicCard}>
    <div className="flex items-center gap-2 bg-[#E83A2E]/[0.06] border border-[#E83A2E]/20 border-l-[3px] border-l-[#E83A2E] rounded-lg px-2.5 py-2 mb-1.5">
      <DragDots />
      <div className="w-2 h-2 rounded-sm bg-gradient-to-br from-[#E83A2E] to-orange-400 shrink-0" />
      <div className="h-1.5 w-2/5 rounded-full bg-gray-700/70" />
    </div>
    <div className="flex items-center gap-2 px-2.5 py-2 mb-1.5">
      <DragDots />
      <div className="w-2 h-2 rounded-sm bg-violet-300 shrink-0" />
      <div className="sk-shimmer h-1.5 w-1/2 rounded-full" />
    </div>
    <div className="flex items-center gap-2 px-2.5 py-2">
      <DragDots />
      <div className="w-2 h-2 rounded-sm bg-emerald-300 shrink-0" />
      <div className="sk-shimmer h-1.5 w-1/3 rounded-full" />
    </div>
  </div>
);

const PayoutGraphic = () => (
  <div className={stepGraphicCard}>
    <div className="flex items-center gap-4.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 mb-2.5">
      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
        <span className="text-white text-[10px] font-black leading-none">✓</span>
      </div>
      <div>
        <p className="text-[11px] font-black text-emerald-900 leading-tight mb-3.5">₹12,400 credited</p>
        <p className="text-[8px] text-emerald-600 leading-tight font-medium">Instant UPI · just now</p>
      </div>
    </div>
    <div className="flex items-center gap-2 px-1 mb-2.5">
      <div className="sk-shimmer h-1.5 flex-1 rounded-full" />
      <span className="text-[9px] font-black text-emerald-600 shrink-0">+₹2,100</span>
    </div>
        <div className="flex items-center gap-2 px-1">
      <div className="sk-shimmer h-1.5 flex-1 rounded-full" />
      <span className="text-[9px] font-black text-emerald-600 shrink-0">+₹1,500</span>
    </div>
  </div>
);

const steps = [
  {
    num: "01",
    title: "Sign up in 30 seconds",
    desc: "Create your free account. No credit card, no commitment — just your email.",
    icon: UserPlus,
    color: "from-[#E83A2E] to-orange-500",
    graphic: SignupGraphic,
  },
  {
    num: "02",
    title: "Upload & style your store",
    desc: "Add your products and design your storefront with our drag-and-drop visual builder.",
    icon: Upload,
    color: "from-violet-500 to-indigo-500",
    graphic: BuilderGraphic,
  },
  {
    num: "03",
    title: "Share & get paid",
    desc: "Share your link anywhere. Receive instant UPI payouts directly to your bank account.",
    icon: IndianRupee,
    color: "from-emerald-500 to-teal-500",
    graphic: PayoutGraphic,
  },
];

export default function Steps() {
  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-[#fafafa] relative overflow-hidden">

      <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-white to-transparent pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/[0.07] to-transparent" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, #000 20%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, #000 20%, transparent 100%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">

        <InView className="text-center mb-12 sm:mb-20">
          <div className="iv">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-5 bg-[#E83A2E]/[0.07] px-4 py-1.5 rounded-full border border-[#E83A2E]/15">
              How it works
            </p>
            <h2 className="text-[2rem] sm:text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] font-black text-gray-900 tracking-[-0.035em] leading-[1.1]">
              Up and running
              <br />
              <span className="text-gray-400">in minutes.</span>
            </h2>
          </div>
        </InView>

        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          <div className="hidden sm:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-[1.5px] rounded-full bg-gradient-to-r from-[#E83A2E]/25 via-violet-300/35 to-emerald-300/25" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            const Graphic = step.graphic;
            return (
              <InView key={i} style={{ '--delay': `${i * 120}ms` }} className="flex flex-col items-center text-center group border-b border-gray-100 pb-8 last:border-0 last:pb-0 sm:border-0 sm:pb-0">
                <div className="iv flex flex-col items-center text-center w-full">
                  <div className="relative mb-5 sm:mb-8 z-10">
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-[28px] sm:rounded-[32px] bg-gradient-to-br ${step.color} flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(0,0,0,0.22)] group-hover:scale-105 group-hover:-rotate-3 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center">
                      <span className="text-[10px] font-black text-gray-400">{step.num}</span>
                    </div>
                  </div>
                  <h3 className="text-[19px] sm:text-[20px] lg:text-[22px] font-black text-gray-900 mb-3 tracking-tight leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 font-medium text-[14px] sm:text-[15px] leading-relaxed max-w-[240px]">
                    {step.desc}
                  </p>
                  <div aria-hidden="true" className="mt-6 w-full flex justify-center">
                    <Graphic />
                  </div>
                </div>
              </InView>
            );
          })}
        </div>

        <InView className="mt-16 text-center" style={{ '--delay': '400ms' }}>
          <p className="iv text-[13px] font-semibold text-gray-400 tracking-wide">
            Join <span className="text-gray-700 font-black">10,000+</span> creators already earning on DigiOne
          </p>
        </InView>
      </div>
    </section>
  );
}
