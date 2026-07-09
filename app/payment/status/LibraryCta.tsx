'use client';

// Post-purchase access CTA — replaces the old "creator will share access via
// email" copy. Logged-in buyers go straight to the library; guests are nudged
// to create a free account (email prefilled via the remembered-buyer-email key,
// which the globally-mounted BuyerAuthModal reads). Engineered-ledger styling.

import Link from 'next/link';
import { BookOpen, UserPlus, ArrowRight } from 'lucide-react';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import { useBuyerAuth } from '@/stores/buyerAuth';
import { rememberBuyerEmail } from '@/lib/shared/buyer-email';

export function LibraryCta({ email }: { email: string }) {
  const { isLoggedIn, isLoading } = useAuthSession();
  const openBuyerAuth = useBuyerAuth((s) => s.open);

  if (isLoading) return null;

  if (isLoggedIn) {
    return (
      <Link
        href="/account/library"
        className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#E83A2E] py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(232,58,46,0.6)] transition-colors duration-200 hover:bg-[#C92F24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/30"
      >
        <BookOpen className="h-4 w-4" />
        Go to my library
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (email) rememberBuyerEmail(email);
        openBuyerAuth('signup', '/account/library');
      }}
      className="group flex w-full items-center gap-3 rounded-lg border border-[#E83A2E]/20 bg-[#E83A2E]/[0.06] px-4 py-3.5 text-left transition-colors hover:bg-[#E83A2E]/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/20"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E83A2E] text-white">
        <UserPlus className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-[#16130F]">
        <span className="block font-semibold">Create a free account to keep access</span>
        <span className="text-black/55">{email ? `Save your library under ${email}` : 'Save your purchases in one place'}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#E83A2E] transition-transform duration-200 group-hover:translate-x-0.5" />
    </button>
  );
}
