"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useAbTests() {
  const { data: tests = [], isLoading, error } = useQuery({
    queryKey: ['ab-tests'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not logged in");
      const user = session.user;

      const { data, error } = await (supabase as any)
        .from('ab_tests')
        .select(`
          *,
          products(title)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  return { tests, isLoading, error };
}
