import React from 'react';

export default function AboutCreator({ settings }: { settings: any }) {
  const name = settings?.name || 'Creator Name';
  const bio = settings?.bio || 'I am a creator passionate about building tools and teaching others how to succeed in the digital economy. With over 5 years of experience, I share my exact strategies here.';
  const avatarUrl = settings?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400';
  const showSocials = settings?.show_socials !== false;

  return (
    <section className="w-full py-24 bg-[--creator-bg]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[--creator-surface] rounded-3xl p-8 md:p-12 border border-[--creator-border] shadow-lg flex flex-col md:flex-row items-center gap-12">
          
          <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 rounded-full overflow-hidden border-4 border-[--creator-bg] shadow-xl">
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          </div>
          
          <div className="flex col text-center md:text-left">
            <h2 className="text-sm font-bold tracking-widest uppercase text-[--creator-primary] mb-2">About The Creator</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[--creator-text] mb-6">{name}</h3>
            <p className="text-lg text-[--creator-text-muted] leading-relaxed mb-8">
              {bio}
            </p>
            
            {showSocials && (
              <div className="flex gap-4 justify-center md:justify-start">
                <button className="w-10 h-10 rounded-full bg-[--creator-bg] border border-[--creator-border] flex items-center justify-center text-[--creator-text] hover:bg-[--creator-primary] hover:text-white transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                </button>
                <button className="w-10 h-10 rounded-full bg-[--creator-bg] border border-[--creator-border] flex items-center justify-center text-[--creator-text] hover:bg-[--creator-primary] hover:text-white transition-colors">
                  <span className="sr-only">Instagram</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </button>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </section>
  );
}
