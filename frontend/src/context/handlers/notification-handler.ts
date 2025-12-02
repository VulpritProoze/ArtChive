import React from 'react';
import type { Notification } from '@/types/notification';
import type { RealtimeNotificationMessage } from '@/types/realtime';

/**
 * Handles notification-related WebSocket messages
 */
export class NotificationHandler {
  private setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  private setUnreadCount: React.Dispatch<React.SetStateAction<number>>;

  constructor(
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>,
    setUnreadCount: React.Dispatch<React.SetStateAction<number>>
  ) {
    this.setNotifications = setNotifications;
    this.setUnreadCount = setUnreadCount;
  }

  handleMessage(message: RealtimeNotificationMessage): void {
    // Type assertion is safe here because the backend sends properly typed notifications
    const newNotification: Notification = message.notification as Notification;

    // Add to notifications list (prepend to show newest first)
    this.setNotifications(prev => [newNotification, ...prev]);

    // Increment unread count if not already read
    if (!newNotification.is_read) {
      this.setUnreadCount(prev => prev + 1);
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

  markAsRead(notificationId: string): void {
    this.setNotifications(prev =>
      prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
    );
    this.setUnreadCount(prev => Math.max(0, prev - 1));
  }

  markAllAsRead(): void {
    this.setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    this.setUnreadCount(0);
  }

  deleteNotification(notificationId: string): void {
    this.setNotifications(prev => {
      const deleted = prev.find(n => n.notification_id === notificationId);
      if (deleted && !deleted.is_read) {
        this.setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.notification_id !== notificationId);
    });
  }
}

