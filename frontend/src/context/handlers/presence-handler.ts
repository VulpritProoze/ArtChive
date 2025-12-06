/**
 * Handler for presence updates via WebSocket
 * Manages active fellows state based on real-time presence updates
 */

import type { RealtimePresenceMessage } from '@/types/realtime';

export class PresenceHandler {
  private activeUserIds: Set<number> = new Set();
  private setActiveFellows: (fellows: number[]) => void;

  constructor(setActiveFellows: (fellows: number[]) => void) {
    this.setActiveFellows = setActiveFellows;
  }

  /**
   * Handle presence update message from WebSocket
   */
  handleMessage(message: RealtimePresenceMessage): void {
    const { user_id, status } = message;

    console.log(`[PresenceHandler] Received presence update: user ${user_id} is ${status}`);

    if (status === 'online') {
      this.activeUserIds.add(user_id);
      console.log(`[PresenceHandler] Added user ${user_id} to active set. Active users:`, Array.from(this.activeUserIds));
    } else if (status === 'offline') {
      this.activeUserIds.delete(user_id);
      console.log(`[PresenceHandler] Removed user ${user_id} from active set. Active users:`, Array.from(this.activeUserIds));
    }

    // Update active fellows list
    this.updateActiveFellows();
  }

  /**
   * Set initial active user IDs (from API fetch)
   */
  setInitialActiveUserIds(userIds: number[]): void {
    this.activeUserIds = new Set(userIds);
    this.updateActiveFellows();
  }

  /**
   * Add a user to active set (when they come online)
   */
  addActiveUser(userId: number): void {
    this.activeUserIds.add(userId);
    this.updateActiveFellows();
  }

  /**
   * Remove a user from active set (when they go offline)
   */
  removeActiveUser(userId: number): void {
    this.activeUserIds.delete(userId);
    this.updateActiveFellows();
  }

  /**
   * Check if a user is active
   */
  isUserActive(userId: number): boolean {
    return this.activeUserIds.has(userId);
  }

  /**
   * Get all active user IDs
   */
  getActiveUserIds(): number[] {
    return Array.from(this.activeUserIds);
  }

  /**
   * Clear all active users (on logout)
   */
  clear(): void {
    this.activeUserIds.clear();
    this.setActiveFellows([]);
  }

  /**
   * Update the active fellows list
   */
  private updateActiveFellows(): void {
    this.setActiveFellows(Array.from(this.activeUserIds));
  }
}

