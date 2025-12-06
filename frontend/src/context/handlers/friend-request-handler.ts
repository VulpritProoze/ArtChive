import { QueryClient } from '@tanstack/react-query';
import type { RealtimeFriendRequestMessage } from '@/types/realtime';
import type { FriendRequestCount } from '@/types/fellow.types';

/**
 * Handles friend request-related WebSocket messages
 */
export class FriendRequestHandler {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  handleMessage(message: RealtimeFriendRequestMessage): void {
    // If the message includes a count, update the cache directly for instant UI update
    if (message.count) {
      const countData: FriendRequestCount = {
        received_count: message.count.received_count,
        sent_count: message.count.sent_count,
        total_count: message.count.total_count,
      };
      
      // Update the cache directly for instant real-time update
      this.queryClient.setQueryData<FriendRequestCount>(
        ['friend-request-count'],
        countData
      );
    } else {
      // If no count provided, invalidate to trigger refetch
      this.queryClient.invalidateQueries({ queryKey: ['friend-request-count'] });
    }

    // Invalidate other friend request queries to trigger refetch
    this.queryClient.invalidateQueries({ queryKey: ['pending-friend-requests'] });
    this.queryClient.invalidateQueries({ queryKey: ['friend-request-status'] });
    this.queryClient.invalidateQueries({ queryKey: ['fellows'] });
  }
}

