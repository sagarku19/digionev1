"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  { q: "Do I need a GST number to sell on DigiOne?", a: "No. You don't need a GST number to start selling digital products below the ₹20L threshold. We auto-generate compliant invoices on every sale. Registering for GST brings additional benefits once you scale." },
  { q: "How fast are payouts processed?", a: "We process payouts within T+1 days via Cashfree. Funds land directly into your UPI ID or bank account instantly after settlement." },
  { q: "Can I use my own domain name?", a: "Yes. Plus and Pro creators can connect a custom root domain with auto-generated SSL — no developer required." },
  { q: "What payment methods do buyers have?", a: "Google Pay, PhonePe, Paytm, Credit/Debit Cards, and NetBanking — all through Cashfree for best Indian conversion rates." },
  { q: "Is there really a free plan?", a: "Yes. Start completely free. We charge a 10% platform fee per transaction instead of a subscription." },
  { q: "Do you support international buyers?", a: "Yes. Our gateway handles global card settlements and INR conversion transparently." },
  { q: "What happens if a buyer requests a refund?", a: "Refunds are processed through the dashboard. Gateway processing charges are excluded per Cashfree's dispute policy." },
  { q: "Can I migrate from Gumroad or Instamojo?", a: "Absolutely. Use our bulk CSV importer to move your product listings in minutes with zero downtime." },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-28 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand)] mb-3">FAQ</p>
          <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight font-display">
            Frequently asked questions.
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className={`rounded-2xl transition-all duration-300 ${isOpen ? 'bg-[#f7f7f8] shadow-sm' : 'bg-[#f7f7f8]/60 hover:bg-[#f7f7f8]'}`}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none"
                >
                  <span className="text-[15px] font-semibold text-[var(--text-primary)] pr-4 leading-relaxed">{faq.q}</span>
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'bg-gray-200 text-gray-500'}`}>
                    {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </span>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 text-sm text-[var(--text-secondary)] leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
