import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';
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
    cta: 'Get started free',
    features: ['1 store', 'Up to 5 products', 'UPI payments', 'Basic analytics', 'DigiOne subdomain', '8% transaction fee'],
    popular: false,
  },
  {
    name: 'Creator',
    price: '₹799',
    period: 'per month',
    desc: 'For serious creators ready to scale their income.',
    cta: 'Start 14-day free trial',
    features: ['Unlimited products', '3 stores', 'Custom domain', 'AI Instagram DMs', 'Automated workflows', 'Affiliate engine', 'Advanced analytics', '3% transaction fee'],
    popular: true,
  },
  {
    name: 'Pro',
    price: '₹1,999',
    period: 'per month',
    desc: 'For power sellers and agencies managing multiple brands.',
    cta: 'Start 14-day free trial',
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
    <main className="flex flex-col w-full overflow-hidden bg-white">

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
            <Kicker index="00" route="/pricing" />
            <h1 className="mt-7 sm:mt-9 text-[36px] sm:text-[52px] lg:text-[60px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F] max-w-2xl">
              Simple pricing,
              <br />
              <span className="text-[#E83A2E]">serious results.</span>
            </h1>
            <p className="mt-6 text-[15px] sm:text-[17px] font-medium text-black/50 max-w-xl leading-relaxed">
              Start free. Upgrade when you&apos;re ready. No surprise fees.
            </p>
          </div>
        </Rails>
      </section>

      {/* Plans — ledger columns */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <div className="grid grid-cols-1 md:grid-cols-3">
            {plans.map((plan, i) => (
              <div
                key={plan.name}
                className={`relative flex flex-col px-5 sm:px-8 py-8 sm:py-10 border-black/[0.07] ${
                  i > 0 ? 'border-t md:border-t-0 md:border-l' : ''
                } ${plan.popular ? 'bg-[#16130F] text-white' : 'bg-white'}`}
              >
                {/* Plan header */}
                <div className="flex items-center justify-between mb-6">
                  <p
                    className={`font-ledger text-[10px] font-medium uppercase tracking-[0.18em] ${
                      plan.popular ? 'text-white/45' : 'text-black/35'
                    }`}
                  >
                    {plan.name}
                  </p>
                  {plan.popular ? (
                    <span className="font-ledger text-[9px] font-semibold uppercase tracking-[0.14em] bg-[#E83A2E] text-white rounded-md px-2.5 py-1">
                      Most popular
                    </span>
                  ) : (
                    <span className="font-ledger text-[11px] font-semibold text-[#E83A2E]">
                      {'>>'}
                    </span>
                  )}
                </div>

                <div className="flex items-end gap-2 mb-2">
                  <span
                    className={`font-ledger text-[40px] sm:text-[44px] font-semibold leading-[0.9] tracking-tight ${
                      plan.popular ? 'text-white' : 'text-[#16130F]'
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span className={`font-ledger text-[12px] mb-1 ${plan.popular ? 'text-white/40' : 'text-black/35'}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-[13.5px] font-medium leading-relaxed mt-2 mb-7 ${plan.popular ? 'text-white/55' : 'text-black/50'}`}>
                  {plan.desc}
                </p>

                <Link
                  href="/signup"
                  className={`group w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-[14px] transition-colors duration-200 mb-7 ${
                    plan.popular
                      ? 'bg-[#E83A2E] hover:bg-[#C92F24] text-white'
                      : 'border border-black/[0.12] hover:border-black/[0.25] text-[#16130F]'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </Link>

                <div className={`h-px mb-6 ${plan.popular ? 'bg-white/[0.09]' : 'bg-black/[0.06]'}`} />

                <div className="flex-1">
                  <p
                    className={`font-ledger text-[9px] font-medium uppercase tracking-[0.18em] mb-4 ${
                      plan.popular ? 'text-white/35' : 'text-black/35'
                    }`}
                  >
                    What&apos;s included
                  </p>
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check
                          className={`mt-0.5 w-3.5 h-3.5 shrink-0 ${plan.popular ? 'text-[#FF6B5C]' : 'text-[#E83A2E]'}`}
                          strokeWidth={2.5}
                        />
                        <span className={`text-[13.5px] font-medium leading-snug ${plan.popular ? 'text-white/70' : 'text-black/60'}`}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Rails>
      </section>

      {/* FAQ — ledger grid */}
      <section className="relative bg-[#FAF8F6]">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <Cross className="-bottom-[5px] -left-[5px]" />
          <Cross className="-bottom-[5px] -right-[5px]" />
          <div className="px-5 sm:px-10 lg:px-14 py-14 sm:py-20">
            <Kicker index="01" route="/pricing#faq" />
            <div className="mt-7 sm:mt-9 max-w-2xl">
              <h2 className="text-[28px] sm:text-[38px] font-bold tracking-[-0.03em] leading-[1.08] text-[#16130F]">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed font-medium text-black/50">
                Everything you need to know about the product and billing.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="bg-white border border-black/[0.07] rounded-xl p-6 hover:border-black/[0.15] transition-colors duration-200"
                >
                  <p className="font-ledger text-[10px] font-semibold text-[#E83A2E] mb-3">
                    {'>>'}
                  </p>
                  <p className="text-[15px] font-bold text-[#16130F] mb-2 leading-snug">{faq.q}</p>
                  <p className="text-[13.5px] text-black/50 font-medium leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </Rails>
      </section>

      <CtaBanner />
    </main>
  );
}
