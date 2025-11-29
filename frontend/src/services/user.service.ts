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
   */
  async rejectFriendRequest(requestId: number): Promise<void> {
    await core.post(`fellows/requests/${requestId}/reject/`);
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
};

