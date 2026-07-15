import LegalLedger from '@/src/components/marketing/LegalLedger';

export const metadata = {
  title: 'Privacy Policy · DigiOne.ai',
  description: 'How DigiOne.ai collects, uses, and protects your personal information under the DPDP Act, 2023.',
};

const SECTIONS = [
  {
    title: 'Who We Are & Scope',
    content: `DigiOne.ai ("DigiOne", "we") is a platform that lets creators sell digital products and lets buyers purchase them. This policy explains what personal data we collect, why we collect it, and the choices you have. It applies to creators, buyers, and visitors across digione.ai and every DigiOne-powered storefront.\n\nFor the purposes of India's **Digital Personal Data Protection Act, 2023** (DPDP Act), DigiOne is the data fiduciary for the personal data described in this policy.`,
  },
  {
    title: 'Information We Collect',
    content: `When you use DigiOne.ai, we collect:\n\n• **Account data** — name, email address, and password when you register.\n• **Profile data** — avatar, bio, and storefront details you choose to add.\n• **Transaction data** — purchase history, payout records, and payment references. Card, UPI, and banking details are processed directly by our RBI-regulated payment partners — **we never see or store your card number, CVV, or UPI PIN**.\n• **KYC data (creators only)** — identity and bank details required by law before payouts, stored encrypted.\n• **Usage data** — pages visited, clicks, device type, browser, and IP address.\n• **Communications** — emails or messages you send to our support team.`,
  },
  {
    title: 'How We Use Your Information',
    content: `We use your information to:\n\n• Provide, operate, and improve the DigiOne platform.\n• Process payments, deliver purchased products, and pay out creators.\n• Send transactional emails (receipts, password resets, important notices).\n• Send optional marketing emails — you can unsubscribe anytime.\n• Detect fraud and keep the platform secure.\n• Comply with legal obligations, including Indian tax and payment regulations.`,
  },
  {
    title: 'Consent & Legal Basis',
    content: `We process your personal data on the basis of the consent you give when you create an account, make a purchase, or submit a form — and for legitimate uses recognised by the DPDP Act, such as fulfilling a purchase you initiate, complying with law, and preventing fraud.\n\nYou may withdraw your consent at any time by writing to privacy@digione.ai. Withdrawal does not affect processing already carried out, and some data must still be retained where the law requires it.`,
  },
  {
    title: 'Sharing Your Information',
    content: `We do not sell your personal data. We share data only with:\n\n• **Payment and payout partners** — RBI-regulated payment gateways, to process transactions and creator payouts.\n• **Cloud infrastructure providers** — who host the platform and storage under strict data-processing terms.\n• **The creator you buy from** — order details needed to fulfil your purchase (your name, email, and the product bought). Creators must handle this data in line with applicable law.\n• **Analytics tools** — to understand how the product is used.\n• **Law enforcement and regulators** — when required by applicable law.`,
  },
  {
    title: 'Cookies & Tracking',
    content: `We use cookies and similar technologies to maintain your session, remember preferences, and analyse usage. You can disable cookies in your browser settings, though some platform features — like staying signed in — will not function correctly without them.`,
  },
  {
    title: 'Data Retention',
    content: `We retain your account data for as long as your account is active. If you delete your account, we remove your personal data within 30 days, except where the law requires longer retention — for example, financial and tax records are kept for 7 years under Indian tax law.`,
  },
  {
    title: 'Your Rights',
    content: `As a data principal under the DPDP Act, you have the right to:\n\n• **Access** — request a summary of the personal data we hold about you and how it is processed.\n• **Correction** — have inaccurate or incomplete data corrected or updated.\n• **Erasure** — request deletion of your personal data, subject to legal retention requirements.\n• **Grievance redressal** — raise a complaint about how your data is handled (see below).\n• **Nomination** — nominate a person to exercise these rights on your behalf in the event of death or incapacity.\n\nEmail privacy@digione.ai to exercise any of these rights. We verify identity before acting on requests.`,
  },
  {
    title: 'Data Security',
    content: `We use industry-standard measures including TLS encryption in transit, AES-256 encryption at rest, row-level access controls, and encrypted storage for sensitive KYC data. See our Security Policy for the full picture. No system is completely secure — please use a strong, unique password.`,
  },
  {
    title: "Children's Privacy",
    content: `DigiOne is intended for users aged 18 and above. We do not knowingly collect or process the personal data of children. If you believe a child has provided us personal data, write to privacy@digione.ai and we will delete it.`,
  },
  {
    title: 'Grievance Redressal',
    content: `In accordance with the Information Technology Rules, 2021 and the DPDP Act, 2023, complaints about your personal data or this policy can be raised with our Grievance Officer:\n\n• **Grievance Officer:** [Grievance Officer Name]\n• **Email:** grievance@digione.ai\n• **Entity:** DigiOne AI Tech Pvt. Ltd., Bangalore, Karnataka, India\n\nGrievances are acknowledged within 48 hours and resolved within 15 days. If you are not satisfied with our response, you may escalate to the Data Protection Board of India.`,
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
      sub="We care about your privacy. Here's exactly what we collect, why, and the rights you have over it."
      updated="July 2026"
      sections={SECTIONS}
      toc
      footer={
        <div className="mt-14 p-6 rounded-xl bg-[#E83A2E]/[0.05] border border-[#E83A2E]/15">
          <p className="text-[14px] font-bold text-[#16130F] mb-1">Questions about your data?</p>
          <p className="text-[13px] font-medium text-black/50 leading-relaxed">
            Email our privacy team at{' '}
            <a href="mailto:privacy@digione.ai" className="text-[#E83A2E] font-semibold hover:underline">
              privacy@digione.ai
            </a>{' '}
            — or raise a grievance at{' '}
            <a href="mailto:grievance@digione.ai" className="text-[#E83A2E] font-semibold hover:underline">
              grievance@digione.ai
            </a>
          </p>
        </div>
      }
    />
  );
}
