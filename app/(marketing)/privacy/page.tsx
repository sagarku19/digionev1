import LegalLedger from '@/src/components/marketing/LegalLedger';

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
    <LegalLedger
      route="/privacy"
      title="Privacy"
      accent="policy."
      sub="We care about your privacy. Here's exactly what we collect and why."
      updated="April 2025"
      sections={SECTIONS}
      footer={
        <div className="mt-14 p-6 rounded-xl bg-[#E83A2E]/[0.05] border border-[#E83A2E]/15">
          <p className="text-[14px] font-bold text-[#16130F] mb-1">Questions about your data?</p>
          <p className="text-[13px] font-medium text-black/50 leading-relaxed">
            Email our privacy team at{' '}
            <a href="mailto:privacy@digione.ai" className="text-[#E83A2E] font-semibold hover:underline">
              privacy@digione.ai
            </a>
          </p>
        </div>
      }
    />
  );
}
