"use client";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-24 overflow-hidden">

      {/* 🔥 BACKGROUND EFFECT */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient glow */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-indigo-600/30 blur-[160px] rounded-full" />

        {/* Radial fade */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_60%)]" />

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="container-dg text-center">

        {/* TRUST BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-gray-300 mb-6">
          🇮🇳 Trusted by 10,000+ Indian creators
        </div>

        {/* HEADLINE */}
        <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Your entire creator business.
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            One platform.
          </span>
        </h1>

        {/* SUBTEXT */}
        <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
          Store · Blog · Payment links · Visual builder · UPI payouts · GST invoicing — all in one place.
        </p>

        {/* CTA */}
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <button className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition font-medium shadow-lg shadow-indigo-500/20">
            Start for free →
          </button>

          <button className="px-6 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition">
            ▶ Watch demo
          </button>
        </div>

        {/* TRUST LINE */}
        <div className="mt-4 text-sm text-gray-500">
          ✓ No credit card · ✓ Instant setup · ✓ INR pricing
        </div>

        {/* PREVIEW CARD */}
        <div className="mt-16 relative">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-2xl shadow-indigo-900/20">

            {/* Fake browser bar */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-400 rounded-full" />
              <div className="w-3 h-3 bg-yellow-400 rounded-full" />
              <div className="w-3 h-3 bg-green-400 rounded-full" />
            </div>

            {/* Preview area */}
            <div className="h-[400px] rounded-xl border border-dashed border-white/10 flex items-center justify-center text-gray-500">
              Dashboard Preview
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}