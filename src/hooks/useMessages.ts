import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type ExternalMessage = Tables<'external_messages'>;
export type InternalMessage = Tables<'internal_messages'>;
export type DirectMessage = Tables<'direct_messages'>;

const WEBHOOK_URL = 'https://webhook.med4growautomacao.com.br/webhook/7b33d985-2b09-45f8-80a8-4a40a73ba0fb';

export function useExternalMessages(clientId?: string) {
  return useQuery({
    queryKey: ['external-messages', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('external_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      return data as ExternalMessage[];
    },
    enabled: !!clientId,
  });
}

export function useSendExternalMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      content, 
      senderName, 
      groupId 
    }: { 
      clientId: string; 
      content: string; 
      senderName: string; 
      groupId: string;
    }) => {
      // Send to webhook
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          groupId,
          sender: senderName,
        }),
      });

      // Save to database
      const { data, error } = await supabase
        .from('external_messages')
        .insert({
          client_id: clientId,
          content,
          sender_name: senderName,
          direction: 'outbound',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['external-messages', variables.clientId] });
    },
  });
}

export function useInternalMessages(ticketId?: string) {
  return useQuery({
    queryKey: ['internal-messages', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from('internal_messages')
        .select('*, sender:profiles(*), quoted_message:external_messages(*)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });
}

export function useSendInternalMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: TablesInsert<'internal_messages'>) => {
      const { data, error } = await supabase
        .from('internal_messages')
        .insert(message)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['internal-messages', variables.ticket_id] });
    },
  });
}

export function useDirectMessages(userId?: string, partnerId?: string) {
  return useQuery({
    queryKey: ['direct-messages', userId, partnerId],
    queryFn: async () => {
      if (!userId || !partnerId) return [];
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*, sender:profiles!direct_messages_sender_id_fkey(*)')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!partnerId,
  });
}

export function useSendDirectMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: TablesInsert<'direct_messages'>) => {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert(message)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-messages'] });
    },
  });
}

export function useLastInternalMessage(ticketId?: string) {
  return useQuery({
    queryKey: ['last-internal-message', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data, error } = await supabase
        .from('internal_messages')
        .select('*, sender:profiles(name)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });
}
