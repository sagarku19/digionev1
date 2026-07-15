import type { Metadata } from 'next';
import { ArrowRight, Link2, Zap, BarChart3, ShieldCheck } from 'lucide-react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://digione.ai';
const SHORT_DOMAIN = process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN || 'linkln.me';

export const metadata: Metadata = {
  title: `${SHORT_DOMAIN} — Short links by DigiOne`,
  description: `${SHORT_DOMAIN} is the branded link shortener powered by DigiOne. Create short, trackable links and see every click.`,
  robots: { index: false, follow: true },
};

const FEATURES = [
  { icon: Zap, label: 'Instant redirects' },
  { icon: BarChart3, label: 'Click analytics' },
  { icon: ShieldCheck, label: 'Branded & safe' },
];

export default function LinkHome() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0B0F] text-white flex items-center justify-center px-6 py-16">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(600px 400px at 50% -10%, rgba(232,58,46,0.20), transparent 70%), radial-gradient(500px 400px at 90% 110%, rgba(232,58,46,0.10), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative z-10 w-full max-w-xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white/80 font-mono">
          <Link2 className="h-3.5 w-3.5 text-[#E83A2E]" />
          {SHORT_DOMAIN}
        </span>

        <h1 className="mt-7 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
          Short links,<br className="hidden sm:block" /> <span className="text-[#E83A2E]">done right.</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-white/60 max-w-md mx-auto">
          The branded link shortener powered by <span className="text-white/90 font-medium">DigiOne</span>.
          Create short, memorable links — and see every click.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`${APP_URL}/dashboard/links`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E83A2E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#d0281d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/60"
          >
            Create a short link <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={APP_URL}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            Go to DigiOne
          </a>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {FEATURES.map((f) => (
            <span key={f.label} className="inline-flex items-center gap-2 text-sm text-white/50">
              <f.icon className="h-4 w-4 text-white/40" /> {f.label}
            </span>
          ))}
        </div>

        <p className="mt-14 text-xs text-white/40">
          Powered by{' '}
          <a href={APP_URL} className="text-white/70 underline underline-offset-2 hover:text-white">
            DigiOne
          </a>{' '}
          · {SHORT_DOMAIN}
        </p>
      </div>
    </main>
  );
}
