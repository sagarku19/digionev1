import Link from 'next/link';
import { Check, Zap, ArrowRight } from 'lucide-react';

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
    accent: 'from-gray-400 to-gray-500',
    border: 'border-black/[0.07]',
    cta: 'Get started free',
    ctaStyle: 'bg-gray-900 text-white hover:bg-gray-800',
    features: ['1 store', 'Up to 5 products', 'UPI payments', 'Basic analytics', 'DigiOne subdomain', '8% transaction fee'],
    popular: false,
  },
  {
    name: 'Creator',
    price: '₹799',
    period: 'per month',
    desc: 'For serious creators ready to scale their income.',
    accent: 'from-[#E83A2E] to-orange-500',
    border: 'border-[#E83A2E]/30',
    cta: 'Start 14-day free trial',
    ctaStyle: 'bg-[#E83A2E] text-white hover:bg-[#d4352b] shadow-[0_8px_24px_-4px_rgba(232,58,46,0.35)]',
    features: ['Unlimited products', '3 stores', 'Custom domain', 'AI Instagram DMs', 'Automated workflows', 'Affiliate engine', 'Advanced analytics', '3% transaction fee'],
    popular: true,
  },
  {
    name: 'Pro',
    price: '₹1,999',
    period: 'per month',
    desc: 'For power sellers and agencies managing multiple brands.',
    accent: 'from-violet-500 to-indigo-500',
    border: 'border-violet-200',
    cta: 'Start 14-day free trial',
    ctaStyle: 'bg-gray-900 text-white hover:bg-gray-800',
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
];

export default function PricingPage() {
  return (
    <main className="bg-white min-h-screen">

      {/* Hero */}
      <section className="pt-36 pb-20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(232,58,46,0.07) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 60%)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 60%)',
          }}
        />
        <div className="max-w-3xl mx-auto px-5 text-center relative z-10">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-5 bg-[#E83A2E]/[0.07] px-4 py-1.5 rounded-full border border-[#E83A2E]/15">
            Simple pricing
          </p>
          <h1 className="text-[42px] sm:text-[56px] md:text-[64px] font-black text-gray-900 tracking-[-0.04em] leading-[1.05] mb-5">
            Start free.
            <br />
            <span className="text-gray-300">Scale when you&apos;re ready.</span>
          </h1>
          <p className="text-[17px] sm:text-[19px] text-gray-500 font-medium leading-relaxed max-w-lg mx-auto">
            No hidden fees. No lock-in. Just a platform that grows with your revenue.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-24 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-[28px] bg-white border ${plan.border} p-8 flex flex-col ${plan.popular ? 'shadow-[0_24px_64px_-16px_rgba(232,58,46,0.18)]' : 'shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)]'}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E83A2E] text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <Zap className="w-3 h-3 fill-white" /> Most popular
                  </span>
                </div>
              )}

              <div className={`absolute top-0 inset-x-0 h-[2px] rounded-t-[28px] bg-gradient-to-r ${plan.accent}`} />

              <div className="mb-6">
                <p className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-3">{plan.name}</p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-[40px] font-black text-gray-900 leading-none tracking-tight">{plan.price}</span>
                  <span className="text-[13px] font-semibold text-gray-400 mb-1.5">{plan.period}</span>
                </div>
                <p className="text-[14px] text-gray-500 font-medium leading-snug">{plan.desc}</p>
              </div>

              <Link
                href="/signup"
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-[14px] transition-all duration-300 hover:-translate-y-0.5 mb-7 ${plan.ctaStyle}`}
              >
                {plan.cta} <ArrowRight className="w-4 h-4" />
              </Link>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2.5 text-[14px] font-medium text-gray-700">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-[#fafafa] border-t border-black/[0.06]">
        <div className="max-w-2xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="inline-flex items-center text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-4 bg-[#E83A2E]/[0.07] px-4 py-1.5 rounded-full border border-[#E83A2E]/15">
              FAQ
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-[-0.03em]">Common questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-black/[0.06] rounded-2xl p-6">
                <p className="text-[15px] font-black text-gray-900 mb-2">{faq.q}</p>
                <p className="text-[14px] text-gray-500 font-medium leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white text-center px-5">
        <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-[-0.03em] mb-4">
          Ready to start selling?
        </h2>
        <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">No credit card. Free forever plan. Setup in 2 minutes.</p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#E83A2E] text-white font-bold text-[15px] shadow-[0_8px_24px_-4px_rgba(232,58,46,0.35)] hover:shadow-[0_14px_32px_-4px_rgba(232,58,46,0.45)] hover:-translate-y-0.5 transition-all duration-300"
        >
          Create your free store <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </main>
  );
}
