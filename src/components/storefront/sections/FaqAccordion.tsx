'use client';

import React, { useState } from 'react';

export default function FaqAccordion({ settings }: { settings: any }) {
  const title = settings?.title || 'Frequently Asked Questions';
  const faqs = settings?.faqs || [
    { question: 'Do I get lifetime access?', answer: 'Yes! Once purchased, you retain lifetime access to the materials and any future updates.' },
    { question: 'Is there a refund policy?', answer: 'We offer a 14-day money-back guarantee if you are not satisfied with your purchase.' },
    { question: 'Do I need prior experience?', answer: 'Not at all. The content is designed to be accessible for beginners while providing advanced insights for veterans.' },
    { question: 'How is the content delivered?', answer: 'You will receive an email with instant access links, and you can always view your purchases from your library dashboard.' },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full py-20 bg-[--creator-bg]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-[--creator-text] text-center mb-12">{title}</h2>
        
        <div className="space-y-4">
          {faqs.map((faq: any, index: number) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className="bg-[--creator-surface] rounded-xl border border-[--creator-border] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex justify-between items-center p-6 text-left focus:outline-none"
                >
                  <span className="font-bold text-lg text-[--creator-text]">{faq.question}</span>
                  <span className={`text-[--creator-text-muted] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </button>
                
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="p-6 pt-0 text-[--creator-text-muted] leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
