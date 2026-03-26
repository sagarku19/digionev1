"use client";

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: "Made ₹1.2L in the first month. The UPI payout hit my account the same day. Nothing else works this smoothly for Indian creators.",
    name: "Arjun Sharma",
    title: "UI/UX Educator · 50K+ students",
  },
  {
    quote: "I moved from Gumroad. Saving 5% on every transaction matters when your volume grows. The checkout conversion is genuinely 2x better.",
    name: "Priya Mehta",
    title: "Design Systems Architect",
  },
  {
    quote: "The visual builder is incredible. I didn't need to hire a developer to build my photography preset store. Literally done in an hour.",
    name: "Rahul Verma",
    title: "Automotive Photographer",
  },
];

export default function Testimonials() {
  return (
    <section className="py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand)] mb-3">Testimonials</p>
          <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight font-display">
            Creators earning with DigiOne.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl border border-gray-200 bg-[#f7f7f8] hover:bg-white hover:shadow-lg hover:shadow-black/[0.04] transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1 text-amber-400 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-[var(--text-primary)] leading-relaxed mb-8 text-[15px]">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand)] to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">{t.name}</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
