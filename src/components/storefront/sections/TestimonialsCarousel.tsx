import React from 'react';

export default function TestimonialsCarousel({ settings }: { settings: any }) {
  const title = settings?.title || 'What People Say';
  const testimonials = settings?.testimonials || [
    { id: 1, name: 'Alex Johnson', role: 'Freelancer', text: 'This changed the way I work. Absolutely incredible value and easy to understand.' },
    { id: 2, name: 'Sarah Miller', role: 'Designer', text: 'The attention to detail here is unmatched. I recommend this to everyone in my network.' },
    { id: 3, name: 'David Lee', role: 'Entrepreneur', text: 'Best investment I have made this year. High quality and super practical.' },
  ];

  return (
    <section className="w-full py-20 bg-[--creator-surface] border-t border-b border-[--creator-border]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-[--creator-text] mb-12">{title}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t: any) => (
            <div key={t.id} className="bg-[--creator-bg] p-8 rounded-2xl shadow-sm border border-[--creator-border] flex flex-col items-center">
              {/* Stars */}
              <div className="flex gap-1 mb-6 text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                ))}
              </div>
              <p className="text-[--creator-text] italic mb-8 relative leading-relaxed">
                "{t.text}"
              </p>
              <div className="mt-auto flex flex-col text-center">
                <span className="font-bold text-[--creator-text]">{t.name}</span>
                <span className="text-sm text-[--creator-text-muted]">{t.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
