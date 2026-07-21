// Services and service_bookings for a creator: list reads + CRUD.
// DB tables: services, service_bookings
// Query keys: ['services','list'], ['service-bookings','list',{serviceIds}]
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import type { Json } from '@/types/database.types';

export type Service = {
  id: string; title: string; description: string | null; service_type: string;
  price: number; duration_minutes: number | null; is_active: boolean; metadata: Json | null;
  created_at: string;
};
export type Booking = {
  id: string; service_id: string; customer_name: string | null; customer_email: string | null;
  status: string; booked_at: string | null; amount_paid: number | null; created_at: string;
};

type ServicesPayload = { creatorId: string; services: Service[] };

export function useServices() {
  const queryClient = useQueryClient();

  const servicesQuery = useQuery({
    queryKey: ['services', 'list'] as const,
    queryFn: async (): Promise<ServicesPayload> => {
      try {
        const creatorId = await getCreatorProfileId();
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('creator_id', creatorId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return { creatorId, services: (data ?? []) as Service[] };
      } catch (err) {
        console.error('useServices services error:', err);
        throw err;
      }
    },
  });

  const services = servicesQuery.data?.services ?? [];
  const creatorId = servicesQuery.data?.creatorId;
  const serviceIds = services.map((s) => s.id);

  const bookingsQuery = useQuery({
    queryKey: ['service-bookings', 'list', { serviceIds }] as const,
    enabled: serviceIds.length > 0,
    queryFn: async (): Promise<Booking[]> => {
      try {
        const { data, error } = await supabase
          .from('service_bookings')
          .select('*')
          .in('service_id', serviceIds)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []) as Booking[];
      } catch (err) {
        console.error('useServices bookings error:', err);
        throw err;
      }
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] });
    queryClient.invalidateQueries({ queryKey: ['service-bookings'] });
  };

  const createService = useMutation({
    mutationFn: async (payload: Omit<Service, 'id' | 'created_at'>) => {
      if (!creatorId) throw new Error('creator not loaded');
      const { error } = await supabase.from('services').insert({ ...payload, creator_id: creatorId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateService = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Service> }) => {
      const { error } = await supabase.from('services').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleActive = useMutation({
    mutationFn: async (svc: Service) => {
      const { error } = await supabase.from('services').update({ is_active: !svc.is_active }).eq('id', svc.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('service_bookings').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-bookings'] }),
  });

  return {
    services,
    bookings: bookingsQuery.data ?? [],
    isLoading: servicesQuery.isLoading || bookingsQuery.isLoading,
    createService: createService.mutateAsync,
    updateService: updateService.mutateAsync,
    deleteService: deleteService.mutateAsync,
    toggleActive: toggleActive.mutateAsync,
    updateBookingStatus: updateBookingStatus.mutateAsync,
  };
}
