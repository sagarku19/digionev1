'use client';

import React from 'react';
import Link from 'next/link';

export default function StorefrontHeader({ navConfig, siteMain }: { navConfig: any, siteMain: any }) {
  const logoUrl = navConfig?.header_logo_url || siteMain?.logo_url;
  const storeName = siteMain?.title || "Store";
  const navItems = navConfig?.nav_items || [{ label: "Home", url: "/" }];
  const showSearch = navConfig?.show_search ?? false;
  const showCart = navConfig?.show_cart_icon ?? true;

  // Render minimal standard storefront header using tailwind utilities
  return (
    <header className="w-full border-b border-[--creator-surface] bg-[--creator-bg] sticky top-0 z-40 transition-shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-8 object-contain" />
              ) : (
                <span className="font-bold text-xl tracking-tight text-[--creator-text]">{storeName}</span>
              )}
            </Link>

            <nav className="hidden md:flex gap-6">
              {navItems.map((item: any, i: number) => (
                <Link key={i} href={item.url} className="text-sm font-medium text-[--creator-text] hover:opacity-70 transition-opacity">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {showSearch && (
              <button className="text-[--creator-text] p-2 rounded-full hover:bg-[--creator-surface] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </button>
            )}
            
            {showCart && (
              <div className="relative">
                <button className="text-[--creator-text] p-2 rounded-full hover:bg-[--creator-surface] transition-colors flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                </button>
              </div>
            )}

            <button className="hidden sm:inline-flex bg-[--creator-primary] hover:opacity-90 transition-opacity text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
              Log In
            </button>
          </div>
          
        </div>
      </div>
    </header>
  );
}
