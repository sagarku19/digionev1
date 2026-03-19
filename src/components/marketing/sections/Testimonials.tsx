"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function Testimonials() {
  const testimonials = [
    {
      quote: "Made ₹1.2L in the first month. The UPI payout hit my account the same day. Nothing else works this smoothly for Indian creators.",
      name: "Arjun Sharma",
      title: "UI/UX Educator · 50K+ students",
      link: "digione.in/arjun"
    },
    {
      quote: "I moved from Gumroad. Saving 5% on every transaction matters when your volume grows. The checkout conversion is genuinely 2x better.",
      name: "Priya Mehta",
      title: "Design Systems Architect",
      link: "digione.in/priya"
    },
    {
      quote: "The visual builder is incredible. I didn't need to hire a developer to build my photography preset store. Literally done in an hour.",
      name: "Rahul Verma",
      title: "Automotive Photographer",
      link: "digione.in/rahul"
    }
  ];

  return (
    <section className="py-32 bg-[#0D0F1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-5xl font-bold text-white text-center mb-16 tracking-tight">Creators earning with DigiOne</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl border-t-2 border-t-indigo-500 border-x border-b border-x-white/5 border-b-white/5 bg-[#0D0F1A] flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex gap-1 text-amber-500 mb-6 text-xl">
                  ★★★★★
                </div>
                <p className="text-lg text-slate-300 leading-relaxed mb-8">
                  "{t.quote}"
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0"></div>
                <div>
                  <h4 className="text-white font-bold">{t.name}</h4>
                  <p className="text-sm text-slate-500 mb-1">{t.title}</p>
                  <span className="text-xs text-indigo-400">{t.link} ↗</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
