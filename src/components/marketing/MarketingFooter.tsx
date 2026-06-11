import Link from 'next/link';
import { DigiOneLogoDark } from '@/src/components/assets/DigiOneLogo';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';

const COLUMNS = [
  {
    label: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/discover', label: 'Discover' },
      { href: '/signup', label: 'Start free' },
    ],
  },
  {
    label: 'Company',
    links: [
      { href: '/community', label: 'Community' },
      { href: '/blog', label: 'Blog' },
      { href: '/contact', label: 'Contact' },
      { href: '/invite', label: 'Request invite' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { href: '/refunds', label: 'Refund policy' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/security', label: 'Security' },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="relative bg-[#16130F] overflow-hidden">
      <div aria-hidden="true" className="h-px w-full bg-white/[0.09]" />

      {/* Vermilion atmosphere — top right */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(ellipse 50% 60% at 85% 0%, rgba(232,58,46,0.14) 0%, transparent 60%)' }}
      />

      <Rails tone="ink" className="pb-8">
        <Cross dark className="-bottom-[5px] -left-[5px]" />
        <Cross dark className="-bottom-[5px] -right-[5px]" />

        <div className="px-5 sm:px-10 lg:px-14 pt-12 sm:pt-16">
          <Kicker index="07" route="/index" dark />

          {/* Brand + link columns */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-x-6 gap-y-10">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2 group">
                <DigiOneLogoDark width={22} height={22} className="group-hover:scale-105 transition-transform duration-300" />
                <span className="text-[16px] font-bold tracking-tight text-white">
                  DigiOne<span className="font-ledger text-[9px] text-[#FF6B5C] font-semibold ml-0.5 align-super">.ai</span>
                </span>
              </Link>
              <p className="mt-4 text-[13.5px] font-medium text-white/45 leading-relaxed max-w-[240px]">
                The storefront, checkout, and automation stack for Indian creators.
              </p>
              <p className="font-ledger mt-5 text-[10px] tracking-[0.18em] text-white/30 uppercase">
                Made in India · UPI-native
              </p>
            </div>

            {COLUMNS.map((col) => (
              <div key={col.label}>
                <p className="font-ledger text-[9px] font-medium text-white/35 uppercase tracking-[0.18em] mb-4">
                  {col.label}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[13.5px] font-medium text-white/55 hover:text-white transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Hairline + meta row */}
          <div className="mt-12 pt-6 border-t border-white/[0.09] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="font-ledger text-[11px] text-white/35">
              © {new Date().getFullYear()} DigiOne AI Tech Pvt. Ltd.
            </p>
            <p className="font-ledger text-[11px] text-white/35 inline-flex items-center gap-2">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              digione.ai · All systems operational
            </p>
          </div>
        </div>

        {/* Giant wordmark — ledger watermark */}
        <div aria-hidden="true" className="relative mt-10 select-none pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 z-10"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 100%)',
              maskImage: 'linear-gradient(to bottom, transparent 0%, #000 100%)',
            }}
          />
          <div className="flex items-baseline justify-center leading-none px-5">
            <span
              className="font-display text-[15vw] md:text-[13vw] font-extrabold tracking-[-0.03em]"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.1,
                paddingBottom: '0.05em',
                paddingRight: '0.06em',
              }}
            >
              DigiOne
            </span>
            <span className="font-ledger text-[3.5vw] md:text-[3vw] font-medium ml-2 self-start mt-[2vw] text-[#E83A2E]/60">
              .ai
            </span>
          </div>
        </div>
      </Rails>
    </footer>
  );
}
