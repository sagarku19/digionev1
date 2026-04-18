import Link from 'next/link';
import { ArrowRight, Clock, Tag } from 'lucide-react';

const posts = [
  {
    slug: 'how-to-sell-digital-products-india',
    title: 'How to Sell Digital Products in India: The Complete 2025 Guide',
    excerpt: 'From picking your niche to getting your first UPI payment — everything an Indian creator needs to know to start selling digital products online.',
    category: 'Guide',
    readTime: '8 min read',
    date: 'Apr 15, 2025',
    accent: 'from-[#E83A2E] to-orange-500',
    featured: true,
  },
  {
    slug: 'instagram-dm-automation-creators',
    title: 'How Instagram DM Automation Is Changing Creator Income in 2025',
    excerpt: "Auto-DMs are helping Indian creators turn every comment into a customer. Here's how to set it up and what results to expect.",
    category: 'Automation',
    readTime: '5 min read',
    date: 'Apr 10, 2025',
    accent: 'from-rose-500 to-pink-500',
    featured: false,
  },
  {
    slug: 'upi-vs-international-payments-creators',
    title: 'UPI vs International Payment Gateways: What Indian Creators Should Use',
    excerpt: 'Comparing Razorpay, Cashfree, Stripe, and Gumroad for Indian digital product sellers. Fees, settlement times, and which one wins.',
    category: 'Payments',
    readTime: '6 min read',
    date: 'Apr 5, 2025',
    accent: 'from-emerald-500 to-teal-500',
    featured: false,
  },
  {
    slug: 'build-link-in-bio-store',
    title: 'Build a Link-in-Bio Store That Actually Converts',
    excerpt: "Most link-in-bio pages waste traffic. Here's the exact structure top Indian creators use to convert Instagram followers into buyers.",
    category: 'Design',
    readTime: '7 min read',
    date: 'Mar 28, 2025',
    accent: 'from-violet-500 to-indigo-500',
    featured: false,
  },
  {
    slug: 'affiliate-program-digital-products',
    title: 'Launch an Affiliate Program for Your Digital Products in 30 Minutes',
    excerpt: 'Turn your existing customers into your best salespeople. A step-by-step guide to setting up affiliates on DigiOne.',
    category: 'Growth',
    readTime: '4 min read',
    date: 'Mar 20, 2025',
    accent: 'from-amber-500 to-orange-500',
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
    <main className="bg-white min-h-screen">

      {/* Header */}
      <section className="pt-36 pb-16 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 55%)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 55%)',
          }}
        />
        <div className="max-w-4xl mx-auto px-5 text-center relative z-10">
          <p className="inline-flex items-center text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-5 bg-[#E83A2E]/[0.07] px-4 py-1.5 rounded-full border border-[#E83A2E]/15">
            Blog
          </p>
          <h1 className="text-[42px] sm:text-[56px] font-black text-gray-900 tracking-[-0.04em] leading-[1.05] mb-4">
            Creator playbook.
          </h1>
          <p className="text-[17px] text-gray-500 font-medium max-w-md mx-auto leading-relaxed">
            Guides, strategies, and stories for Indian creators building real income online.
          </p>
        </div>
      </section>

      <section className="pb-24 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">

          {/* Featured post */}
          <div className="mb-10">
            <Link href={`/blog/${featured.slug}`} className="group block">
              <div className="relative rounded-[28px] overflow-hidden border border-black/[0.06] bg-white shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-400">
                <div className={`h-1.5 bg-gradient-to-r ${featured.accent}`} />
                <div className="p-8 sm:p-10">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#E83A2E] bg-[#E83A2E]/[0.07] border border-[#E83A2E]/15 px-3 py-1 rounded-full">
                      {featured.category}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
                      Featured
                    </span>
                  </div>
                  <h2 className="text-[24px] sm:text-[30px] font-black text-gray-900 tracking-tight leading-snug mb-4 group-hover:text-[#E83A2E] transition-colors duration-300">
                    {featured.title}
                  </h2>
                  <p className="text-[15px] text-gray-500 font-medium leading-relaxed mb-6 max-w-2xl">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-[12px] text-gray-400 font-semibold">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{featured.readTime}</span>
                    <span>{featured.date}</span>
                    <span className="ml-auto flex items-center gap-1.5 text-[#E83A2E] font-black">
                      Read article <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                <div className="relative rounded-[24px] overflow-hidden border border-black/[0.06] bg-[#fafafa] hover:bg-white hover:shadow-[0_12px_36px_-10px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-400 h-full">
                  <div className={`h-1 bg-gradient-to-r ${post.accent}`} />
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="w-3 h-3 text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{post.category}</span>
                    </div>
                    <h3 className="text-[16px] font-black text-gray-900 tracking-tight leading-snug mb-3 group-hover:text-[#E83A2E] transition-colors duration-300">
                      {post.title}
                    </h3>
                    <p className="text-[13px] text-gray-500 font-medium leading-relaxed mb-5 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold">
                      <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{post.readTime}</span>
                      <span>{post.date}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
