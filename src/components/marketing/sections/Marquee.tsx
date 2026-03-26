"use client";

import { motion } from 'framer-motion';

export default function Marquee() {
  const logos = ["YouTube", "Instagram", "Spotify", "Substack", "Teachable", "Notion", "Twitter", "Patreon", "WhatsApp", "Gumroad"];

  const stats = [
    { value: "₹4.2 Cr+", label: "earned by creators" },
    { value: "12,400+", label: "products sold securely" },
    { value: "99.9%", label: "uptime SLA" },
  ];

  return (
    <section className="bg-white overflow-hidden py-20">
      {/* Logo marquee */}
      <div className="max-w-7xl mx-auto px-4 text-center mb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-10">
          Creators from these platforms use DigiOne
        </p>
        <div className="relative flex overflow-x-hidden">
          <motion.div
            className="flex items-center gap-16 whitespace-nowrap min-w-full"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
          >
            {[...logos, ...logos, ...logos].map((logo, i) => (
              <span key={i} className="text-lg font-bold text-gray-300 tracking-wider inline-block uppercase">
                {logo}
              </span>
            ))}
          </motion.div>
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl bg-[#f7f7f8] p-8 text-center"
          >
            <div className="text-3xl font-bold text-[var(--text-primary)] mb-1 font-display">{s.value}</div>
            <div className="text-sm text-[var(--text-secondary)]">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
