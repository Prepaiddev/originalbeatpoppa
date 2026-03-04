import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';

export interface Notification {
  id: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (userId: string, isAdmin?: boolean) => Promise<void>;
  markAsRead: (id: string, isAdmin?: boolean) => Promise<void>;
  markAllAsRead: (userId: string, isAdmin?: boolean) => Promise<void>;
  subscribeToNotifications: (userId: string, isAdmin?: boolean) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (userId, isAdmin = false) => {
    set({ loading: true });
    try {
      const table = isAdmin ? 'admin_notifications' : 'notifications';
      const query = supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!isAdmin) {
        query.eq('user_id', userId);
      }

      const { data, error } = await query;
      
      if (error) {
        if (error.message === 'Failed to fetch') {
          console.warn('Network connection issue fetching notifications. Check your internet or ad-blocker.');
        } else {
          console.error('Error fetching notifications:', error.message || error);
        }
        return;
      }

      const unreadCount = data?.filter(n => !n.is_read).length || 0;
      set({ notifications: data || [], unreadCount });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage === 'Failed to fetch') {
        console.warn('Network connection issue fetching notifications. Check your internet or ad-blocker.');
      } else {
        console.error('Error fetching notifications:', errorMessage);
      }
    } finally {
      set({ loading: false });
    }
  },

  subscribeToNotifications: (userId, isAdmin = false) => {
    const table = isAdmin ? 'admin_notifications' : 'notifications';
    
    const channel = supabase
      .channel(`${table}_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table,
          filter: isAdmin ? undefined : `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          set(state => {
            const updatedNotifications = [newNotification, ...state.notifications].slice(0, 20);
            const newUnreadCount = updatedNotifications.filter(n => !n.is_read).length;
            return {
              notifications: updatedNotifications,
              unreadCount: newUnreadCount
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  markAsRead: async (id, isAdmin = false) => {
    try {
      const table = isAdmin ? 'admin_notifications' : 'notifications';
      const { error } = await supabase
        .from(table)
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async (userId, isAdmin = false) => {
    try {
      const table = isAdmin ? 'admin_notifications' : 'notifications';
      const query = supabase
        .from(table)
        .update({ is_read: true })
        .eq('is_read', false);

      if (!isAdmin) {
        query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) throw error;

      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
}));
