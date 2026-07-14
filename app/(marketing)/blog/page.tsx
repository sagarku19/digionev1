import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';

const posts = [
  {
    slug: 'how-to-sell-digital-products-india',
    title: 'How to Sell Digital Products in India: The Complete 2025 Guide',
    excerpt: 'From picking your niche to getting your first UPI payment — everything an Indian creator needs to know to start selling digital products online.',
    category: 'Guide',
    readTime: '8 min read',
    date: 'Apr 15, 2025',
    featured: true,
  },
  {
    slug: 'instagram-dm-automation-creators',
    title: 'How Instagram DM Automation Is Changing Creator Income in 2025',
    excerpt: "Auto-DMs are helping Indian creators turn every comment into a customer. Here's how to set it up and what results to expect.",
    category: 'Automation',
    readTime: '5 min read',
    date: 'Apr 10, 2025',
    featured: false,
  },
  {
    slug: 'upi-vs-international-payments-creators',
    title: 'UPI vs International Payment Gateways: What Indian Creators Should Use',
    excerpt: 'Comparing popular Indian payment gateways with Stripe and Gumroad for digital product sellers. Fees, settlement times, and which one wins.',
    category: 'Payments',
    readTime: '6 min read',
    date: 'Apr 5, 2025',
    featured: false,
  },
  {
    slug: 'build-link-in-bio-store',
    title: 'Build a Link-in-Bio Store That Actually Converts',
    excerpt: "Most link-in-bio pages waste traffic. Here's the exact structure top Indian creators use to convert Instagram followers into buyers.",
    category: 'Design',
    readTime: '7 min read',
    date: 'Mar 28, 2025',
    featured: false,
  },
  {
    slug: 'affiliate-program-digital-products',
    title: 'Launch an Affiliate Program for Your Digital Products in 30 Minutes',
    excerpt: 'Turn your existing customers into your best salespeople. A step-by-step guide to setting up affiliates on DigiOne.',
    category: 'Growth',
    readTime: '4 min read',
    date: 'Mar 20, 2025',
    featured: false,
  },
];

export const metadata = {
  title: 'Blog | DigiOne',
  description: 'Guides, strategies, and stories for Indian creators building real income online.',
};

export default function BlogPage() {
  const [featured, ...rest] = posts;

  return (
    <main className="flex flex-col w-full overflow-hidden bg-white">

      {/* Header */}
      <section className="relative bg-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(22,19,15,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.035) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
          }}
        />
        <Rails className="pt-28 sm:pt-36">
          <div className="px-5 sm:px-10 lg:px-14 pb-14 sm:pb-20">
            <Kicker index="00" route="/blog" />
            <h1 className="mt-7 sm:mt-9 text-[36px] sm:text-[52px] lg:text-[60px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F] max-w-2xl">
              Creator resources
              <br />
              <span className="text-[#E83A2E]">& guides.</span>
            </h1>
            <p className="mt-6 text-[15px] sm:text-[17px] font-medium text-black/50 max-w-xl leading-relaxed">
              Practical tips, strategies, and stories from India&apos;s creator economy.
            </p>
          </div>
        </Rails>
      </section>

      {/* Featured post — ink */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <Link href={`/blog/${featured.slug}`} className="group block">
            <div className="relative bg-[#16130F] px-5 sm:px-10 lg:px-14 py-10 sm:py-14 overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-50 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(232,58,46,0.22) 0%, transparent 45%)' }}
              />
              <div className="relative">
                <div className="flex items-center gap-4 font-ledger text-[11px]">
                  <span className="text-[#FF6B5C] font-semibold">{'>>'}</span>
                  <span className="text-white/35 uppercase tracking-[0.18em]">Featured · {featured.category}</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-white/[0.09]" />
                  <span className="text-white/35">{featured.date}</span>
                </div>
                <h2 className="mt-7 text-[24px] sm:text-[32px] font-bold tracking-[-0.03em] leading-[1.15] text-white max-w-2xl">
                  {featured.title}
                </h2>
                <p className="mt-4 text-[14px] sm:text-[15px] text-white/55 font-medium leading-relaxed max-w-2xl">
                  {featured.excerpt}
                </p>
                <div className="mt-7 flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-ledger text-[11px] text-white/35">
                    <Clock className="w-3.5 h-3.5" />
                    {featured.readTime}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white group-hover:text-[#FF6B5C] transition-colors duration-200">
                    Read article
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </Rails>
      </section>

      {/* Post ledger */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <Cross className="-bottom-[5px] -left-[5px]" />
          <Cross className="-bottom-[5px] -right-[5px]" />
          <div className="grid grid-cols-1 md:grid-cols-2">
            {rest.map((post, i) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className={`group block px-5 sm:px-8 py-8 sm:py-10 border-black/[0.07] hover:bg-[#FAF8F6] transition-colors duration-200 ${
                  i % 2 !== 0 ? 'md:border-l' : ''
                } ${i >= 1 ? 'border-t md:border-t-0' : ''} ${i >= 2 ? 'md:border-t' : ''}`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="font-ledger text-[11px] font-semibold text-[#E83A2E]">
                    {'>>'}
                  </span>
                  <span className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35">
                    {post.category}
                  </span>
                </div>
                <h3 className="text-[17px] font-bold tracking-[-0.02em] text-[#16130F] leading-snug mb-2.5 group-hover:text-[#E83A2E] transition-colors duration-200">
                  {post.title}
                </h3>
                <p className="text-[13.5px] text-black/50 font-medium leading-relaxed mb-5 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between font-ledger text-[10px] text-black/30">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </span>
                  <span>{post.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </Rails>
      </section>
    </main>
  );
}
