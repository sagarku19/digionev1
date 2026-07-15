import { Mail, MapPin, MessageCircle, Clock } from 'lucide-react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';

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
  },
  {
    icon: MessageCircle,
    title: 'Community helpdesk',
    desc: 'Ask the community or our team in real time.',
    value: 'Join DigiOne Community',
    href: '/community',
  },
  {
    icon: Clock,
    title: 'Support hours',
    desc: 'Monday – Saturday, 10 AM – 7 PM IST.',
    value: '10:00 AM – 7:00 PM',
    href: null,
  },
  {
    icon: MapPin,
    title: 'Registered office',
    desc: 'DigiOne AI Tech Pvt. Ltd.',
    value: 'Bangalore, Karnataka, India',
    href: null,
  },
];

const INPUT =
  'w-full px-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all';
const LABEL = 'block text-[12.5px] font-semibold text-[#16130F] mb-1.5';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
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
          <div className="px-5 sm:px-10 lg:px-14 pb-12 sm:pb-16">
            <Kicker index="00" route="/contact" />
            <h1 className="mt-7 sm:mt-9 text-[36px] sm:text-[48px] lg:text-[56px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F] max-w-2xl">
              Contact <span className="text-[#E83A2E]">us.</span>
            </h1>
            <p className="mt-5 text-[15px] sm:text-[17px] font-medium text-black/50 max-w-xl leading-relaxed">
              Have a question or need help? We&apos;re a real team that actually responds.
            </p>
          </div>
        </Rails>
      </section>

      {/* Channels ledger grid */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {CHANNELS.map(({ icon: Icon, title, desc, value, href }, i) => (
              <div
                key={title}
                className={`px-5 sm:px-8 py-8 border-black/[0.07] hover:bg-[#FAF8F6] transition-colors duration-200 ${
                  i % 2 !== 0 ? 'sm:border-l' : ''
                } ${i % 4 !== 0 ? 'lg:border-l' : 'lg:border-l-0'} ${
                  i >= 1 ? 'border-t sm:border-t-0' : ''
                } ${i >= 2 ? 'sm:border-t lg:border-t-0' : ''}`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-9 h-9 rounded-lg bg-[#16130F] flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-white" strokeWidth={1.8} />
                  </div>
                  <span className="font-ledger text-[11px] font-semibold text-[#E83A2E]">
                    {'>>'}
                  </span>
                </div>
                <p className="font-ledger text-[9px] font-medium text-black/35 uppercase tracking-[0.18em] mb-2">
                  {title}
                </p>
                <p className="text-[13px] font-medium text-black/50 mb-3 leading-relaxed">{desc}</p>
                {href ? (
                  <a href={href} className="text-[13.5px] font-semibold text-[#E83A2E] hover:underline">
                    {value}
                  </a>
                ) : (
                  <p className="text-[13.5px] font-semibold text-[#16130F]">{value}</p>
                )}
              </div>
            ))}
          </div>
        </Rails>
      </section>

      {/* Grievance redressal */}
      <section id="grievance" className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <div className="px-5 sm:px-10 lg:px-14 py-12 sm:py-16">
            <Kicker index="01" route="/contact#grievance" />
            <div className="mt-7 max-w-2xl">
              <h2 className="text-[24px] sm:text-[30px] font-bold tracking-[-0.03em] text-[#16130F] mb-2">
                Grievance redressal
              </h2>
              <p className="text-[14px] font-medium text-black/50 leading-relaxed mb-8">
                In accordance with the Information Technology Rules, 2021 and the Digital Personal
                Data Protection Act, 2023, DigiOne has a designated Grievance Officer for complaints
                about the platform, its content, or your personal data.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 p-6 rounded-xl bg-[#FAF8F6] border border-black/[0.07]">
                <div>
                  <p className="font-ledger text-[9px] font-medium text-black/35 uppercase tracking-[0.18em] mb-1.5">
                    Grievance Officer
                  </p>
                  <p className="text-[13.5px] font-semibold text-[#16130F]">[Grievance Officer Name]</p>
                </div>
                <div>
                  <p className="font-ledger text-[9px] font-medium text-black/35 uppercase tracking-[0.18em] mb-1.5">
                    Email
                  </p>
                  <a
                    href="mailto:grievance@digione.ai"
                    className="text-[13.5px] font-semibold text-[#E83A2E] hover:underline"
                  >
                    grievance@digione.ai
                  </a>
                </div>
                <div>
                  <p className="font-ledger text-[9px] font-medium text-black/35 uppercase tracking-[0.18em] mb-1.5">
                    Response time
                  </p>
                  <p className="text-[13.5px] font-semibold text-[#16130F]">
                    Acknowledged in 48 hours · resolved in 15 days
                  </p>
                </div>
                <div>
                  <p className="font-ledger text-[9px] font-medium text-black/35 uppercase tracking-[0.18em] mb-1.5">
                    Entity
                  </p>
                  <p className="text-[13.5px] font-semibold text-[#16130F]">
                    DigiOne AI Tech Pvt. Ltd., Bangalore, Karnataka, India
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Rails>
      </section>

      {/* Contact form */}
      <section className="relative bg-[#FAF8F6]">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <Cross className="-bottom-[5px] -left-[5px]" />
          <Cross className="-bottom-[5px] -right-[5px]" />
          <div className="px-5 sm:px-10 lg:px-14 py-12 sm:py-16">
            <Kicker index="02" route="/contact#message" />
            <div className="mt-7 max-w-2xl">
              <h2 className="text-[24px] sm:text-[30px] font-bold tracking-[-0.03em] text-[#16130F] mb-2">
                Send us a message
              </h2>
              <p className="text-[14px] font-medium text-black/50 mb-8">
                We&apos;ll get back to you within 12 hours.
              </p>
              <form className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Name</label>
                    <input type="text" placeholder="Rahul Sharma" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Email</label>
                    <input type="email" placeholder="you@example.com" className={INPUT} />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Subject</label>
                  <input type="text" placeholder="How can we help?" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Message</label>
                  <textarea rows={4} placeholder="Tell us what's on your mind..." className={`${INPUT} resize-none`} />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] rounded-lg transition-colors duration-200"
                >
                  Send message →
                </button>
              </form>
            </div>
          </div>
        </Rails>
      </section>
    </div>
  );
}
