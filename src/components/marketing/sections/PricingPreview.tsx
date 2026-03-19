"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check } from 'lucide-react';

export default function PricingPreview() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "Free",
      monthly: 0,
      yearly: 0,
      fee: "10%",
      desc: "For new creators starting out",
      features: ["10 products", "Standard template", "UPI Payouts", "Basic analytics"],
      cta: "Get started",
      link: "/signup",
      popular: false
    },
    {
      name: "Plus",
      monthly: 500,
      yearly: 5500,
      fee: "7%",
      desc: "For growing creator businesses",
      features: ["100 products", "Custom domain", "Remove watermark", "Advanced analytics", "Priority support"],
      cta: "Start Plus &rarr;",
      link: "/signup?plan=plus",
      popular: true
    },
    {
      name: "Pro",
      monthly: 1000,
      yearly: 10000,
      fee: "5%",
      desc: "For established digital brands",
      features: ["Unlimited products", "Multiple domains", "API Access", "White-label store", "Custom integrations"],
      cta: "Go Pro &rarr;",
      link: "/signup?plan=pro",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-[#0D0F1A] border-y border-white/5 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Fair pricing, built to scale</h2>
          
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={`text-sm ${!isYearly ? 'text-white font-medium' : 'text-slate-400'}`}>Monthly</span>
            <button 
              onClick={() => setIsYearly(!isYearly)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-700 transition-colors focus:outline-none"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isYearly ? 'translate-x-6 bg-indigo-500' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm flex items-center gap-2 ${isYearly ? 'text-white font-medium' : 'text-slate-400'}`}>
              Yearly
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">Save ~17%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl p-8 bg-[#03040A] flex flex-col relative ${p.popular ? 'border-2 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.15)] scale-105 z-10' : 'border border-white/10'}`}
            >
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                  ★ Popular
                </div>
              )}
              <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
              <p className="text-sm text-slate-400 mb-6 pb-6 border-b border-white/10">{p.desc}</p>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-1 text-white">
                  <span className="text-4xl font-bold">₹{isYearly ? p.yearly.toLocaleString('en-IN') : p.monthly.toLocaleString('en-IN')}</span>
                  <span className="text-sm text-slate-400">/{isYearly ? 'yr' : 'mo'}</span>
                </div>
              </div>

              <div className="mb-8 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <div className="text-indigo-300 font-bold text-xl mb-1">{p.fee}</div>
                <div className="text-xs text-indigo-200">Platform fee per transaction</div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {p.features.map((feat, j) => (
                  <li key={j} className="flex gap-3 text-sm text-slate-300">
                    <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Link 
                href={p.link}
                className={`w-full py-3 rounded-lg text-center font-bold transition-all ${p.popular ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}
                dangerouslySetInnerHTML={{ __html: p.cta }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
