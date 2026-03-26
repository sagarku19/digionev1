"use client";

import { motion } from 'framer-motion';
import { LayoutTemplate, Wallet, FileCheck2, Presentation, BarChart3, Fingerprint } from 'lucide-react';

const features = [
  {
    icon: <LayoutTemplate className="w-5 h-5" />,
    title: "Visual Storefront Builder",
    desc: "Drag-and-drop 18 distinct block types to build your store — no code needed, live preview as you design.",
  },
  {
    icon: <Wallet className="w-5 h-5" />,
    title: "Instant UPI Payouts",
    desc: "Funds land in your UPI or bank account within T+1 days via Cashfree. Indian-first, always.",
  },
  {
    icon: <FileCheck2 className="w-5 h-5" />,
    title: "GST Compliance & Invoicing",
    desc: "Auto-generated GST invoices on every sale. Compliant, downloadable, and ready for your CA.",
  },
  {
    icon: <Presentation className="w-5 h-5" />,
    title: "Course & Curriculum Hub",
    desc: "Upload video lessons, drip content, and lock files behind payment. Full DRM support.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Integrated Marketing Tools",
    desc: "A/B tests, coupons, affiliate programs, and lead capture — all built in, no plugins.",
  },
  {
    icon: <Fingerprint className="w-5 h-5" />,
    title: "Tamper-proof Ledger",
    desc: "Every transaction is SHA-256 locked. Dispute-proof records for every sale you make.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand)] mb-3">Features</p>
          <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] mb-5 tracking-tight font-display">
            Everything you need to sell.
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Indian creators are duct-taping 5 tools together. We centralize everything into one platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-7 rounded-2xl border border-gray-200 bg-[#f7f7f8] hover:bg-white hover:shadow-lg hover:shadow-black/[0.04] hover:border-gray-300 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-[var(--text-primary)] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                {feat.icon}
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{feat.title}</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed text-sm">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
