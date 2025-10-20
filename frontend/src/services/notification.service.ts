import { notification } from '@lib/api';
import type { Notification } from '@/types/notification';

export const notificationService = {
  /**
   * Fetch all notifications for the current user
   */
  async fetchNotifications(unreadOnly = false): Promise<Notification[]> {
    const params = unreadOnly ? { unread_only: 'true' } : {};
    const response = await notification.get('', { params });
    return response.data;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await notification.get('unread-count/');
    return response.data.unread_count;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await notification.post('mark-as-read/', {
      notification_id: notificationId,
    });
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await notification.post('mark-all-as-read/');
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await notification.delete(`${notificationId}/delete/`);
  },

  /**
   * Get a single notification by ID
   */
  async getNotification(notificationId: string): Promise<Notification> {
    const response = await notification.get(`${notificationId}/`);
    return response.data;
  },
};
