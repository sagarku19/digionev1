"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useAbTests() {
  const supabase = createClient();

  const { data: tests = [], isLoading, error } = useQuery({
    queryKey: ['ab-tests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

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
