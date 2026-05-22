import Link from 'next/link';
import { Check, Zap, ArrowRight, Sparkles } from 'lucide-react';
import CtaBanner from '@/src/components/marketing/sections/CtaBanner';

export const metadata = {
  title: 'Pricing | DigiOne',
  description: 'Simple, transparent pricing for Indian creators. Start free, scale when ready.',
};

const plans = [
  {
    name: 'Starter',
    price: '₹0',
    period: 'Free forever',
    desc: 'Perfect to get started and make your first sale.',
    accent: 'from-gray-300 via-gray-400 to-gray-500',
    iconColor: 'text-gray-500',
    iconBg: 'bg-gray-100',
    border: 'border-black/[0.08]',
    hoverBorder: 'hover:border-gray-300',
    cta: 'Get started free',
    ctaStyle: 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 shadow-sm',
    features: ['1 store', 'Up to 5 products', 'UPI payments', 'Basic analytics', 'DigiOne subdomain', '8% transaction fee'],
    popular: false,
  },
  {
    name: 'Creator',
    price: '₹799',
    period: 'per month',
    desc: 'For serious creators ready to scale their income.',
    accent: 'from-[#E83A2E] via-[#ff5f54] to-orange-500',
    iconColor: 'text-[#E83A2E]',
    iconBg: 'bg-[#E83A2E]/10',
    border: 'border-[#E83A2E]/30',
    hoverBorder: 'hover:border-[#E83A2E]/60',
    cta: 'Start 14-day free trial',
    ctaStyle: 'bg-[#E83A2E] text-white hover:bg-[#d4352b] shadow-[0_8px_24px_-4px_rgba(232,58,46,0.35)] hover:shadow-[0_12px_32px_-4px_rgba(232,58,46,0.45)]',
    features: ['Unlimited products', '3 stores', 'Custom domain', 'AI Instagram DMs', 'Automated workflows', 'Affiliate engine', 'Advanced analytics', '3% transaction fee'],
    popular: true,
  },
  {
    name: 'Pro',
    price: '₹1,999',
    period: 'per month',
    desc: 'For power sellers and agencies managing multiple brands.',
    accent: 'from-violet-500 via-purple-500 to-indigo-600',
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-100',
    border: 'border-violet-200',
    hoverBorder: 'hover:border-violet-400',
    cta: 'Start 14-day free trial',
    ctaStyle: 'bg-gray-900 text-white hover:bg-gray-800 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.35)]',
    features: ['Everything in Creator', 'Unlimited stores', 'White-label branding', 'Priority support', 'Team members (5)', 'API access', 'Custom integrations', '0% transaction fee'],
    popular: false,
  },
];

const faqs = [
  { q: 'Can I upgrade or downgrade anytime?', a: 'Yes. You can switch plans at any time. Upgrades take effect immediately, downgrades at the next billing cycle.' },
  { q: 'What payment methods do you support?', a: 'We support all UPI apps, credit/debit cards, net banking, and wallets via Cashfree — fully India-first.' },
  { q: 'Is there a free trial?', a: 'Creator and Pro plans come with a 14-day free trial. No credit card required to start.' },
  { q: 'Do you take a cut of my sales?', a: 'Starter plan has an 8% fee, Creator has 3%, and Pro has 0%. The more you grow, the less you pay.' },
  { q: 'Can I use my own domain?', a: 'Yes, custom domains are available on the Creator and Pro plans. Connect any domain in one click.' },
  { q: 'What happens after the 14-day trial?', a: 'You will be downgraded to the Starter plan if you do not upgrade to a paid plan. Your data will be safe.' },
];

export default function PricingPage() {
  return (
    <main className="bg-white min-h-screen">

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.04] border border-black/[0.06] text-[12px] font-semibold text-gray-500 mb-6">
          <Zap className="w-3.5 h-3.5" />
          Pricing
        </div>
        <h1 className="text-[36px] sm:text-[52px] font-black tracking-[-0.03em] text-gray-900 leading-[1.1] mb-4 max-w-2xl mx-auto">
          Simple pricing, serious results
        </h1>
        <p className="text-[16px] sm:text-[18px] text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
          Start free. Upgrade when you're ready. No surprise fees.
        </p>
      </section>

      <style>{`
        @keyframes planFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      {/* Plans */}
      <section className="pb-24 px-5 sm:px-8 relative z-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`group relative rounded-[32px] bg-white border ${plan.border} ${plan.hoverBorder} transition-all duration-500 hover:-translate-y-2 p-8 sm:p-10 flex flex-col ${plan.popular ? 'shadow-[0_24px_64px_-16px_rgba(232,58,46,0.18)] md:-mt-6 ring-1 ring-inset ring-[#E83A2E]/10 z-10' : 'shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] mt-0'}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20" style={{ animation: 'planFloat 4s ease-in-out infinite' }}>
                  <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#E83A2E] to-orange-500 text-white text-[11px] font-black uppercase tracking-widest shadow-[0_8px_16px_-4px_rgba(232,58,46,0.4)] border border-white/20">
                    <Zap className="w-3.5 h-3.5 fill-white" /> Most popular
                  </span>
                </div>
              )}

              <div className={`absolute top-0 inset-x-0 h-[3px] rounded-t-[32px] bg-gradient-to-r ${plan.accent} opacity-80 group-hover:opacity-100 transition-opacity duration-300`} />

              <div className="mb-8 relative">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[13px] font-black uppercase tracking-[0.15em] text-gray-900">{plan.name}</p>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${plan.iconBg} ${plan.iconColor}`}>
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                </div>
                <div className="flex items-end gap-1.5 mb-3">
                  <span className="text-[44px] font-black text-gray-900 leading-[0.9] tracking-tight">{plan.price}</span>
                  <span className="text-[14px] font-bold text-gray-400 mb-1">{plan.period}</span>
                </div>
                <p className="text-[15px] text-gray-500 font-medium leading-relaxed">{plan.desc}</p>
              </div>

              <Link
                href="/signup"
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-[15px] transition-all duration-300 hover:-translate-y-0.5 mb-8 ${plan.ctaStyle}`}
              >
                {plan.cta} <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
              </Link>

              <div className="space-y-4 flex-1">
                <p className="text-[12px] font-bold text-gray-900 uppercase tracking-wider mb-2">What&apos;s included</p>
                <ul className="space-y-3.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.iconBg}`}>
                        <Check className={`w-3 h-3 ${plan.iconColor} stroke-[3]`} />
                      </div>
                      <span className="text-[14.5px] font-medium text-gray-600 leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 relative overflow-hidden bg-white border-t border-black/[0.04]">
        <div className="absolute inset-0 bg-[#fafafa]/50" />
        <div className="max-w-4xl mx-auto px-5 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-[44px] font-black text-gray-900 tracking-[-0.03em] mb-4">
              Frequently asked questions
            </h2>
            <p className="text-gray-500 font-medium text-[17px]">Everything you need to know about the product and billing.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200/80 rounded-2xl p-7 hover:border-gray-300/80 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] transition-all duration-300 group"
              >
                <p className="text-[16px] font-bold text-gray-900 mb-3 leading-snug group-hover:text-[#E83A2E] transition-colors">{faq.q}</p>
                <p className="text-[14.5px] text-gray-500 font-medium leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Replaced old CTA with the new CtaBanner component */}
      <CtaBanner />

    </main>
  );
}
