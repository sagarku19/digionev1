"use client";

// Shareable buyer-login URL. Does NOT use the (auth) split layout — it opens the
// globally-mounted centered modal over a plain paper backdrop. Success redirects
// to the library; dismissing the modal returns the buyer to the page they came
// from (browser back), falling back to home on a direct visit.

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBuyerAuth } from '@/stores/buyerAuth';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import { rememberBuyerEmail } from '@/lib/shared/buyer-email';

function UserLoginContent() {
  const router = useRouter();
  const { open, isOpen } = useBuyerAuth();
  const { isLoggedIn, isLoading } = useAuthSession();
  const opened = useRef(false);
  const searchParams = useSearchParams();

  // Email links (purchase confirmation) land here with ?email= so the signup
  // modal prefills even on a device with no remembered buyer email.
  useEffect(() => {
    const email = searchParams.get('email');
    if (email) rememberBuyerEmail(email);
  }, [searchParams]);

  // Already logged in → straight to the library.
  useEffect(() => {
    if (!isLoading && isLoggedIn) router.replace('/account/library');
  }, [isLoading, isLoggedIn, router]);

  // Open the modal on mount; success redirects to the library.
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      open('signup', '/account/library');
      opened.current = true;
    }
  }, [isLoading, isLoggedIn, open]);

  // Dismissed without logging in → go back to where the buyer came from.
  useEffect(() => {
    if (opened.current && !isOpen && !isLoggedIn) {
      if (window.history.length > 1) router.back();
      else router.replace('/');
    }
  }, [isOpen, isLoggedIn, router]);

  return (
    <main className="min-h-screen bg-[#FAF8F6] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="w-7 h-7 rounded-full border-2 border-black/[0.08] border-t-[#E83A2E] animate-spin" />
        <span className="font-ledger text-[11px] text-black/40 uppercase tracking-[0.18em]">Loading…</span>
      </div>
    </main>
  );
}

export default function UserLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F6]" />}>
      <UserLoginContent />
    </Suspense>
  );
}
