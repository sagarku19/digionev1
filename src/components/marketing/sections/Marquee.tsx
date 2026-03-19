"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function Marquee() {
  const logos = ["YouTube", "Instagram", "Spotify", "Substack", "Teachable", "Notion", "Twitter", "Patreon", "WhatsApp", "Gumroad"];

  return (
    <section className="border-y border-white/5 bg-[#0D0F1A] overflow-hidden py-16 relative">
      {/* Logos Marquee */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 relative">
        <p className="text-sm text-slate-500 font-medium mb-8">Trusted by creators on:</p>
        <div className="relative flex overflow-x-hidden">
          <motion.div 
            className="flex items-center gap-16 whitespace-nowrap min-w-full"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
          >
            {[...logos, ...logos, ...logos].map((logo, i) => (
              <span key={i} className="text-2xl font-bold text-white/30 tracking-wider inline-block">
                {logo}
              </span>
            ))}
          </motion.div>
          {/* Gradient Edges */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#03040A] to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#03040A] to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Trust Stats */}
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="border border-white/5 bg-[#0D0F1A] rounded-xl p-6 text-center shadow-lg"
        >
          <div className="text-4xl font-bold text-white mb-2">₹4.2 Cr+</div>
          <div className="text-slate-400 text-sm font-medium">earned by creators</div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="border border-white/5 bg-[#0D0F1A] rounded-xl p-6 text-center shadow-lg"
        >
          <div className="text-4xl font-bold text-white mb-2">12,400+</div>
          <div className="text-slate-400 text-sm font-medium">products sold securely</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="border border-white/5 bg-[#0D0F1A] rounded-xl p-6 text-center shadow-lg"
        >
          <div className="text-4xl font-bold text-white mb-2">99.9%</div>
          <div className="text-slate-400 text-sm font-medium">uptime SLA tracking</div>
        </motion.div>
      </div>
    </section>
  );
}
