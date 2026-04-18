export const metadata = {
  title: 'Refund Policy · DigiOne.ai',
  description: 'DigiOne\'s refund and dispute policy for creators and buyers.',
};

const SECTIONS = [
  {
    title: 'Overview',
    content: `DigiOne.ai is a platform that enables creators to sell digital products (courses, ebooks, templates, memberships, etc.) to buyers. Because digital products are instantly accessible after purchase, our refund policy reflects that reality, while still protecting buyers from genuine issues.`,
  },
  {
    title: 'For Buyers',
    content: `You may request a refund within 7 days of purchase if:\n\n• The product was not delivered or accessible after payment.\n• The product is materially different from its description.\n• A technical error caused duplicate charges.\n\nRefunds are NOT provided for:\n• Change of mind after accessing the product.\n• Requests made after 7 days of purchase.\n• Products explicitly marked as non-refundable by the creator.`,
  },
  {
    title: 'For Creators',
    content: `Creators set their own refund policies within the bounds of DigiOne's platform rules. Creators must clearly state their refund terms on their product pages. DigiOne reserves the right to issue refunds in cases of buyer disputes that meet our policy criteria, and may recover the amount from the creator's pending payouts.`,
  },
  {
    title: 'How to Request a Refund',
    content: `To request a refund:\n\n1. Email us at support@digione.ai with your order ID and reason.\n2. Our team will review and respond within 2–3 business days.\n3. Approved refunds are processed to the original payment method within 5–7 business days.`,
  },
  {
    title: 'Disputes & Chargebacks',
    content: `If you file a chargeback with your bank without first contacting us, your DigiOne account may be suspended pending investigation. We strongly encourage reaching out to us first — we resolve most issues within 48 hours.`,
  },
  {
    title: 'Contact',
    content: `Questions about a refund? Reach us at support@digione.ai or through the Contact page.`,
  },
];

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div style={{
            position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
            width: '700px', height: '500px',
            backgroundImage: 'radial-gradient(ellipse, rgba(232,58,46,0.07) 0%, transparent 65%)',
            filter: 'blur(70px)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 55%)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 55%)',
          }} />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/8 shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-[12px] font-semibold text-gray-500 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E]" />
            Last updated April 2025
          </div>
          <h1 className="text-[48px] sm:text-[58px] font-black tracking-[-0.04em] leading-[1.04] text-gray-900 mb-5">
            Refund{' '}
            <span style={{
              backgroundImage: 'linear-gradient(135deg, #E83A2E 0%, #ff7040 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent', color: 'transparent',
            }}>Policy</span>
          </h1>
          <p className="text-[16px] text-gray-500 font-medium leading-relaxed max-w-md mx-auto">
            Clear, fair, and straightforward — because trust matters more than transactions.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-28">
        <div className="space-y-10">
          {SECTIONS.map(({ title, content }, i) => (
            <div key={title} className="flex gap-6">
              {/* Number */}
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#E83A2E]/10 border border-[#E83A2E]/20 flex items-center justify-center mt-0.5">
                <span className="text-[11px] font-black text-[#E83A2E]">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div>
                <h2 className="text-[18px] font-black tracking-[-0.02em] text-gray-900 mb-3">{title}</h2>
                <div className="text-[14px] text-gray-600 leading-[1.8] whitespace-pre-line">{content}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 p-6 rounded-2xl bg-[#fef3f1] border border-[#E83A2E]/15 flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-[#E83A2E]/15 flex items-center justify-center shrink-0">
            <span className="text-[16px]">💬</span>
          </div>
          <div>
            <p className="text-[14px] font-bold text-gray-900 mb-1">Still have questions?</p>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Contact us at{' '}
              <a href="mailto:support@digione.ai" className="text-[#E83A2E] font-semibold hover:underline">
                support@digione.ai
              </a>{' '}
              and we&apos;ll help you sort it out.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
