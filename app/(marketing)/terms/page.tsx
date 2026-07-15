import LegalLedger from '@/src/components/marketing/LegalLedger';

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
    content: `Buyers may purchase digital products listed on the Platform. All sales are final unless the creator's policy or DigiOne's Refunds & Cancellation Policy provides otherwise. By completing a purchase, you agree to the creator's stated terms and DigiOne's Refunds & Cancellation Policy.`,
  },
  {
    title: 'Payments & Pricing',
    content: `All prices on the Platform are listed and charged in Indian Rupees (₹).\n\n• Payments are processed by **RBI-regulated third-party payment gateways** — DigiOne never stores your card number, CVV, or UPI PIN.\n• An order is confirmed only after the payment gateway confirms the transaction to us server-side.\n• The price shown at checkout is the complete amount you pay — there are no delivery or hidden charges.`,
  },
  {
    title: 'Platform Fees',
    content: `DigiOne charges a platform fee on each transaction:\n\n• **Free plan:** 10% platform fee per sale.\n• **Pro plan:** 5% platform fee per sale.\n\nFees are deducted automatically before payouts. Payout schedules and minimums are described in your dashboard settings.`,
  },
  {
    title: 'Delivery of Digital Products',
    content: `Products sold on the Platform are digital and delivered electronically — nothing is physically shipped. Access is granted immediately after payment confirmation, via the purchase confirmation email and, for logged-in buyers, the account library.\n\nSee our Shipping & Delivery Policy for delivery timelines and what to do if a delivery fails.`,
  },
  {
    title: 'Refunds & Cancellation',
    content: `Refunds and cancellations are governed by our Refunds & Cancellation Policy. In short: genuine delivery failures, materially misdescribed products, and duplicate charges are refundable within 7 days of purchase; digital products that have been delivered and accessed cannot be cancelled.`,
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
    title: 'Grievances & Contact',
    content: `For questions about these Terms, contact us at legal@digione.ai.\n\nFor complaints and grievances, our Grievance Officer can be reached at grievance@digione.ai — grievances are acknowledged within 48 hours and resolved within 15 days. Full details are on our Contact page.`,
  },
];

export default function TermsPage() {
  return (
    <LegalLedger
      route="/terms"
      title="Terms of"
      accent="service."
      sub="Please read these terms carefully. They govern your use of DigiOne.ai."
      updated="July 2026"
      sections={SECTIONS}
      toc
      footer={
        <div className="mt-14 p-6 rounded-xl bg-[#E83A2E]/[0.05] border border-[#E83A2E]/15">
          <p className="text-[14px] font-bold text-[#16130F] mb-1">Legal questions?</p>
          <p className="text-[13px] font-medium text-black/50">
            Contact us at{' '}
            <a href="mailto:legal@digione.ai" className="text-[#E83A2E] font-semibold hover:underline">
              legal@digione.ai
            </a>
          </p>
        </div>
      }
    />
  );
}
