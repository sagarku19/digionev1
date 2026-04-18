import InView from '@/src/components/marketing/InView';
import { UserPlus, Upload, IndianRupee } from 'lucide-react';

const steps = [
  {
    num: "01",
    title: "Sign up in 30 seconds",
    desc: "Create your free account. No credit card, no commitment — just your email.",
    icon: UserPlus,
    color: "from-[#E83A2E] to-orange-500",
  },
  {
    num: "02",
    title: "Upload & style your store",
    desc: "Add your products and design your storefront with our drag-and-drop visual builder.",
    icon: Upload,
    color: "from-violet-500 to-indigo-500",
  },
  {
    num: "03",
    title: "Share & get paid",
    desc: "Share your link anywhere. Receive instant UPI payouts directly to your bank account.",
    icon: IndianRupee,
    color: "from-emerald-500 to-teal-500",
  },
];

export default function Steps() {
  return (
    <section className="py-28 sm:py-36 bg-[#fafafa] relative overflow-hidden">

      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />

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

        <InView className="text-center mb-20">
          <div className="iv">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-5 bg-[#E83A2E]/[0.07] px-4 py-1.5 rounded-full border border-[#E83A2E]/15">
              How it works
            </p>
            <h2 className="text-4xl sm:text-5xl md:text-[3.25rem] font-black text-gray-900 tracking-[-0.035em] leading-[1.1]">
              Up and running
              <br />
              <span className="text-gray-400">in minutes.</span>
            </h2>
          </div>
        </InView>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px">
            <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#E83A2E]/20 via-violet-300/30 to-emerald-300/20" />
          </div>

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <InView key={i} style={{ '--delay': `${i * 120}ms` }} className="flex flex-col items-center text-center group">
                <div className="iv flex flex-col items-center text-center w-full">
                  <div className="relative mb-8 z-10">
                    <div className={`w-20 h-20 rounded-[28px] bg-gradient-to-br ${step.color} flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(0,0,0,0.22)] group-hover:scale-105 group-hover:-rotate-3 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center">
                      <span className="text-[10px] font-black text-gray-400">{step.num}</span>
                    </div>
                  </div>
                  <h3 className="text-[19px] sm:text-[21px] font-black text-gray-900 mb-3 tracking-tight leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 font-medium text-[14px] sm:text-[15px] leading-relaxed max-w-[240px]">
                    {step.desc}
                  </p>
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
