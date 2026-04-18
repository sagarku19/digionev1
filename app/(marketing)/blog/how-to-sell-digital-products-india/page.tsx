import Link from 'next/link';
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'How to Sell Digital Products in India: The Complete 2025 Guide | DigiOne Blog',
  description: 'From picking your niche to getting your first UPI payment — everything an Indian creator needs to know to start selling digital products online.',
};

const sections = [
  {
    heading: 'Why Digital Products?',
    body: `Digital products are the highest-leverage thing an Indian creator can sell. Zero inventory, zero shipping, zero GST headaches on most categories — and your profit margin is essentially 100% minus platform fees.\n\nCompare that to physical goods: packaging, logistics, returns, storage. Digital products sell while you sleep. One Figma template, one ebook, one course — and it can generate income for years.\n\nThe Indian creator economy crossed ₹2,200 crore in 2024 and is projected to 3x by 2027. There has never been a better time to start.`,
  },
  {
    heading: 'Step 1 — Pick your niche and product type',
    body: `The best digital products solve a specific problem for a specific audience. Don't try to appeal to everyone.\n\n**High-performing niches in India right now:**\n- Figma/UI kits for designers\n- Notion templates for students and productivity nerds\n- Photography presets for Instagram creators\n- Stock trading / finance guides\n- Fitness and nutrition plans\n- English communication courses\n\n**Product types to consider:**\n- **Ebooks/PDFs** — fastest to create, easiest to sell\n- **Templates** — Notion, Excel, Google Slides, Canva\n- **Courses** — highest price point, most effort\n- **Presets** — Lightroom, Photoshop\n- **Services** — 1:1 calls, reviews, consulting (productized)\n\nStart with one. Ship fast. Iterate based on what sells.`,
  },
  {
    heading: 'Step 2 — Set up your store in minutes',
    body: `You don't need a developer, a designer, or a ₹50,000 website to start. DigiOne's visual builder lets you create a professional store in under 30 minutes.\n\nHere's exactly what you need:\n- A product (PDF, video, zip file — anything digital)\n- A price (start with ₹299–₹999 for your first product)\n- A description that explains the transformation, not just the deliverable\n- A cover image (Canva works fine)\n\nYour store comes with a clean URL like **digione.ai/yourname** that you can share anywhere — Instagram bio, YouTube description, WhatsApp status.`,
  },
  {
    heading: 'Step 3 — Accept UPI payments (India-first)',
    body: `This is where Indian creators get a massive advantage over international platforms like Gumroad or Lemon Squeezy.\n\nDigiOne is built on Cashfree — which means:\n- **UPI payments** accepted from any app (PhonePe, GPay, Paytm, BHIM)\n- **Same-day settlements** directly to your bank account\n- **No conversion fees** — everything in INR\n- **GST invoice generation** built-in\n\nInternational platforms charge you in USD, convert to INR at bad rates, and take 5–10 days to settle. DigiOne pays you today.`,
  },
  {
    heading: 'Step 4 — Promote with Instagram Auto DMs',
    body: `Here's the growth hack that's working right now for thousands of Indian creators:\n\nPost a reel. Add a caption like "Comment 'GUIDE' to get my free PDF on X". DigiOne's AI bot automatically DMs everyone who comments — with your product link, a personalized message, and even a limited-time discount code.\n\n**Real results from DigiOne creators:**\n- Average comment-to-DM conversion: 78%\n- Average DM-to-click rate: 34%\n- Average click-to-purchase: 12%\n\nThat means for every 100 people who comment, you're getting ~4 buyers — completely automated, 24/7, while you're offline.`,
  },
  {
    heading: 'Step 5 — Scale with affiliates and automation',
    body: `Once your product is selling, it's time to scale without working more hours.\n\n**Affiliate program:** Let your existing customers become your sales team. DigiOne's built-in affiliate engine lets you set a commission rate (20–40% is standard), generate unique links for each affiliate, and automatically track and pay commissions.\n\n**Automation workflows:** When someone buys, automatically:\n- Send a WhatsApp confirmation\n- Add them to your Mailchimp email list with a tag\n- DM them a link to your next product\n- Invite them to your Telegram community\n\nAll of this runs without you touching a button.`,
  },
  {
    heading: 'Common mistakes to avoid',
    body: `**Pricing too low.** Indian creators often undercharge. ₹99 for an ebook makes you look cheap, not accessible. ₹499–₹999 signals quality. Test higher prices — you'll be surprised.\n\n**Waiting until it's perfect.** Ship a v1. Get feedback. Improve. A product that sells imperfectly is better than a perfect product no one sees.\n\n**Using Gumroad.** 10% fees + USD conversion + slow settlements is a terrible deal for Indian creators. You're giving away ₹1,500 for every ₹15,000 you make.\n\n**Not collecting emails.** Every buyer's email is an asset. DigiOne automatically syncs buyers to your Mailchimp or email list — your list is yours even if every platform disappears tomorrow.`,
  },
];

