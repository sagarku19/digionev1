'use client';

// Post-purchase access CTA — replaces the old "creator will share access via
// email" copy. Logged-in buyers go straight to the library; guests are nudged
// to create a free account (email prefilled via the remembered-buyer-email key,
// which the globally-mounted BuyerAuthModal reads).

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
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-indigo-500/20"
      >
        <BookOpen className="w-3.5 h-3.5" />
        Go to my library
        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
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
      className="w-full text-left flex items-start gap-2.5 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl px-3 py-2.5 hover:bg-indigo-100/70 dark:hover:bg-indigo-500/15 transition"
    >
      <UserPlus className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>
        <span className="font-semibold">Create a free account{email ? ` with ${email}` : ''}</span>{' '}
        to keep lifetime access to your purchases.
      </span>
    </button>
  );
}
