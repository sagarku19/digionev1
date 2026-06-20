"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export function useAbTests() {
  const { data: tests = [], isLoading, error } = useQuery({
    queryKey: ['ab-tests', 'list'],
    queryFn: async () => {
      const creatorId = await getCreatorProfileId();

      const { data, error } = await supabase
        .from('ab_tests')
        .select('*, products(name)')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  return { tests, isLoading, error };
}
