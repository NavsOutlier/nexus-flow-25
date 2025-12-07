import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('realtime-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          queryClient.invalidateQueries({ queryKey: ['tickets-count'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'external_messages' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['external-messages', payload.new.client_id] });
          queryClient.invalidateQueries({ queryKey: ['unread-external', payload.new.client_id] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'external_messages' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['external-messages', payload.new.client_id] });
          queryClient.invalidateQueries({ queryKey: ['unread-external', payload.new.client_id] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'internal_messages' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['internal-messages', payload.new.ticket_id] });
          queryClient.invalidateQueries({ queryKey: ['unread-internal', payload.new.ticket_id] });
          queryClient.invalidateQueries({ queryKey: ['unread-internal-by-ticket'] });
          queryClient.invalidateQueries({ queryKey: ['unread-mentions'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'internal_messages' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['internal-messages', payload.new.ticket_id] });
          queryClient.invalidateQueries({ queryKey: ['unread-internal', payload.new.ticket_id] });
          queryClient.invalidateQueries({ queryKey: ['unread-internal-by-ticket'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['direct-messages'] });
          queryClient.invalidateQueries({ queryKey: ['unread-dms'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['profiles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
