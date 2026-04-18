import { Mail, MapPin, MessageCircle, Clock } from 'lucide-react';

export const metadata = {
  title: 'Contact Us · DigiOne.ai',
  description: 'Get in touch with the DigiOne team. We\'re here to help you grow your creator business.',
};

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email support',
    desc: 'We respond within 12 hours on business days.',
    value: 'support@digione.ai',
    href: 'mailto:support@digione.ai',
    color: 'from-blue-400 to-indigo-500',
  },
  {
    icon: MessageCircle,
    title: 'Community helpdesk',
    desc: 'Ask the community or our team in real time.',
    value: 'Join DigiOne Community',
    href: '/community',
    color: 'from-violet-400 to-purple-500',
  },
  {
    icon: Clock,
    title: 'Support hours',
    desc: 'Monday – Saturday, 10 AM – 7 PM IST.',
    value: '10:00 AM – 7:00 PM',
    href: null,
    color: 'from-emerald-400 to-teal-500',
  },
  {
    icon: MapPin,
    title: 'Registered office',
    desc: 'DigiOne AI Pvt. Ltd.',
    value: 'Bangalore, Karnataka, India',
    href: null,
    color: 'from-[#E83A2E] to-orange-400',
  },
];

export default function ContactPage() {
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
        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/8 shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-[12px] font-semibold text-gray-500 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E]" />
            We&apos;re here to help
          </div>
          <h1 className="text-[48px] sm:text-[60px] font-black tracking-[-0.04em] leading-[1.04] text-gray-900 mb-5">
            Contact{' '}
            <span style={{
              backgroundImage: 'linear-gradient(135deg, #E83A2E 0%, #ff7040 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent', color: 'transparent',
            }}>
              us
            </span>
          </h1>
          <p className="text-[17px] text-gray-500 font-medium leading-relaxed max-w-lg mx-auto">
            Have a question or need help? We&apos;re a real team that actually responds.
          </p>
        </div>
      </section>

      {/* Cards */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {CHANNELS.map(({ icon: Icon, title, desc, value, href, color }) => (
            <div key={title} className="group p-6 rounded-2xl border border-black/[0.07] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-300">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
              <p className="text-[13px] text-gray-500 mb-3 leading-relaxed">{desc}</p>
              {href ? (
                <a href={href} className="text-[14px] font-bold text-[#E83A2E] hover:underline">
                  {value}
                </a>
              ) : (
                <p className="text-[14px] font-bold text-gray-800">{value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Contact form */}
        <div className="mt-12 p-8 sm:p-10 rounded-3xl border border-black/[0.07] bg-[#fafafa]">
          <h2 className="text-[24px] font-black tracking-[-0.025em] text-gray-900 mb-2">Send us a message</h2>
          <p className="text-[14px] text-gray-500 mb-7">We&apos;ll get back to you within 12 hours.</p>
          <form className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12.5px] font-semibold text-gray-600 mb-1.5">Name</label>
                <input type="text" placeholder="Rahul Sharma" className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/20 focus:border-[#E83A2E] transition-all" />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-gray-600 mb-1.5">Email</label>
                <input type="email" placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/20 focus:border-[#E83A2E] transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-gray-600 mb-1.5">Subject</label>
              <input type="text" placeholder="How can we help?" className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/20 focus:border-[#E83A2E] transition-all" />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-gray-600 mb-1.5">Message</label>
              <textarea rows={4} placeholder="Tell us what's on your mind..." className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/20 focus:border-[#E83A2E] transition-all resize-none" />
            </div>
            <button type="submit" className="px-7 py-3 bg-[#E83A2E] text-white font-bold text-[14px] rounded-xl hover:bg-[#cc2e23] transition-all shadow-[0_4px_14px_-2px_rgba(232,58,46,0.35)] hover:-translate-y-px active:translate-y-0">
              Send message →
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
