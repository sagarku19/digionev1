import LegalLedger from '@/src/components/marketing/LegalLedger';

export const metadata = {
  title: 'Shipping & Delivery Policy · DigiOne.ai',
  description: 'How digital products purchased on DigiOne.ai are delivered — instantly, electronically, with no shipping charges.',
};

const SECTIONS = [
  {
    title: 'Digital-Only Delivery',
    content: `Every product sold on DigiOne.ai is digital — ebooks, courses, templates, presets, files, links, and services. Nothing is physically shipped, so there are **no shipping charges, no courier partners, and no delivery addresses** involved in any purchase.`,
  },
  {
    title: 'How Delivery Works',
    content: `Delivery is automatic and begins the moment your payment is confirmed:\n\n• A **purchase confirmation email** is sent to the email address you entered at checkout, containing access to your purchase.\n• If you were logged in when you bought, the product also appears instantly in your **DigiOne library** under your account.\n• Downloads are delivered through secure, time-limited links that you can re-generate from your library at any time.`,
  },
  {
    title: 'Delivery Timelines',
    content: `• **Standard delivery:** instant — access is granted within seconds of payment confirmation.\n• **Maximum delivery time:** if your payment succeeded but you have not received access within 30 minutes, treat it as a failed delivery and contact us (see below).\n• **Service-based products** (consultations, bookings, custom work): the delivery or fulfilment timeline is set by the creator and stated on the product page.`,
  },
  {
    title: 'Accessing Your Purchases',
    content: `• **Logged-in buyers:** open your account library at any time to view every product you have purchased and re-download files.\n• **Guest buyers:** your purchase is linked to the email you used at checkout. Create an account with that same email and your purchases are automatically attached to it.\n\nDouble-check your email address at checkout — it is how your purchase reaches you.`,
  },
  {
    title: 'Failed or Delayed Delivery',
    content: `If you paid but did not receive access:\n\n1. Check your spam/promotions folder for the confirmation email.\n2. Confirm the payment actually completed with your bank or UPI app.\n3. Email **support@digione.ai** with your order ID (or the email and approximate time of purchase).\n\nWe respond within 24 hours and resolve genuine delivery failures within 48 hours. If we cannot deliver your purchase, you receive a **full refund** as per our Refunds & Cancellation Policy.`,
  },
  {
    title: 'Pricing & Charges',
    content: `All prices are shown in Indian Rupees (₹) and are the complete amount you pay — there are no delivery fees, handling fees, or hidden charges added at checkout.`,
  },
  {
    title: 'Contact',
    content: `Questions about delivery? Reach us at support@digione.ai or through the Contact page.`,
  },
];

export default function ShippingPage() {
  return (
    <LegalLedger
      route="/shipping"
      title="Shipping &"
      accent="delivery."
      sub="Everything on DigiOne is digital — delivered instantly, with no shipping charges, ever."
      updated="July 2026"
      sections={SECTIONS}
      toc
      footer={
        <div className="mt-14 p-6 rounded-xl bg-[#E83A2E]/[0.05] border border-[#E83A2E]/15">
          <p className="text-[14px] font-bold text-[#16130F] mb-1">Didn&apos;t receive your purchase?</p>
          <p className="text-[13px] font-medium text-black/50 leading-relaxed">
            Email{' '}
            <a href="mailto:support@digione.ai" className="text-[#E83A2E] font-semibold hover:underline">
              support@digione.ai
            </a>{' '}
            with your order ID — we resolve delivery issues within 48 hours.
          </p>
        </div>
      }
    />
  );
}
