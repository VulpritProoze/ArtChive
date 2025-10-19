import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Notification, NotificationContextType } from '@/types/notification';
import { notificationService } from '../services/notification.service';
import { WS_BASE_URL } from '@lib/api';
import { useAuth } from './auth-context';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Check if user is authenticated (user is authenticated if user object exists)
  const isAuthenticated = !!user;

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const data = await notificationService.fetchNotifications();
      setNotifications(data);

      // Update unread count
      const unread = data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [isAuthenticated]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [isAuthenticated]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);

      // Update local state
      setNotifications(prev => {
        const deleted = prev.find(n => n.notification_id === notificationId);
        if (deleted && !deleted.is_read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.notification_id !== notificationId);
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, []);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    // Security: Only connect if user is authenticated
    if (!isAuthenticated || !user) {
      console.log('⚠️ Cannot connect WebSocket: User not authenticated');
      return;
    }

    // Don't create multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // WebSocket will automatically include cookies (including HttpOnly cookies)
      // in the handshake request when connecting from the same origin
      const ws = new WebSocket(`${WS_BASE_URL}/ws/notifications/`);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'notification') {
            const newNotification: Notification = data.notification;

            // Add to notifications list (prepend to show newest first)
            setNotifications(prev => [newNotification, ...prev]);

            // Increment unread count if not already read
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }

            // Show browser notification (if permission granted)
            if ('Notification' in window && Notification.permission === 'granted') {
              const browserNotif = new Notification('New Notification', {
                body: newNotification.message,
                icon: newNotification.notified_by?.profile_picture || '/logo/ArtChive_logo.png',
                tag: newNotification.notification_id, // Prevents duplicate notifications
              });

              // Auto-close after 5 seconds
              setTimeout(() => browserNotif.close(), 5000);
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('🔴 WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Only attempt to reconnect if user is still authenticated
        // and we haven't exceeded max attempts
        if (isAuthenticated && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectWebSocket();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [user, isAuthenticated]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    console.log('Disconnecting WebSocket...');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Initialize on mount and when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // Fetch initial data
      fetchNotifications();

      // Connect to WebSocket
      connectWebSocket();

      // Request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('✅ Browser notification permission granted');
          }
        });
      }
    } else {
      // User logged out or not authenticated
      disconnectWebSocket();
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isAuthenticated, user]); // Only depend on auth state

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
    fetchUnreadCount,
    connectWebSocket,
    disconnectWebSocket,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
