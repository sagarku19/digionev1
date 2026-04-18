export const metadata = {
  title: 'Privacy Policy · DigiOne.ai',
  description: 'How DigiOne.ai collects, uses, and protects your personal information.',
};

const SECTIONS = [
  {
    title: 'Information We Collect',
    content: `When you use DigiOne.ai, we collect:\n\n• **Account data** — name, email address, and password when you register.\n• **Profile data** — avatar, bio, and storefront details you choose to add.\n• **Transaction data** — purchase history, payout records, and payment method details (processed securely via Razorpay/Cashfree).\n• **Usage data** — pages visited, clicks, device type, browser, and IP address.\n• **Communications** — emails or messages you send to our support team.`,
  },
  {
    title: 'How We Use Your Information',
    content: `We use your information to:\n\n• Provide, operate, and improve the DigiOne platform.\n• Process payments and deliver purchased products.\n• Send transactional emails (receipts, password resets, important notices).\n• Send optional marketing emails — you can unsubscribe anytime.\n• Detect fraud and ensure platform security.\n• Comply with legal obligations.`,
  },
  {
    title: 'Sharing Your Information',
    content: `We do not sell your personal data. We share data only with:\n\n• **Payment processors** (Razorpay, Cashfree) to complete transactions.\n• **Infrastructure providers** (Supabase, Vercel) who host our platform.\n• **Analytics tools** to understand how the product is used.\n• **Law enforcement** when required by applicable law.`,
  },
  {
    title: 'Cookies & Tracking',
    content: `We use cookies and similar technologies to maintain your session, remember preferences, and analyse usage. You can disable cookies in your browser settings, though some platform features may not function correctly.`,
  },
  {
    title: 'Data Retention',
    content: `We retain your account data for as long as your account is active. If you delete your account, we remove your personal data within 30 days, except where legally required to retain it longer (e.g., financial records for 7 years under Indian tax law).`,
  },
  {
    title: 'Your Rights',
    content: `You have the right to:\n\n• Access the personal data we hold about you.\n• Correct inaccurate data.\n• Request deletion of your data.\n• Withdraw consent for marketing communications.\n\nEmail us at privacy@digione.ai to exercise any of these rights.`,
  },
  {
    title: 'Security',
    content: `We use industry-standard measures including TLS encryption in transit, AES-256 encryption at rest, and strict access controls. However, no system is completely secure — please use a strong, unique password.`,
  },
  {
    title: 'Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you via email or an in-app notice for material changes. Continued use of the platform after changes constitutes acceptance.`,
  },
];

export default function PrivacyPage() {
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
            Privacy{' '}
            <span style={{
              backgroundImage: 'linear-gradient(135deg, #E83A2E 0%, #ff7040 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent', color: 'transparent',
            }}>Policy</span>
          </h1>
          <p className="text-[16px] text-gray-500 font-medium leading-relaxed max-w-md mx-auto">
            We care about your privacy. Here&apos;s exactly what we collect and why.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-28">
        {/* Quick summary bar */}
        <div className="grid grid-cols-3 gap-3 mb-12 p-5 rounded-2xl bg-[#fafafa] border border-black/[0.06]">
          {[
            { emoji: '🔒', text: 'We never sell your data' },
            { emoji: '📧', text: 'Unsubscribe anytime' },
            { emoji: '🗑️', text: 'Delete your data anytime' },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-2xl">{emoji}</span>
              <span className="text-[12px] font-semibold text-gray-600 leading-tight">{text}</span>
            </div>
          ))}
        </div>

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
          <p className="text-[14px] font-bold text-gray-900 mb-1">Questions about your data?</p>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            Email our privacy team at{' '}
            <a href="mailto:privacy@digione.ai" className="text-[#E83A2E] font-semibold hover:underline">
              privacy@digione.ai
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