function renderBody(body: string) {
  return body.split('\n\n').map((para, j) => {
    if (para.startsWith('- ') || para.includes('\n- ')) {
      const lines = para.split('\n');
      return (
        <ul key={j} className="space-y-2 my-2">
          {lines.map((line, k) => {
            const text = line.replace(/^- /, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-black">$1</strong>');
            return line.startsWith('- ') ? (
              <li key={k} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] mt-2.5 shrink-0" />
                <span dangerouslySetInnerHTML={{ __html: text }} />
              </li>
            ) : (
              <p key={k} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-black">$1</strong>') }} />
            );
          })}
        </ul>
      );
    }
    return (
      <p key={j} dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-black">$1</strong>') }} />
    );
  });
}

export default function BlogPostPage() {
  return (
    <main className="bg-white min-h-screen">

      <div className="pt-28 pb-0 px-5 max-w-3xl mx-auto">
        <Link href="/blog" className="inline-flex items-center gap-2 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-colors duration-200 group">
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>
      </div>

      <article className="max-w-3xl mx-auto px-5 pb-24">

        {/* Meta */}
        <div className="flex items-center gap-3 mt-8 mb-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#E83A2E] bg-[#E83A2E]/[0.07] border border-[#E83A2E]/15 px-3 py-1 rounded-full">Guide</span>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-400">
            <Clock className="w-3.5 h-3.5" /> 8 min read
          </span>
          <span className="text-[12px] font-semibold text-gray-400">Apr 15, 2025</span>
        </div>

        {/* Title */}
        <h1 className="text-[32px] sm:text-[42px] font-black text-gray-900 tracking-[-0.03em] leading-[1.1] mb-6">
          How to Sell Digital Products in India: The Complete 2025 Guide
        </h1>

        <p className="text-[17px] sm:text-[19px] text-gray-500 font-medium leading-relaxed mb-10 pb-10 border-b border-gray-100">
          From picking your niche to getting your first UPI payment — everything an Indian creator needs to know to start selling digital products online.
        </p>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-[22px] sm:text-[26px] font-black text-gray-900 tracking-tight mb-4">
                {section.heading}
              </h2>
              <div className="text-[15px] sm:text-[16px] text-gray-600 font-medium leading-[1.8] space-y-4">
                {renderBody(section.body)}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 p-8 rounded-[28px] bg-gradient-to-br from-[#E83A2E]/[0.06] to-orange-50 border border-[#E83A2E]/15 text-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#E83A2E] mb-3">Ready to start?</p>
          <h3 className="text-[24px] font-black text-gray-900 tracking-tight mb-3">
            Build your store in 30 minutes.
          </h3>
          <p className="text-[14px] text-gray-500 font-medium mb-6">
            Free forever plan. No credit card. Instant UPI payouts.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#E83A2E] text-white font-bold text-[14px] shadow-[0_8px_24px_-4px_rgba(232,58,46,0.35)] hover:shadow-[0_14px_32px_-4px_rgba(232,58,46,0.45)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </article>
    </main>
  );
}
