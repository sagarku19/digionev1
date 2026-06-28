import Link from 'next/link';
import { ShieldCheck, Zap, LayoutDashboard, MessageCircle, BarChart3, CreditCard, ArrowRight } from 'lucide-react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';
import CtaBanner from '@/src/components/marketing/sections/CtaBanner';

export const metadata = {
  title: 'Features · DigiOne.ai',
  description: 'Everything you need to build, manage, and scale your creator business. No code required.',
};

const MAIN_FEATURES = [
  {
    title: 'Instant storefronts',
    desc: 'Launch your digital store in seconds with high-converting, pre-designed templates tailored for creators.',
    icon: LayoutDashboard,
    route: '/dashboard/sites',
  },
  {
    title: 'Zero-friction payouts',
    desc: 'Get your earnings via UPI automatically within 24 hours. No manual withdrawals, no hidden wire fees.',
    icon: CreditCard,
    route: '/dashboard/payouts',
  },
  {
    title: 'Built-in affiliate engine',
    desc: 'Turn your best customers into your sales team. Setup custom rev-shares with two clicks.',
    icon: Zap,
    route: '/dashboard/marketing',
  },
  {
    title: 'Auto DMs & automation',
    desc: 'Connect your Instagram to automatically send product links when fans comment a specific keyword.',
    icon: MessageCircle,
    route: '/dashboard/integrations',
  },
  {
    title: 'Creator analytics',
    desc: 'Detailed heatmaps and conversion funnels to understand exactly where your traffic is dropping off.',
    icon: BarChart3,
    route: '/dashboard/analytics',
  },
  {
    title: 'Bank-grade security',
    desc: 'Piracy protection and DRM built-in to prevent unauthorized sharing of your hard work.',
    icon: ShieldCheck,
    route: '/dashboard/settings',
  },
];

export default function FeaturesPage() {
  return (
    <div className="flex flex-col w-full overflow-hidden bg-white">

      {/* Hero */}
      <section className="relative bg-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(22,19,15,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.035) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
          }}
        />
        <Rails className="pt-28 sm:pt-36">
          <div className="px-5 sm:px-10 lg:px-14 pb-14 sm:pb-20">
            <Kicker index="00" route="/features" />
            <h1 className="mt-7 sm:mt-9 text-[36px] sm:text-[52px] lg:text-[60px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F] max-w-2xl">
              Everything you need
              <br />
              <span className="text-[#E83A2E]">to sell.</span>
            </h1>
            <p className="mt-6 text-[15px] sm:text-[17px] font-medium text-black/50 max-w-xl leading-relaxed">
              No code, no complicated setups — just tools that work for Indian creators.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] transition-colors duration-200"
              >
                Start for free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-black/[0.12] hover:border-black/[0.25] text-[#16130F] font-semibold text-[14px] transition-colors duration-200"
              >
                View pricing
              </Link>
            </div>
          </div>
        </Rails>
      </section>

      {/* Feature ledger grid */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <Cross className="-bottom-[5px] -left-[5px]" />
          <Cross className="-bottom-[5px] -right-[5px]" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {MAIN_FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`group relative px-5 sm:px-8 py-8 sm:py-10 border-black/[0.07] hover:bg-[#FAF8F6] transition-colors duration-200 ${
                    i % 2 !== 0 ? 'md:border-l' : 'md:border-l-0'
                  } ${i % 3 !== 0 ? 'lg:border-l' : 'lg:border-l-0'} ${
                    i >= 1 ? 'border-t' : ''
                  } ${i >= 2 ? 'md:border-t' : 'md:border-t-0'} ${i >= 3 ? 'lg:border-t' : 'lg:border-t-0'}`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-lg bg-[#16130F] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" strokeWidth={1.8} />
                    </div>
                    <span className="font-ledger text-[11px] font-semibold text-[#E83A2E]">
                      {'>>'}
                    </span>
                  </div>
                  <h3 className="text-[17px] font-bold tracking-[-0.02em] text-[#16130F] mb-2.5">
                    {feature.title}
                  </h3>
                  <p className="text-[13.5px] text-black/50 leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                  <p className="font-ledger mt-5 text-[10px] text-black/30 group-hover:text-black/45 transition-colors">
                    {feature.route}
                  </p>
                </div>
              );
            })}
          </div>
        </Rails>
      </section>

      <CtaBanner />
    </div>
  );
}
