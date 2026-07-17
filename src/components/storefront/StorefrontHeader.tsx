'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBuyerAuth } from '@/stores/buyerAuth';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import { CartButton } from '@/components/store/CartButton';
import { useHydratedCartCount } from '@/hooks/commerce/useCart';

type HeaderNav = {
  header_logo_url?: string | null;
  nav_items?: { label?: string; url?: string }[];
  show_search?: boolean;
  show_cart_icon?: boolean;
};
type HeaderSiteMain = { logo_url?: string | null; title?: string | null };

export default function StorefrontHeader({ navConfig, siteMain }: { navConfig: Record<string, unknown> | null; siteMain: Record<string, unknown> | null }) {
  // reason: nav/site_main rows carry jsonb columns; narrow to the fields used here
  const nav = navConfig as unknown as HeaderNav | null;
  const sm = siteMain as unknown as HeaderSiteMain | null;
  const logoUrl = nav?.header_logo_url || sm?.logo_url;
  const storeName = sm?.title || "Store";
  const navItems = nav?.nav_items || [{ label: "Home", url: "/" }];
  const showSearch = nav?.show_search ?? false;
  const showCart = nav?.show_cart_icon ?? true;

  const router = useRouter();
  const openBuyerAuth = useBuyerAuth((s) => s.open);
  const { isLoggedIn } = useAuthSession();
  const cartCount = useHydratedCartCount();

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
              {navItems.map((item, i) => (
                <Link key={i} href={item.url || '#'} className="text-sm font-medium text-[--creator-text] hover:opacity-70 transition-opacity">
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
              <CartButton
                itemCount={cartCount}
                onClick={() => router.push('/cart')}
                className="text-[--creator-text] hover:bg-[--creator-surface]"
                badgeClassName="bg-[var(--creator-primary,#E83A2E)] text-white"
              />
            )}

            {isLoggedIn ? (
              <Link href="/account/library" className="hidden sm:inline-flex bg-[--creator-primary] hover:opacity-90 transition-opacity text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                My Library
              </Link>
            ) : (
              <button
                onClick={() => openBuyerAuth('login')}
                className="hidden sm:inline-flex bg-[--creator-primary] hover:opacity-90 transition-opacity text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
              >
                Log In
              </button>
            )}
          </div>
          
        </div>
      </div>
    </header>
  );
}
