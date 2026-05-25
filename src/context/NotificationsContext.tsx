import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '../api/client';

export type NotificationItem = {
  id: string;
  type: 'missed_call' | 'call' | 'alert';
  other_user_id: string;
  other_user_name: string;
  other_user_email: string;
  message: string;
  timestamp: string;
  status: string;
  seen: boolean;
};

type NotificationsContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markSeen: (ids: string[]) => Promise<void>;
  markAllSeen: () => Promise<void>;
  loading: boolean;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCountRef = useRef(0);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { response, data } = await apiGet('/emergency/notifications/');
      if (response.ok && data && typeof data === 'object') {
        const body = data as { notifications?: NotificationItem[]; unseen_count?: number };
        if (Array.isArray(body.notifications)) {
          setNotifications(body.notifications);
        }
        if (typeof body.unseen_count === 'number') {
          setUnreadCount(body.unseen_count);
          lastCountRef.current = body.unseen_count;
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const markSeen = useCallback(async (ids: string[]) => {
    await apiPost('/emergency/notifications/mark-seen/', { ids });
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, seen: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - ids.length));
  }, []);

  const markAllSeen = useCallback(async () => {
    const unseenIds = notifications.filter((n) => !n.seen).map((n) => n.id);
    if (unseenIds.length === 0) return;
    await markSeen(unseenIds);
  }, [notifications, markSeen]);

  useEffect(() => {
    void refreshNotifications();
    const interval = setInterval(() => void refreshNotifications(), 30000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, refreshNotifications, markSeen, markAllSeen, loading }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
