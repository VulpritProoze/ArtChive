import { QueryClient } from '@tanstack/react-query';
import type { RealtimeFriendRequestMessage } from '@/types/realtime';

/**
 * Handles friend request-related WebSocket messages
 */
export class FriendRequestHandler {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  handleMessage(message: RealtimeFriendRequestMessage): void {
    // Invalidate friend request queries to trigger refetch
    this.queryClient.invalidateQueries({ queryKey: ['friend-request-count'] });
    this.queryClient.invalidateQueries({ queryKey: ['pending-friend-requests'] });
    this.queryClient.invalidateQueries({ queryKey: ['friend-request-status'] });
    this.queryClient.invalidateQueries({ queryKey: ['fellows'] });
  }
}

