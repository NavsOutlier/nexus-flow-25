import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Get unread counts for all tickets of a client
export function useUnreadInternalMessagesByTicket(clientId?: string) {
  return useQuery({
    queryKey: ['unread-internal-by-ticket', clientId],
    queryFn: async () => {
      if (!clientId) return {};
      
      // First get all tickets for this client
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id')
        .eq('client_id', clientId)
        .eq('is_archived', false);
      
      if (ticketsError) throw ticketsError;
      if (!tickets?.length) return {};
      
      const ticketIds = tickets.map(t => t.id);
      
      // Get unread messages grouped by ticket
      const { data, error } = await supabase
        .from('internal_messages')
        .select('ticket_id')
        .in('ticket_id', ticketIds)
        .eq('is_read', false);
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((msg) => {
        counts[msg.ticket_id] = (counts[msg.ticket_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!clientId,
  });
}

// Mark internal messages as read for a ticket
export function useMarkInternalMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('internal_messages')
        .update({ is_read: true })
        .eq('ticket_id', ticketId)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-internal-by-ticket'] });
    },
  });
}