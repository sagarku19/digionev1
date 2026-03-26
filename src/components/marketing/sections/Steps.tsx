"use client";

import { motion } from 'framer-motion';
import { UserPlus, Upload, IndianRupee } from 'lucide-react';

const steps = [
  { num: "01", title: "Sign up in 30s", desc: "Create your free account. No credit card, no commitment.", icon: UserPlus },
  { num: "02", title: "Upload & Style", desc: "Add your products and design your store with our visual builder.", icon: Upload },
  { num: "03", title: "Get Paid", desc: "Share your link and receive UPI payouts directly to your account.", icon: IndianRupee },
];

export default function Steps() {
  return (
    <section className="py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand)] mb-3">How it works</p>
          <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight font-display">
            Up and running in minutes.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative max-w-5xl mx-auto">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gray-200" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center z-10"
              >
                <div className="w-20 h-20 rounded-2xl bg-[#f7f7f8] border border-gray-200 flex items-center justify-center mb-6 shadow-sm">
                  <Icon className="w-7 h-7 text-[var(--text-primary)]" />
                </div>
                <span className="text-xs font-bold text-[var(--brand)] uppercase tracking-widest mb-2">Step {step.num}</span>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{step.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-[240px]">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
