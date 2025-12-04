export interface NotificationUser {
  id: number;
  username: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  profile_picture: string | null;
}

export interface Notification {
  notification_id: string;
  message: string;
  notification_object_type: 'Post Comment' | 'Post Critique' | 'Post Praise' | 'Post Trophy' | 'Gallery Comment' | 'Gallery Critique' | 'Gallery Award' | 'Friend Request Accepted' | 'Join Request Created' | 'Join Request Accepted' | 'Admin Request Created' | 'Admin Request Accepted';
  notification_object_id: string;
  is_read: boolean;
  notified_at: string;
  notified_by: NotificationUser | null;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}
