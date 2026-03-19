"use client";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useGuestLeads() {
  const supabase = createClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['guest-leads'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data, error } = await supabase
        .from('guest_leads')
        .select(`
          *,
          products(name)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  return { leads, isLoading, error };
}
