"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';
import { BuyerAuthProvider } from '@/components/providers/BuyerAuthProvider';
import { NotLoggedInError } from '@/lib/supabase/auth-errors';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        // NotLoggedInError is definitive — retrying it just burns auth calls.
        // Everything else keeps the default 3× backoff (which is also what turns
        // retryable AuthUnavailableError stalls into self-healing).
        retry: (failureCount, error) => !(error instanceof NotLoggedInError) && failureCount < 3,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <BuyerAuthProvider />
    </QueryClientProvider>
  );
}
