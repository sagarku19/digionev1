import Link from 'next/link';
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react';
import { Rails, Cross } from '@/src/components/marketing/Ledger';

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
    body: `This is where Indian creators get a massive advantage over international platforms like Gumroad or Lemon Squeezy.\n\nDigiOne is built on India-first payment rails — which means:\n- **UPI payments** accepted from any app (PhonePe, GPay, Paytm, BHIM)\n- **Same-day settlements** directly to your bank account\n- **No conversion fees** — everything in INR\n- **GST invoice generation** built-in\n\nInternational platforms charge you in USD, convert to INR at bad rates, and take 5–10 days to settle. DigiOne pays you today.`,
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
            const text = line.replace(/^- /, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#16130F] font-semibold">$1</strong>');
            return line.startsWith('- ') ? (
              <li key={k} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] mt-2.5 shrink-0" />
                <span dangerouslySetInnerHTML={{ __html: text }} />
              </li>
            ) : (
              <p key={k} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#16130F] font-semibold">$1</strong>') }} />
            );
          })}
        </ul>
      );
    }
    return (
      <p key={j} dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#16130F] font-semibold">$1</strong>') }} />
    );
  });
}

export default function BlogPostPage() {
  return (
    <main className="flex flex-col w-full overflow-hidden bg-white">
      <section className="relative bg-white">
      <Rails className="pt-28 sm:pt-32 pb-14 sm:pb-20">
        <Cross className="-bottom-[5px] -left-[5px]" />
        <Cross className="-bottom-[5px] -right-[5px]" />

        <div className="px-5 sm:px-10 lg:px-14">
          <div className="max-w-3xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-black/45 hover:text-[#16130F] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          <article className="mt-8 pb-4">

            {/* Meta — ledger kicker */}
            <div className="flex items-center gap-4 font-ledger text-[11px] mb-6">
              <span className="text-[#E83A2E] font-semibold">{'>>'}</span>
              <span className="text-black/35 uppercase tracking-[0.18em]">Guide</span>
              <span className="flex items-center gap-1.5 text-black/35">
                <Clock className="w-3.5 h-3.5" /> 8 min read
              </span>
              <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
              <span className="text-black/35">Apr 15, 2025</span>
            </div>

            {/* Title */}
            <h1 className="text-[30px] sm:text-[40px] font-bold text-[#16130F] tracking-[-0.03em] leading-[1.1] mb-6">
              How to Sell Digital Products in India: The Complete 2025 Guide
            </h1>

            <p className="text-[16px] sm:text-[18px] text-black/50 font-medium leading-relaxed mb-10 pb-10 border-b border-black/[0.07]">
              From picking your niche to getting your first UPI payment — everything an Indian creator needs to know to start selling digital products online.
            </p>

            {/* Sections */}
            <div className="space-y-12">
              {sections.map((section, i) => (
                <div key={i}>
                  <p className="font-ledger text-[11px] font-semibold text-[#E83A2E] mb-3">
                    {'>>'}
                  </p>
                  <h2 className="text-[21px] sm:text-[24px] font-bold text-[#16130F] tracking-[-0.02em] mb-4">
                    {section.heading}
                  </h2>
                  <div className="text-[15px] text-black/60 font-medium leading-[1.8] space-y-4">
                    {renderBody(section.body)}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA — vermilion stamp */}
            <div className="mt-16 relative rounded-2xl bg-[#E83A2E] overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 60% 90% at 85% 10%, rgba(255,255,255,0.14) 0%, transparent 60%)' }}
              />
              <div className="relative p-8 sm:p-10 text-center">
                <p className="font-ledger text-[10px] uppercase tracking-[0.18em] text-white/55 mb-3">Ready to start?</p>
                <h3 className="text-[24px] sm:text-[28px] font-bold text-white tracking-[-0.03em] mb-3">
                  Build your store in 30 minutes.
                </h3>
                <p className="text-[14px] text-white/75 font-medium mb-6">
                  Free forever plan. No credit card. Instant UPI payouts.
                </p>
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#16130F] hover:bg-black text-white font-semibold text-[14px] transition-colors duration-200"
                >
                  Start for free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </Link>
              </div>
            </div>
          </article>
          </div>
        </div>
      </Rails>
      </section>
    </main>
  );
}
