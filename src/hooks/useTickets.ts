import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Ticket = Tables<'tickets'>;

export function useTickets(clientId?: string) {
  return useQuery({
    queryKey: ['tickets', clientId],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Ticket[];
    },
  });
}

export function useNewTicketsCount(clientId?: string) {
  return useQuery({
    queryKey: ['tickets-count', clientId],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select('id', { count: 'exact' })
        .eq('status', 'Novo')
        .eq('is_archived', false);
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: TablesInsert<'tickets'>) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert(ticket)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-count'] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'tickets'> & { id: string }) => {
      const { data, error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-count'] });
    },
  });
}
