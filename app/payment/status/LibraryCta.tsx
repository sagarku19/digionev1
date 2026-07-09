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
        className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#E83A2E] py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#C92F24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/30"
      >
        <BookOpen className="h-3.5 w-3.5" />
        Go to my library
        <ArrowRight className="ml-auto h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
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
      className="flex w-full items-start gap-2.5 rounded-lg border border-[#E83A2E]/15 bg-[#E83A2E]/[0.06] px-3.5 py-3 text-left text-[12.5px] font-medium transition-colors hover:bg-[#E83A2E]/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/20"
    >
      <UserPlus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E83A2E]" />
      <span className="leading-relaxed text-[#16130F]">
        <span className="font-semibold">Create a free account{email ? ` with ${email}` : ''}</span>{' '}
        <span className="text-black/55">to keep lifetime access to your purchases.</span>
      </span>
    </button>
  );
}
