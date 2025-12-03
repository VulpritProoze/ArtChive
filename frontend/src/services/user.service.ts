import { core } from '@lib/api';
import type { UserFellow, FriendRequestCount, FellowSearchParams, CreateFriendRequestPayload } from '@types';

export interface UserProfilePublic {
  id: number;
  username: string;
  fullname: string;
  profile_picture: string | null;
  artist_types: string[];
}

export interface UserSummary {
  id: number;
  username: string;
  fullname: string;
  profile_picture: string | null;
  artist_types: string[];
  brushdrips_count: number;
}

export const userService = {
  /**
   * Get user profile by username (public endpoint)
   * GET /api/core/profile/by-username/<username>/
   */
  async getUserProfileByUsername(username: string): Promise<UserProfilePublic> {
    const response = await core.get(`profile/by-username/${username}/`);
    return response.data;
  },

  /**
   * Get user summary (for hover modals)
   * GET /api/core/user/<user_id>/summary/
   */
  async getUserSummary(userId: number): Promise<UserSummary> {
    const response = await core.get(`user/${userId}/summary/`);
    return response.data;
  },

  /**
   * Get pending friend request counts
   * GET /api/core/fellows/requests/count/
   */
  async getFriendRequestCount(): Promise<FriendRequestCount> {
    const response = await core.get('fellows/requests/count/');
    return response.data;
  },

  /**
   * Get all pending friend requests (received + sent)
   * GET /api/core/fellows/requests/
   */
  async getPendingFriendRequests(): Promise<UserFellow[]> {
    const response = await core.get('fellows/requests/');
    return response.data;
  },

  /**
   * Get all accepted fellows (friends) for the current user
   * GET /api/core/fellows/
   */
  async getFellows(): Promise<UserFellow[]> {
    const response = await core.get('fellows/');
    return response.data;
  },

  /**
   * Get all active (online) fellows for the current user
   * GET /api/core/fellows/active/
   */
  async getActiveFellows(): Promise<UserFellow[]> {
    const response = await core.get('fellows/active/');
    return response.data;
  },

  /**
   * Get all accepted fellows (friends) for a specific user by user ID (public endpoint)
   * GET /api/core/user/<user_id>/fellows/
   */
  async getUserFellows(userId: number): Promise<UserFellow[]> {
    const response = await core.get(`user/${userId}/fellows/`);
    return response.data;
  },

  /**
   * Search within user's fellows
   * GET /api/core/fellows/search/?q=<query>&filter_by=<filter>
   */
  async searchFellows(params: FellowSearchParams): Promise<UserFellow[]> {
    const { q, filter_by = 'username' } = params;
    const queryParams = new URLSearchParams();
    if (q) queryParams.append('q', q);
    if (filter_by) queryParams.append('filter_by', filter_by);
    
    const response = await core.get(`fellows/search/?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Create a friend request
   * POST /api/core/fellows/request/
   */
  async createFriendRequest(payload: CreateFriendRequestPayload): Promise<UserFellow> {
    const response = await core.post('fellows/request/', payload);
    return response.data;
  },

  /**
   * Accept a friend request
   * POST /api/core/fellows/requests/<id>/accept/
   */
  async acceptFriendRequest(requestId: number): Promise<UserFellow> {
    const response = await core.post(`fellows/requests/${requestId}/accept/`);
    return response.data;
  },

  /**
   * Reject a friend request
   * POST /api/core/fellows/requests/<id>/reject/
   * Returns 204 No Content on success
   */
  async rejectFriendRequest(requestId: number): Promise<void> {
    await core.post(`fellows/requests/${requestId}/reject/`, {});
  },

  /**
   * Cancel a friend request (requester cancels their own sent request)
   * POST /api/core/fellows/requests/<id>/cancel/
   * Returns 204 No Content on success
   */
  async cancelFriendRequest(requestId: number): Promise<void> {
    await core.post(`fellows/requests/${requestId}/cancel/`, {});
  },

  /**
   * Check friend request status between current user and another user
   * GET /api/core/fellows/check-status/?user_id=<id>
   * Returns lightweight status information
   */
  async checkFriendRequestStatus(userId: number): Promise<{
    has_pending_sent: boolean;
    has_pending_received: boolean;
    is_friends: boolean;
    request_id: number | null;
    relationship_id: number | null;
  }> {
    const response = await core.get(`fellows/check-status/`, {
      params: { user_id: userId },
    });
    return response.data;
  },

  /**
   * Unfriend a user (remove friend relationship)
   * DELETE /api/core/fellows/<id>/
   */
  async unfriend(relationshipId: number): Promise<void> {
    await core.delete(`fellows/${relationshipId}/`);
  },

  /**
   * Block a user (placeholder - disabled)
   * POST /api/core/fellows/<id>/block/
   */
  async blockUser(relationshipId: number): Promise<void> {
    await core.post(`fellows/${relationshipId}/block/`);
  },

  /**
   * Get user reputation
   * GET /api/core/users/<id>/reputation/
   */
  async getUserReputation(userId: number): Promise<{ user_id: number; username: string; reputation: number }> {
    const response = await core.get(`users/${userId}/reputation/`);
    return response.data;
  },

  /**
   * Get user reputation history
   * GET /api/core/users/<id>/reputation/history/?limit=50&offset=0
   */
  async getUserReputationHistory(
    userId: number,
    params?: { limit?: number; offset?: number }
  ): Promise<ReputationHistoryEntry[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const response = await core.get(`users/${userId}/reputation/history/?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get reputation leaderboard
   * GET /api/core/reputation/leaderboard/?limit=25&offset=0
   */
  async getReputationLeaderboard(params?: { limit?: number; offset?: number }): Promise<LeaderboardResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const response = await core.get(`reputation/leaderboard/?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get current user's leaderboard position
   * GET /api/core/reputation/leaderboard/me/
   */
  async getMyLeaderboardPosition(): Promise<{
    rank: number;
    reputation: number;
    surrounding_users: LeaderboardEntry[];
  }> {
    const response = await core.get('reputation/leaderboard/me/');
    return response.data;
  },
};

// Reputation types
export interface ReputationHistoryEntry {
  amount: number;
  source_type: 'praise' | 'trophy' | 'critique' | 'gallery_award';
  source_id: string;
  source_object_type: 'post' | 'gallery' | null;
  description: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  id: number;
  username: string;
  fullname: string;
  profile_picture: string | null;
  reputation: number;
  artist_types: string[];
}

export interface LeaderboardResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LeaderboardEntry[];
}

