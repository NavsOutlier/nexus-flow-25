import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationType = 
  | 'external_message'
  | 'internal_message'
  | 'direct_message'
  | 'ticket_created'
  | 'ticket_assigned'
  | 'mention'
  | 'ticket_status_changed';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  client_id: string | null;
  ticket_id: string | null;
  message_id: string | null;
  title: string;
  description: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface NotificationFilters {
  client_id?: string;
  ticket_id?: string;
  sender_id?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar notificações não lidas
  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ['notifications', 'unread', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  // Contar não lidas por tipo e filtros
  const getUnreadCount = (type?: NotificationType, filters?: NotificationFilters): number => {
    return unreadNotifications.filter(notif => {
      if (type && notif.type !== type) return false;
      if (filters?.client_id && notif.client_id !== filters.client_id) return false;
      if (filters?.ticket_id && notif.ticket_id !== filters.ticket_id) return false;
      if (filters?.sender_id && notif.metadata?.sender_id !== filters.sender_id) return false;
      return true;
    }).length;
  };

  // Verificar se tem notificações não lidas para um contexto
  const hasUnread = (type?: NotificationType, filters?: NotificationFilters): boolean => {
    return getUnreadCount(type, filters) > 0;
  };

  // Marcar notificações específicas como lidas
  const markAsRead = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      if (notificationIds.length === 0) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', notificationIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Marcar todas de um contexto como lidas
  const markContextAsRead = useMutation({
    mutationFn: async ({ 
      type, 
      client_id, 
      ticket_id,
      sender_id 
    }: { 
      type?: NotificationType; 
      client_id?: string; 
      ticket_id?: string;
      sender_id?: string;
    }) => {
      if (!user?.id) return;

      // Encontrar IDs das notificações que correspondem aos filtros
      const matchingNotifications = unreadNotifications.filter(notif => {
        if (type && notif.type !== type) return false;
        if (client_id && notif.client_id !== client_id) return false;
        if (ticket_id && notif.ticket_id !== ticket_id) return false;
        if (sender_id && notif.metadata?.sender_id !== sender_id) return false;
        return true;
      });

      if (matchingNotifications.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', matchingNotifications.map(n => n.id));
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Realtime subscription para novas notificações
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    unreadNotifications,
    getUnreadCount,
    hasUnread,
    markAsRead,
    markContextAsRead,
  };
}
