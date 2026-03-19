"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function Showcase() {
  const creators = [
    { name: "Arjun Sharma", niche: "Figma Courses", link: "digione.in/arjun", theme: "bg-slate-900" },
    { name: "Priya Mehta", niche: "Design Assets", link: "digione.in/priya", theme: "bg-zinc-100 text-slate-900" },
    { name: "Rahul Verma", niche: "Photography", link: "digione.in/rahul", theme: "bg-amber-900" },
    { name: "Neha Kapoor", niche: "Podcast Creator", link: "digione.in/neha", theme: "bg-pink-950" }
  ];

  return (
    <section id="creators" className="py-32 bg-[#03040A] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">See what creators are building</h2>
      </div>

      <div className="flex overflow-x-auto gap-8 px-6 sm:px-8 pb-16 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {creators.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`min-w-[300px] md:min-w-[400px] h-[450px] rounded-2xl flex flex-col border border-white/10 overflow-hidden shrink-0 snap-center hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:border-indigo-500/50 transition-all duration-300 relative group cursor-pointer ${c.theme}`}
          >
            <div className="h-8 border-b border-black/10 bg-black/5 flex items-center px-4 gap-1.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative pointer-events-none">
              <div className="w-24 h-24 rounded-full bg-black/20 mb-6 backdrop-blur-md"></div>
              <h3 className={`text-2xl font-bold mb-2 ${c.theme.includes('text-') ? '' : 'text-white'}`}>{c.name}</h3>
              <p className={`text-sm font-medium ${c.theme.includes('text-') ? 'opacity-60' : 'text-white/60'}`}>{c.niche}</p>
            </div>
            
            <div className="absolute bottom-6 left-6 right-6">
              <div className="bg-[#03040A] border border-white/10 rounded-xl p-4 flex items-center justify-between text-white backdrop-blur-xl group-hover:bg-[#0D0F1A] transition-colors">
                <span className="text-sm font-medium">{c.link}</span>
                <span className="text-indigo-400 text-sm font-bold">Visit &rarr;</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
