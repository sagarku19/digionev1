"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check } from 'lucide-react';

const plans = [
  {
    name: "Free",
    monthly: 0,
    yearly: 0,
    fee: "10%",
    desc: "For new creators starting out",
    features: ["10 products", "Standard template", "UPI Payouts", "Basic analytics"],
    cta: "Get started",
    link: "/signup",
    popular: false,
  },
  {
    name: "Plus",
    monthly: 500,
    yearly: 5500,
    fee: "7%",
    desc: "For growing creator businesses",
    features: ["100 products", "Custom domain", "Remove watermark", "Advanced analytics", "Priority support"],
    cta: "Start Plus",
    link: "/signup?plan=plus",
    popular: true,
  },
  {
    name: "Pro",
    monthly: 1000,
    yearly: 10000,
    fee: "5%",
    desc: "For established digital brands",
    features: ["Unlimited products", "Multiple domains", "API Access", "White-label store", "Custom integrations"],
    cta: "Go Pro",
    link: "/signup?plan=pro",
    popular: false,
  },
];

export default function PricingPreview() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-28 bg-[#f7f7f8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand)] mb-3">Pricing</p>
          <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] mb-4 tracking-tight font-display">
            Fair pricing, built to scale.
          </h2>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-[var(--text-primary)]' : 'text-gray-400'}`}>Monthly</span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isYearly ? 'bg-[var(--accent)]' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${isYearly ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm flex items-center gap-2 font-medium transition-colors ${isYearly ? 'text-[var(--text-primary)]' : 'text-gray-400'}`}>
              Yearly
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                Save ~17%
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl p-8 flex flex-col relative transition-all duration-300 ${
                p.popular
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-2xl shadow-black/[0.12] scale-[1.03] z-10'
                  : 'bg-white border border-gray-200 hover:shadow-lg hover:shadow-black/[0.04]'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white text-[var(--text-primary)] text-xs font-bold px-4 py-1 rounded-full shadow-sm">
                  Most Popular
                </div>
              )}

              <h3 className={`text-lg font-bold mb-1 ${p.popular ? '' : 'text-[var(--text-primary)]'}`}>{p.name}</h3>
              <p className={`text-sm mb-6 pb-6 border-b ${p.popular ? 'opacity-70 border-white/20' : 'text-[var(--text-secondary)] border-gray-200'}`}>{p.desc}</p>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold font-display ${p.popular ? '' : 'text-[var(--text-primary)]'}`}>
                    ₹{isYearly ? p.yearly.toLocaleString('en-IN') : p.monthly.toLocaleString('en-IN')}
                  </span>
                  <span className={`text-sm ${p.popular ? 'opacity-60' : 'text-[var(--text-secondary)]'}`}>/{isYearly ? 'yr' : 'mo'}</span>
                </div>
              </div>

              {/* Platform fee */}
              <div className={`mb-6 p-4 rounded-xl ${p.popular ? 'bg-white/10' : 'bg-[#f7f7f8] border border-gray-200'}`}>
                <div className={`font-bold text-lg mb-0.5 ${p.popular ? '' : 'text-[var(--text-primary)]'}`}>{p.fee}</div>
                <div className={`text-xs ${p.popular ? 'opacity-60' : 'text-[var(--text-secondary)]'}`}>Platform fee per transaction</div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {p.features.map((feat, j) => (
                  <li key={j} className={`flex gap-2.5 text-sm ${p.popular ? '' : 'text-[var(--text-primary)]'}`}>
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${p.popular ? 'text-white' : 'text-emerald-500'}`} />
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                href={p.link}
                className={`w-full py-3 rounded-xl text-center font-semibold text-sm transition-all ${
                  p.popular
                    ? 'bg-white text-[var(--text-primary)] hover:bg-gray-100 shadow-sm'
                    : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)]'
                }`}
              >
                {p.cta} →
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
