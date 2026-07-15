import LegalLedger from '@/src/components/marketing/LegalLedger';

export const metadata = {
  title: 'Security Policy · DigiOne.ai',
  description: 'How DigiOne.ai protects your data, payments, and content — and how to report a vulnerability.',
};

const SECTIONS = [
  {
    title: 'Our Commitment',
    content: `Security is foundational to DigiOne. Creators trust us with their income and content; buyers trust us with their payments and personal data. We treat both as non-negotiable responsibilities and design every feature with security in mind from day one.`,
  },
  {
    title: 'Infrastructure & Encryption',
    content: `• All traffic is encrypted in transit with **TLS 1.2+** — there is no unencrypted access to the platform.\n• Data is encrypted at rest with **AES-256** on our database and storage infrastructure.\n• The platform runs on hardened, SOC 2-compliant cloud infrastructure with isolated environments for production.\n• Access to production systems is restricted to authorized personnel with multi-factor authentication.`,
  },
  {
    title: 'Payment Security',
    content: `• All payments are processed by an **RBI-regulated Indian payment gateway**. Card and UPI details go directly to the gateway — **DigiOne never stores your card numbers, CVV, or UPI PIN**.\n• Payment confirmations are verified server-side with cryptographic signatures before any order is marked paid.\n• Creator payouts go through verified bank accounts after KYC verification.`,
  },
  {
    title: 'Account Security',
    content: `• Passwords are hashed with industry-standard algorithms — we can never read your password.\n• Google sign-in is supported via OAuth 2.0 with PKCE, so your Google credentials never touch our servers.\n• Sessions are managed with short-lived, signed tokens that refresh automatically and can be revoked by signing out.\n• We recommend using a strong, unique password and enabling 2-step verification on your email account.`,
  },
  {
    title: 'Data Protection & Access Control',
    content: `• Every database query is governed by **row-level security** — creators can only access their own data, and buyers can only access their own purchases.\n• Private content (deliverables, KYC documents) lives in private storage buckets, accessible only through short-lived signed URLs minted after an ownership check.\n• Internal access to user data is limited, logged, and reviewed.`,
  },
  {
    title: 'Content Protection',
    content: `• Digital products are delivered through time-limited download links tied to verified purchases.\n• Download access requires an authenticated session and a purchase record — links cannot be shared indefinitely.\n• We act on takedown and piracy reports — contact us if you find your content redistributed without permission.`,
  },
  {
    title: 'Responsible Disclosure',
    content: `Found a vulnerability? We want to hear from you — before anyone else does.\n\n• Email **security@digione.ai** with a description, steps to reproduce, and impact assessment.\n• Please do not access other users' data, disrupt the service, or publicly disclose the issue before we've had a chance to fix it.\n• We aim to acknowledge reports within 48 hours and resolve confirmed issues promptly. Good-faith research conducted under this policy will not result in legal action.`,
  },
  {
    title: 'Contact',
    content: `For security concerns or vulnerability reports, contact security@digione.ai. For general privacy questions, see our Privacy Policy or write to privacy@digione.ai.`,
  },
];

export default function SecurityPage() {
  return (
    <LegalLedger
      route="/security"
      title="Security"
      accent="policy."
      sub="How we protect your data, payments, and content — and how to report a vulnerability."
      updated="July 2026"
      sections={SECTIONS}
      toc
      footer={
        <div className="mt-14 p-6 rounded-xl bg-[#E83A2E]/[0.05] border border-[#E83A2E]/15">
          <p className="text-[14px] font-bold text-[#16130F] mb-1">Found a vulnerability?</p>
          <p className="text-[13px] font-medium text-black/50 leading-relaxed">
            Report it privately to{' '}
            <a href="mailto:security@digione.ai" className="text-[#E83A2E] font-semibold hover:underline">
              security@digione.ai
            </a>{' '}
            — we acknowledge reports within 48 hours.
          </p>
        </div>
      }
    />
  );
}
