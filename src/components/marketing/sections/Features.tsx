"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { LayoutTemplate, Wallet, FileCheck2, Presentation, BarChart3, Fingerprint } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: <LayoutTemplate className="w-6 h-6" />,
      title: "Visual Storefront Builder",
      desc: "Drag and drop 18 distinct block components referencing the `site_sections_config` schema directly in browser.",
    },
    {
      icon: <Wallet className="w-6 h-6" />,
      title: "Instant UPI Payouts",
      desc: "Process `creator_payout_requests` instantly directly to UPI IDs over the Cashfree gateway transparently.",
    },
    {
      icon: <FileCheck2 className="w-6 h-6" />,
      title: "GST Compliance & Invoicing",
      desc: "Auto-generates verified PDFs mapped against `transaction_ledger` constraints implicitly.",
    },
    {
      icon: <Presentation className="w-6 h-6" />,
      title: "Course & Curriculum Hub",
      desc: "Native `products` definitions binding video files, lessons, and DRM structures globally.",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Integrated Marketing Tools",
      desc: "A/B tests, coupon distributions via `coupons` table bounding limit capacities precisely.",
    },
    {
      icon: <Fingerprint className="w-6 h-6" />,
      title: "Audited Ledger Chains",
      desc: "SHA-256 constraints locking `transaction_ledger` entries permanently ensuring accuracy.",
    }
  ];

  return (
    <section id="features" className="py-24 bg-[#03040A] border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Everything you need.</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">Indian creators are duct-taping 5 tools together. We centralize it into one un-breakable architecture.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl border border-white/5 bg-[#0D0F1A] hover:bg-[#141628] hover:border-indigo-500/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-snug">{feat.title}</h3>
              <p className="text-slate-400 leading-relaxed text-sm">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
