import LegalLedger from '@/src/components/marketing/LegalLedger';

export const metadata = {
  title: 'Refunds & Cancellation Policy · DigiOne.ai',
  description: "DigiOne's refund, cancellation, and dispute policy for creators and buyers.",
};

const SECTIONS = [
  {
    title: 'Overview',
    content: `DigiOne.ai is a platform that enables creators to sell digital products (courses, ebooks, templates, memberships, etc.) to buyers. Because digital products are instantly accessible after purchase, our refund and cancellation policy reflects that reality, while still protecting buyers from genuine issues.`,
  },
  {
    title: 'Cancellation',
    content: `• **Product orders:** digital products are delivered instantly after payment — once access is granted, the order cannot be cancelled. If you have second thoughts, decide before completing payment.\n• **Pending or failed payments:** if your payment fails or stays pending, no order is created and there is nothing to cancel. Any amount debited is automatically reversed by your bank or UPI provider as per its timelines.\n• **Creator subscription plans:** paid plans can be cancelled anytime from your dashboard billing settings. Cancellation takes effect at the end of the current billing period and stops all future charges — no partial-period refunds.`,
  },
  {
    title: 'Refund Eligibility (Buyers)',
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
    title: 'Refund Timelines',
    content: `Once a refund is approved, the amount is returned to your **original payment method** — the card, UPI ID, or bank account used at checkout. Banks and UPI providers typically reflect the credit within 5–7 business days of processing; some banks may take longer during holidays.`,
  },
  {
    title: 'Disputes & Chargebacks',
    content: `If you file a chargeback with your bank without first contacting us, your DigiOne account may be suspended pending investigation. We strongly encourage reaching out to us first — we resolve most issues within 48 hours.`,
  },
  {
    title: 'Contact',
    content: `Questions about a refund or cancellation? Reach us at support@digione.ai or through the Contact page. For unresolved grievances, our Grievance Officer is reachable at grievance@digione.ai.`,
  },
];

export default function RefundsPage() {
  return (
    <LegalLedger
      route="/refunds"
      title="Refunds &"
      accent="cancellation."
      sub="Clear, fair, and straightforward — because trust matters more than transactions."
      updated="July 2026"
      sections={SECTIONS}
      toc
      footer={
        <div className="mt-14 p-6 rounded-xl bg-[#E83A2E]/[0.05] border border-[#E83A2E]/15">
          <p className="text-[14px] font-bold text-[#16130F] mb-1">Still have questions?</p>
          <p className="text-[13px] font-medium text-black/50 leading-relaxed">
            Contact us at{' '}
            <a href="mailto:support@digione.ai" className="text-[#E83A2E] font-semibold hover:underline">
              support@digione.ai
            </a>{' '}
            and we&apos;ll help you sort it out.
          </p>
        </div>
      }
    />
  );
}
