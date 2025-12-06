import type { UserSummary } from '@hooks/queries/use-user-summary';

/**
 * UserFellow relationship status
 */
export type FellowStatus = 'pending' | 'accepted' | 'blocked';

/**
 * UserFellow relationship interface
 */
export interface UserFellow {
  id: number;
  user: number; // User ID (requester)
  user_info: UserSummary; // Full user info for requester
  fellow_user: number; // User ID (requested user)
  fellow_user_info: UserSummary; // Full user info for requested user
  status: FellowStatus;
  fellowed_at: string; // ISO datetime string
}

/**
 * Friend request count interface
 */
export interface FriendRequestCount {
  received_count: number;
  sent_count: number;
  total_count: number;
}

/**
 * Search parameters for fellows search
 */
export interface FellowSearchParams {
  q?: string; // Search query
  filter_by?: 'username' | 'name' | 'artist_type'; // Filter type
}

/**
 * Create friend request payload
 */
export interface CreateFriendRequestPayload {
  fellow_user_id: number;
}

