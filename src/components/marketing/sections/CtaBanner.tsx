"use client";
import React from 'react';
import Link from 'next/link';

export default function CtaBanner() {
  return (
    <section className="py-32 relative overflow-hidden bg-[#03040A]">
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/30 via-[#03040A] to-violet-900/30 -z-10" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay -z-10 pointer-events-none" />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
          Start selling in 30 minutes.
        </h2>
        <p className="text-xl text-slate-300 mb-10">
          No credit card. No setup fee. Just your products.
        </p>
        
        <Link href="/signup" className="inline-flex h-14 items-center justify-center px-10 rounded-xl bg-white text-black font-bold text-lg hover:bg-slate-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:scale-[1.02] mb-8">
          Create your free store &rarr;
        </Link>
        <p className="text-slate-400 text-sm">
          Already have an account? <Link href="/login" className="text-white font-medium hover:underline">Log in &rarr;</Link>
        </p>
      </div>
    </section>
  );
}
