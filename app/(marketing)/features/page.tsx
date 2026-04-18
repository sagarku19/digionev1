import { ShieldCheck, Zap, LayoutDashboard, MessageCircle, BarChart3, CreditCard, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Features · DigiOne.ai',
  description: 'Everything you need to build, manage, and scale your creator business. No code required.',
};

const MAIN_FEATURES = [
  {
    title: 'Instant storefronts',
    desc: 'Launch your digital store in seconds with high-converting, pre-designed templates tailored for creators.',
    icon: LayoutDashboard,
    color: 'from-blue-500 to-indigo-500',
  },
  {
    title: 'Zero-friction payouts',
    desc: 'Get your earnings via UPI automatically within 24 hours. No manual withdrawals, no hidden wire fees.',
    icon: CreditCard,
    color: 'from-emerald-400 to-teal-500',
  },
  {
    title: 'Built-in affiliate engine',
    desc: 'Turn your best customers into your sales team. Setup custom rev-shares with two clicks.',
    icon: Zap,
    color: 'from-[#E83A2E] to-orange-400',
  },
  {
    title: 'Auto DMs & automation',
    desc: 'Connect your Instagram to automatically send product links when fans comment a specific keyword.',
    icon: MessageCircle,
    color: 'from-violet-400 to-purple-500',
  },
  {
    title: 'Creator analytics',
    desc: 'Detailed heatmaps and conversion funnels to understand exactly where your traffic is dropping off.',
    icon: BarChart3,
    color: 'from-blue-400 to-cyan-500',
  },
  {
    title: 'Bank-grade security',
    desc: 'Piracy protection and DRM built-in to prevent unauthorized sharing of your hard work.',
    icon: ShieldCheck,
    color: 'from-slate-600 to-gray-800',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div style={{
            position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
            width: '800px', height: '600px',
            backgroundImage: 'radial-gradient(ellipse, rgba(232,58,46,0.08) 0%, transparent 65%)',
            filter: 'blur(70px)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 60%)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 60%)',
          }} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/8 shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-[12px] font-semibold text-gray-500 mb-7">
            <Sparkles className="w-3.5 h-3.5 text-[#E83A2E]" />
            Everything you need
          </div>
          <h1 className="text-[48px] sm:text-[60px] font-black tracking-[-0.04em] leading-[1.04] text-gray-900 mb-5">
            Features built for{' '}
            <span style={{
              backgroundImage: 'linear-gradient(135deg, #E83A2E 0%, #ff7040 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent', color: 'transparent',
            }}>
              growth.
            </span>
          </h1>
          <p className="text-[17px] text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto mb-10">
            Stop stitching together 5 different tools. DigiOne gives you an all-in-one suite to sell digital products, courses, and communities seamlessly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#E83A2E] text-white rounded-xl text-sm font-bold shadow-[0_4px_14px_-2px_rgba(232,58,46,0.35)] hover:-translate-y-0.5 transition-all"
            >
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white border border-black/10 text-gray-800 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MAIN_FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group p-8 rounded-3xl bg-[#fafafa] border border-black/[0.05] hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-sm`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-[18px] font-black tracking-[-0.02em] text-gray-900 mb-3 group-hover:text-[#E83A2E] transition-colors">{feature.title}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
