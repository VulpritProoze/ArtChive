/**
 * Realtime WebSocket message types
 */

import type { Notification } from './notification';

export type RealtimeMessageType = 
  | 'notification'
  | 'friend_request_update'
  | 'presence_update';

export interface RealtimeNotificationMessage {
  type: 'notification';
  notification: Notification;
}

export interface RealtimeFriendRequestMessage {
  type: 'friend_request_update';
  action: 'created' | 'accepted' | 'rejected' | 'cancelled';
  friend_request?: any; // UserFellow object
  count?: {
    received_count: number;
    sent_count: number;
    total_count: number;
  };
}

export interface RealtimePresenceMessage {
  type: 'presence_update';
  user_id: number;
  username: string;
  status: 'online' | 'offline';
  timestamp: string;
}

export type RealtimeMessage = RealtimeNotificationMessage | RealtimeFriendRequestMessage | RealtimePresenceMessage;

