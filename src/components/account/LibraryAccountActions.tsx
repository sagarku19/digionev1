"use client";

// Runs the entitlement claim once on library load (covers email-signup + OAuth
// buyers after their session exists), and offers buyers an upgrade to a creator
// account. Upgrade fully refreshes cached identity so no logout/login is needed.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Store, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/current-user';
import { useAuthSession } from '@/hooks/auth/useAuthSession';

export default function LibraryAccountActions() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoggedIn, isLoading } = useAuthSession();

  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const claimed = useRef(false);

  // Claim guest purchases once a session exists. Idempotent + retryable server-side.
  useEffect(() => {
    if (isLoading || !isLoggedIn || claimed.current) return;
    claimed.current = true;
    (async () => {
      try {
        const res = await fetch('/api/account/claim-entitlements', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.claimed > 0) {
          // useLibrary is a client-side query — invalidate it so newly-claimed
          // purchases appear without a manual reload. router.refresh() only
          // re-runs Server Components (none feed this query).
          await queryClient.invalidateQueries({ queryKey: ['library', 'list'] });
          router.refresh();
        }
      } catch { /* non-blocking */ }
    })();
  }, [isLoading, isLoggedIn, router, queryClient]);

  // Resolve current role to decide whether to show the upgrade card.
  useEffect(() => {
    if (isLoading || !isLoggedIn) return;
    (async () => {
      const user = await getCurrentUser();
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('auth_provider_id', user.id)
        .maybeSingle();
      setIsCreator(data?.role === 'creator' || data?.role === 'super_admin');
    })();
  }, [isLoading, isLoggedIn]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    setError(null);
    try {
      const res = await fetch('/api/account/upgrade-to-creator', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upgrade failed');

      // Refresh cached identity so proxy.ts sees the new role without a re-login.
      await supabase.auth.refreshSession();
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      router.refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setUpgrading(false);
    }
  };

  if (isLoading || !isLoggedIn || isCreator !== false) return null;

  return (
    <div className="max-w-3xl mx-auto mt-6 bg-white border border-black/[0.07] rounded-xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
      <div className="w-12 h-12 rounded-lg bg-[#FAF8F6] border border-black/[0.07] flex items-center justify-center shrink-0">
        <Store className="w-6 h-6 text-[#E83A2E]" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35 mb-1.5">
          {'>>'}&nbsp;&nbsp;/dashboard
        </p>
        <h3 className="text-[17px] font-bold tracking-[-0.02em] text-[#16130F] mb-1">Become a creator</h3>
        <p className="text-[13px] font-medium text-black/50 leading-relaxed">
          Sell your own digital products, build a storefront, and get paid — upgrade your account in one click.
        </p>
        {error && <p className="mt-2 text-[12px] text-[#E83A2E] font-medium">{error}</p>}
      </div>
      <button
        onClick={handleUpgrade}
        disabled={upgrading}
        className="group inline-flex items-center justify-center gap-2 bg-[#E83A2E] hover:bg-[#C92F24] disabled:opacity-50 text-white font-semibold text-[14px] py-3 px-5 rounded-lg transition-colors duration-200 shrink-0"
      >
        {upgrading ? <><Loader2 className="w-4 h-4 animate-spin" /> Upgrading…</> : <>Upgrade <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>}
      </button>
    </div>
  );
}
