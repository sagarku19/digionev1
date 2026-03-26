"use client";

import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Palette, FileSpreadsheet, Camera, Handshake } from 'lucide-react';

const types = [
  { title: "Courses", icon: GraduationCap, desc: "Drip video lessons securely" },
  { title: "Ebooks", icon: BookOpen, desc: "PDFs with buyer watermarks" },
  { title: "Design Assets", icon: Palette, desc: "Figma, Sketch & UI kits" },
  { title: "Templates", icon: FileSpreadsheet, desc: "Notion, Excel & Slides" },
  { title: "Photography", icon: Camera, desc: "High-res presets & packs" },
  { title: "Services", icon: Handshake, desc: "1-on-1 calls & consulting" },
];

export default function ProductTypes() {
  return (
    <section className="py-28 bg-[#f7f7f8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand)] mb-3">What you can sell</p>
          <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight font-display">
            Sell anything digital.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {types.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-7 rounded-2xl bg-white border border-gray-200 text-center hover:shadow-lg hover:shadow-black/[0.04] hover:border-gray-300 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#f7f7f8] border border-gray-200 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 text-[var(--text-primary)]" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">{t.title}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{t.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
