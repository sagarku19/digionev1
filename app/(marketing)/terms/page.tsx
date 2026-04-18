export const metadata = {
  title: 'Terms of Service · DigiOne.ai',
  description: 'The terms and conditions governing use of the DigiOne.ai platform.',
};

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    content: `By creating an account or using DigiOne.ai ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, please do not use the Platform.\n\nWe may update these Terms at any time. Continued use after changes constitutes acceptance of the updated Terms.`,
  },
  {
    title: 'Eligibility',
    content: `You must be at least 18 years old to use DigiOne.ai. By using the Platform, you represent that you meet this requirement. If you are registering on behalf of a business, you represent that you have authority to bind that business.`,
  },
  {
    title: 'Creator Accounts',
    content: `Creators may list and sell digital products on the Platform. By listing a product, you represent that:\n\n• You own or have rights to sell the content.\n• The content does not infringe any third-party intellectual property.\n• The content does not violate any applicable laws.\n• Your product description is accurate and not misleading.\n\nDigiOne reserves the right to remove any product that violates these Terms without notice.`,
  },
  {
    title: 'Buyer Accounts',
    content: `Buyers may purchase digital products listed on the Platform. All sales are final unless the creator's policy or DigiOne's refund policy provides otherwise. By completing a purchase, you agree to the creator's stated terms and DigiOne's Refund Policy.`,
  },
  {
    title: 'Platform Fees',
    content: `DigiOne charges a platform fee on each transaction:\n\n• **Free plan:** 10% platform fee per sale.\n• **Pro plan:** 5% platform fee per sale.\n\nFees are deducted automatically before payouts. Payout schedules and minimums are described in your dashboard settings.`,
  },
  {
    title: 'Prohibited Content',
    content: `The following content is strictly prohibited:\n\n• Adult or explicit content without proper licensing.\n• Pirated, plagiarised, or unlicensed intellectual property.\n• Financial advice, medical advice, or legal advice without proper credentials.\n• Hate speech, violence, or harassment of any kind.\n• Misleading claims or fraudulent products.\n\nViolation may result in immediate account termination and legal action.`,
  },
  {
    title: 'Intellectual Property',
    content: `Creators retain all intellectual property rights to their products. By listing on DigiOne, you grant us a limited, non-exclusive licence to display and deliver your content to buyers.\n\nDigiOne's own brand, interface, and technology are protected by copyright and trademark law. You may not copy or use them without written permission.`,
  },
  {
    title: 'Limitation of Liability',
    content: `To the maximum extent permitted by law, DigiOne shall not be liable for:\n\n• Indirect, incidental, or consequential damages.\n• Loss of revenue or profits.\n• Data loss arising from platform downtime or errors.\n\nOur total liability to you shall not exceed the fees paid to DigiOne in the 3 months before the claim.`,
  },
  {
    title: 'Governing Law',
    content: `These Terms are governed by the laws of India. Any disputes shall be resolved through arbitration in Bangalore, Karnataka, India, under the Arbitration and Conciliation Act, 1996.`,
  },
  {
    title: 'Contact',
    content: `For questions about these Terms, contact us at legal@digione.ai.`,
  },
];

export default function TermsPage() {
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
            Terms of{' '}
            <span style={{
              backgroundImage: 'linear-gradient(135deg, #E83A2E 0%, #ff7040 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent', color: 'transparent',
            }}>Service</span>
          </h1>
          <p className="text-[16px] text-gray-500 font-medium leading-relaxed max-w-md mx-auto">
            Please read these terms carefully. They govern your use of DigiOne.ai.
          </p>
        </div>
      </section>

      {/* Table of contents */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 mb-10">
        <div className="p-5 rounded-2xl bg-[#fafafa] border border-black/[0.06]">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">Sections</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SECTIONS.map(({ title }, i) => (
              <div key={title} className="flex items-center gap-2 text-[13px] text-gray-500">
                <span className="text-[#E83A2E] font-bold tabular-nums text-[11px]">{String(i + 1).padStart(2, '0')}</span>
                {title}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-28">
        <div className="space-y-10">
          {SECTIONS.map(({ title, content }, i) => (
            <div key={title} className="flex gap-6">
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#E83A2E]/10 border border-[#E83A2E]/20 flex items-center justify-center mt-0.5">
                <span className="text-[11px] font-black text-[#E83A2E]">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div>
                <h2 className="text-[18px] font-black tracking-[-0.02em] text-gray-900 mb-3">{title}</h2>
                <p className="text-[14px] text-gray-600 leading-[1.85] whitespace-pre-line">{content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 p-6 rounded-2xl bg-[#fef3f1] border border-[#E83A2E]/15">
          <p className="text-[14px] font-bold text-gray-900 mb-1">Legal questions?</p>
          <p className="text-[13px] text-gray-500">
            Contact us at{' '}
            <a href="mailto:legal@digione.ai" className="text-[#E83A2E] font-semibold hover:underline">
              legal@digione.ai
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
