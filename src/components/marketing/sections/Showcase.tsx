"use client";

import { motion } from 'framer-motion';

const creators = [
  { name: "Arjun Sharma", niche: "Figma Courses", link: "digione.ai/arjun", color: "from-indigo-500 to-purple-600" },
  { name: "Priya Mehta", niche: "Design Assets", link: "digione.ai/priya", color: "from-pink-500 to-rose-500" },
  { name: "Rahul Verma", niche: "Photography", link: "digione.ai/rahul", color: "from-amber-500 to-orange-500" },
  { name: "Neha Kapoor", niche: "Podcast Creator", link: "digione.ai/neha", color: "from-emerald-500 to-teal-500" },
  { name: "Vikram Joshi", niche: "Notion Templates", link: "digione.ai/vikram", color: "from-sky-500 to-blue-600" },
  { name: "Sneha Iyer", niche: "Illustration Packs", link: "digione.ai/sneha", color: "from-fuchsia-500 to-purple-500" },
  { name: "Karan Singh", niche: "Music Production", link: "digione.ai/karan", color: "from-red-500 to-rose-600" },
  { name: "Ananya Roy", niche: "Fitness Guides", link: "digione.ai/ananya", color: "from-lime-500 to-green-500" },
];

export default function Showcase() {
  return (
    <section id="creators" className="py-28 bg-[#f7f7f8] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 mb-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand)] mb-3">Creator stores</p>
        <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight font-display">
          See what creators are building.
        </h2>
      </div>

      <div className="flex overflow-x-auto gap-6 px-6 sm:px-8 pb-8 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {creators.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="min-w-[280px] md:min-w-[340px] rounded-2xl bg-white border border-gray-200 overflow-hidden shrink-0 snap-center hover:shadow-xl hover:shadow-black/[0.06] transition-all duration-300 group"
          >
            {/* Gradient header */}
            <div className={`h-40 bg-gradient-to-br ${c.color} relative`}>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center">
                <span className="text-xl font-bold text-gray-800">{c.name.charAt(0)}</span>
              </div>
            </div>

            {/* Content */}
            <div className="pt-12 pb-6 px-6 text-center">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{c.name}</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">{c.niche}</p>
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f7f7f8] border border-gray-200 text-xs font-medium text-[var(--text-secondary)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)] group-hover:border-transparent transition-all duration-300">
                {c.link}
                <span className="ml-1">→</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
