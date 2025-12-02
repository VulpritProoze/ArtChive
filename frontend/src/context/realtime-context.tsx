import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Notification, NotificationContextType } from '@/types/notification';
import { notificationService } from '../services/notification.service';
import { WS_BASE_URL } from '@lib/api';
import { useAuth } from './auth-context';
import { useWebSocket } from '../hooks/use-websocket';
import { NotificationHandler } from './handlers/notification-handler';
import { FriendRequestHandler } from './handlers/friend-request-handler';
import type { RealtimeMessage } from '@/types/realtime';

// Extend NotificationContextType to include realtime connection status
interface RealtimeContextType extends NotificationContextType {
  // Connection status is already in NotificationContextType as isConnected
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Initialize handlers
  const notificationHandlerRef = useRef<NotificationHandler | null>(null);
  const friendRequestHandlerRef = useRef<FriendRequestHandler | null>(null);

  // Initialize handlers once
  if (!notificationHandlerRef.current) {
    notificationHandlerRef.current = new NotificationHandler(setNotifications, setUnreadCount);
  }
  if (!friendRequestHandlerRef.current) {
    friendRequestHandlerRef.current = new FriendRequestHandler(queryClient);
  }

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
      notificationHandlerRef.current?.markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      notificationHandlerRef.current?.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      notificationHandlerRef.current?.deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, []);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data: RealtimeMessage = JSON.parse(event.data);

      if (data.type === 'notification') {
        notificationHandlerRef.current?.handleMessage(data);
      } else if (data.type === 'friend_request_update') {
        friendRequestHandlerRef.current?.handleMessage(data);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, []);

  // WebSocket connection using unified endpoint
  const { isConnected, connect: connectWebSocket, disconnect: disconnectWebSocket } = useWebSocket({
    url: `${WS_BASE_URL}/ws/realtime/`,
    enabled: isAuthenticated && !!user,
    onMessage: handleWebSocketMessage,
    onOpen: () => {
      // Connection opened successfully
    },
    onClose: (event) => {
      // Handle close events if needed
      const normalCloseCodes = [1000, 1001, 1006];
      const isNormalClosure = normalCloseCodes.includes(event.code);

      if (!isNormalClosure && event.code !== 1000) {
        // Log unexpected closures (handled by useWebSocket hook)
      }
    },
    onError: () => {
      // Errors are handled by useWebSocket hook
    },
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    connectionTimeout: 10000,
  });

  // Initialize on mount and when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // Fetch initial data FIRST (priority)
      fetchNotifications();

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
  }, [isAuthenticated, user, fetchNotifications, disconnectWebSocket]);

  // Separate effect for WebSocket - deferred to avoid blocking initial load
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Defer WebSocket connection by 2 seconds to allow page to load first
    const connectTimeout = setTimeout(() => {
      connectWebSocket();
    }, 2000);

    return () => {
      clearTimeout(connectTimeout);
    };
  }, [isAuthenticated, user, connectWebSocket]);

  const value: RealtimeContextType = {
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
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

// Alias for backward compatibility - allows components to use either hook name
export function useNotifications() {
  return useRealtime();
}

