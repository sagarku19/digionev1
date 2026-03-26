"use client";

import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="relative pt-36 pb-28 overflow-hidden bg-[#f7f7f8]">

      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      {/* Fade grid to bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f7f7f8]/60 to-[#f7f7f8] pointer-events-none" />

      <div className="relative container-dg text-center">

        {/* Trust badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] bg-white/80 backdrop-blur-sm text-sm text-[var(--text-secondary)] mb-8 font-medium shadow-sm">
          Trusted by 10,000+ Indian creators
        </div>

        {/* Headline */}
        <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.08] max-w-4xl mx-auto text-[var(--text-primary)]">
          Your entire creator business.
          <br />
          <span className="bg-gradient-to-r from-[var(--brand)] to-violet-500 bg-clip-text text-transparent">
            One platform.
          </span>
        </h1>

        {/* Subtext */}
        <p className="mt-6 text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          Store, blog, payment links, visual builder, UPI payouts & GST invoicing — everything in one place.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/signup"
            className="px-7 py-3 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] font-semibold transition-all text-sm shadow-sm"
          >
            Start for free
          </Link>
          <button className="px-7 py-3 rounded-full border border-[var(--border)] bg-white hover:bg-gray-50 text-[var(--text-primary)] font-medium transition text-sm shadow-sm">
            Watch demo
          </button>
        </div>

        {/* Trust line */}
        <p className="mt-5 text-sm text-[var(--text-secondary)]">
          No credit card required &middot; Instant setup &middot; INR pricing
        </p>

        {/* Dashboard preview card */}
        <div className="mt-16 relative">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-3 shadow-2xl shadow-black/[0.08]">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-2 mb-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 bg-[#ff5f57] rounded-full" />
                <div className="w-3 h-3 bg-[#febc2e] rounded-full" />
                <div className="w-3 h-3 bg-[#28c840] rounded-full" />
              </div>
              <div className="flex-1 mx-2 h-7 bg-gray-100 rounded-lg border border-gray-200/60 flex items-center px-3">
                <span className="text-xs text-gray-400">digione.ai/dashboard</span>
              </div>
            </div>
            {/* Preview area */}
            <div className="rounded-xl overflow-hidden">
              <Image
                src="/image.png"
                // src="/Dashbaord-preview.webp"
                alt="DigiOne Dashboard Preview"
                width={1200}
                height={440}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-b from-transparent via-transparent to-white/80 pointer-events-none rounded-3xl" />
        </div>

      </div>
    </section>
  );
}
