import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Count unread external messages for a client (both inbound and outbound from others)
export function useUnreadExternalMessagesCount(clientId?: string) {
  return useQuery({
    queryKey: ['unread-external', clientId],
    queryFn: async () => {
      if (!clientId) return 0;
      const { count, error } = await supabase
        .from('external_messages')
        .select('id', { count: 'exact' })
        .eq('client_id', clientId)
        .eq('is_read', false);
      
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!clientId,
  });
}

// Count unread internal messages for a specific ticket
export function useUnreadInternalMessagesCount(ticketId?: string) {
  return useQuery({
    queryKey: ['unread-internal', ticketId],
    queryFn: async () => {
      if (!ticketId) return 0;
      const { count, error } = await supabase
        .from('internal_messages')
        .select('id', { count: 'exact' })
        .eq('ticket_id', ticketId)
        .eq('is_read', false);
      
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!ticketId,
  });
}

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

// Check if user has any unread mentions
export function useUnreadMentionsCount(userId?: string) {
  return useQuery({
    queryKey: ['unread-mentions', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('internal_messages')
        .select('id', { count: 'exact' })
        .contains('mentions', [userId])
        .eq('is_read', false);
      
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

// Mark external messages as read for a client
export function useMarkExternalMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('external_messages')
        .update({ is_read: true })
        .eq('client_id', clientId)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['unread-external', clientId] });
      queryClient.invalidateQueries({ queryKey: ['external-messages', clientId] });
    },
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
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['unread-internal', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['unread-internal-by-ticket'] });
      queryClient.invalidateQueries({ queryKey: ['internal-messages', ticketId] });
    },
  });
}

// Check if client has any unread activity (external messages OR new tickets)
export function useClientHasUnreadActivity(clientId?: string) {
  const { data: unreadExternal } = useUnreadExternalMessagesCount(clientId);
  
  return useQuery({
    queryKey: ['client-unread-activity', clientId, unreadExternal],
    queryFn: async () => {
      if (!clientId) return false;
      return (unreadExternal ?? 0) > 0;
    },
    enabled: !!clientId,
  });
}
