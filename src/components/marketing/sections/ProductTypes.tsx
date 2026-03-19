"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function ProductTypes() {
  const types = [
    { title: "Course", icon: "🎓", desc: "Drip content securely" },
    { title: "Ebook", icon: "📚", desc: "PDFs with watermarks" },
    { title: "Design Asset", icon: "🎨", desc: "Figma & Sketch files" },
    { title: "Template", icon: "📄", desc: "Notion & Excel trackers" },
    { title: "Photography", icon: "📸", desc: "High-res preset packs" },
    { title: "Services", icon: "🤝", desc: "1:1 Calls & consulting" }
  ];

  return (
    <section className="py-24 bg-[#03040A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Sell anything digital.</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {types.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-[#0D0F1A] border border-white/5 text-center hover:bg-white/5 transition-colors"
            >
              <div className="text-4xl mb-4">{t.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{t.title}</h3>
              <p className="text-sm text-slate-400">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
