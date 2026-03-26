"use client";

import Link from 'next/link';

export default function CtaBanner() {
  return (
    <section className="py-32 bg-[var(--text-primary)] relative overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(99,102,241,0.12),transparent)] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-5">Get started today</p>
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight font-display">
          Start selling in 30 minutes.
        </h2>
        <p className="text-lg text-white/50 mb-10 max-w-xl mx-auto">
          No credit card. No setup fee. Just your products and your audience.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/signup"
            className="inline-flex h-13 items-center justify-center px-10 py-3.5 rounded-full bg-white text-[var(--text-primary)] font-bold text-base hover:bg-gray-100 transition-all shadow-lg shadow-white/10"
          >
            Create your free store →
          </Link>
        </div>

        <p className="mt-8 text-white/30 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-white/60 hover:text-white font-medium transition-colors underline underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}
