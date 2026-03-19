import React from 'react';
import Link from 'next/link';

export default function StorefrontFooter({ navConfig, siteMain }: { navConfig: any, siteMain: any }) {
  // Footer is simple and standard utilizing the creator's theme context.
  const storeName = siteMain?.title || "Creator Store";
  const { about_us, terms, privacy, refund } = siteMain?.legal_pages || {};
  const socialLinks = siteMain?.social_links || {};

  return (
    <footer className="w-full bg-[--creator-surface] border-t border-[--creator-border] py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
        
        <div className="flex flex-col items-center md:items-start max-w-sm">
          <span className="font-bold text-xl mb-3 text-[--creator-text]">{storeName}</span>
          <p className="text-sm text-[--creator-text-muted] text-center md:text-left mb-6">
            Everything you need to succeed, direct from the creator.
          </p>
          <div className="flex gap-4">
             {/* Social mockups using CSS custom variables */}
             {socialLinks.instagram && <a href={socialLinks.instagram} className="text-[--creator-text-muted] hover:text-[--creator-text]">Instagram</a>}
             {socialLinks.twitter && <a href={socialLinks.twitter} className="text-[--creator-text-muted] hover:text-[--creator-text]">Twitter</a>}
             {socialLinks.youtube && <a href={socialLinks.youtube} className="text-[--creator-text-muted] hover:text-[--creator-text]">YouTube</a>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
          <div className="flex flex-col gap-3">
            <span className="font-bold text-[--creator-text] uppercase tracking-wider text-xs">Legal</span>
            {about_us && <Link href="/about" className="text-[--creator-text-muted] hover:underline">About Us</Link>}
            {terms && <Link href="/terms" className="text-[--creator-text-muted] hover:underline">Terms of Service</Link>}
            {privacy && <Link href="/privacy" className="text-[--creator-text-muted] hover:underline">Privacy Policy</Link>}
            {refund && <Link href="/refund" className="text-[--creator-text-muted] hover:underline">Refund Policy</Link>}
          </div>

          <div className="flex flex-col gap-3">
            <span className="font-bold text-[--creator-text] uppercase tracking-wider text-xs">Contact</span>
            {siteMain?.contact_email && (
              <a href={`mailto:${siteMain.contact_email}`} className="text-[--creator-text-muted] hover:underline">
                {siteMain.contact_email}
              </a>
            )}
            {siteMain?.contact_mobile && (
              <span className="text-[--creator-text-muted]">{siteMain.contact_mobile}</span>
            )}
          </div>
        </div>

      </div>
      
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-[--creator-border] flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[--creator-text-muted]">
         <span>&copy; {new Date().getFullYear()} {storeName}. All rights reserved.</span>
         <span className="font-medium">Powered by DigiOne ↗</span>
      </div>
    </footer>
  );
}
