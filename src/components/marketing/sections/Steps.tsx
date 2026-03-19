"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function Steps() {
  const steps = [
    { num: "01", title: "Sign up in 30s", desc: "Create an account. No credit card needed." },
    { num: "02", title: "Upload & Style", desc: "Drop your files. Pick a gorgeous template." },
    { num: "03", title: "Get Paid", desc: "Share your link and earn directly to UPI." }
  ];

  return (
    <section className="py-32 bg-[#0D0F1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-5xl font-bold text-white text-center mb-16 tracking-tight">How it works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-[2.5rem] left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0" />
          
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative flex flex-col items-center text-center z-10"
            >
              <div className="w-20 h-20 rounded-full bg-[#03040A] border-2 border-indigo-500 flex items-center justify-center text-2xl font-bold text-indigo-400 mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                {step.num}
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-slate-400">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
