"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FaqAccordion() {
  const faqs = [
    { q: "Do I need a GST number to sell on DigiOne?", a: "No, you don't strictly need a GST to start selling digital products below the ₹20L threshold. We issue invoices explicitly bounding under typical exemptions, though registering brings additional compliance benefits." },
    { q: "How fast are payouts processed?", a: "We process completely within T+1 days via secure Cashfree nodal accounts. Funds land natively into your UPI ID or Bank Account instantly." },
    { q: "Can I use my own domain name?", a: "Yes. Plus and Pro tier creators can map custom root domains and secure auto-generated SSL certificates bound to our Next.js edge caching flawlessly." },
    { q: "What payment methods do buyers have?", a: "We natively support Google Pay, PhonePe, Paytm, standard Credit/Debit Cards, and NetBanking through Cashfree, yielding a highly optimized Indian conversion funnel." },
    { q: "Is there really a free plan?", a: "Yes. Our Free tier operates entirely without subscription costs and deducts a 10% platform fee per transaction instead." },
    { q: "Do you support international buyers?", a: "Yes. While our primary infrastructure focuses on optimizing Indian funnels, our gateway cleanly defaults to global card settlements transparently resolving INR conversions." },
    { q: "What happens if a buyer requests a refund?", a: "Refunds are processed automatically via the dashboard minus gateway processing charges under Cashfree dispute resolution policies." },
    { q: "Can I migrate from Gumroad or Instamojo?", a: "Absolutely. Our bulk CSV product importer dynamically remaps explicit listings in minutes preventing downtime." }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-[#03040A]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12 tracking-tight">Frequently asked questions</h2>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-white/10 rounded-xl bg-[#0D0F1A] overflow-hidden transition-all duration-300 hover:border-white/20">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
              >
                <span className="text-lg font-bold text-white pr-4">{faq.q}</span>
                <span className={`text-slate-400 text-2xl transition-transform duration-300 ${openIndex === i ? 'rotate-45 text-white' : ''}`}>
                  +
                </span>
              </button>
              
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="p-6 pt-0 text-slate-400 text-sm leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
