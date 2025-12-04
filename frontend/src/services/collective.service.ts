import { collective } from '@lib/api';

export interface ChangeMemberRoleResponse {
  message: string;
  member_id: number;
  username: string;
  role: string;
}

export interface DemoteMemberResponse {
  message: string;
  member_id: number;
  role: string;
}

export interface UpdateCollectiveData {
  description?: string;
  rules?: string[];
  artist_types?: string[];
  picture?: File | string; // Can be a File (new upload) or string (existing URL)
}

export interface Collective {
  collective_id: string;
  title: string;
  description: string;
  rules: string[];
  artist_types: string[];
  picture: string;
  created_at: string;
  updated_at: string;
}

// Collective list item (simpler version for list views)
export interface CollectiveListItem {
  collective_id: string;
  title: string;
  description: string;
  rules: string[];
  artist_types: string[];
  picture: string;
  created_at: string;
  updated_at: string;
  channels?: any[];
  members?: any[];
  member_count?: number;
  brush_drips_count?: number;
  reputation?: number;
}

export const collectiveService = {
  /**
   * Get collective data by ID (detailed view with channels and members)
   * GET /api/collective/<collective_id>/
   */
  async getCollective(collectiveId: string): Promise<Collective> {
    const response = await collective.get(`${collectiveId}/`);
    return response.data;
  },

  /**
   * Get collective members list
   * GET /api/collective/<collective_id>/members/
   */
  async getCollectiveMembers(collectiveId: string): Promise<any[]> {
    const response = await collective.get(`${collectiveId}/members/`);
    return response.data;
  },

  /**
   * Get posts for a channel (paginated)
   * GET /api/collective/channel/<channelId>/posts/?page=<page>&page_size=<pageSize>
   */
  async getChannelPosts(channelId: string, page: number = 1, pageSize: number = 10): Promise<any> {
    const response = await collective.get(`channel/${channelId}/posts/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Change a member's role to admin
   * PATCH /api/collective/<collective_id>/members/<member_id>/role/
   */
  async changeMemberRole(
    collectiveId: string,
    memberId: number
  ): Promise<ChangeMemberRoleResponse> {
    const response = await collective.patch(
      `${collectiveId}/members/${memberId}/role/`,
      { member_id: memberId }
    );
    return response.data;
  },

  /**
   * Demote an admin to member
   * POST /api/collective/<collective_id>/members/demote/
   */
  async demoteMember(
    collectiveId: string,
    memberId: number
  ): Promise<DemoteMemberResponse> {
    const response = await collective.post(
      `${collectiveId}/members/demote/`,
      { member_id: memberId, collective_id: collectiveId }
    );
    return response.data;
  },

  /**
   * Kick a member from the collective
   * DELETE /api/collective/<collective_id>/members/kick/
   */
  async kickMember(collectiveId: string, memberId: number): Promise<void> {
    await collective.delete(`${collectiveId}/members/kick/`, {
      data: { member_id: memberId },
    });
  },

  /**
   * Update collective details (admin only)
   * PATCH /api/collective/<collective_id>/update/
   */
  async updateCollective(
    collectiveId: string,
    data: UpdateCollectiveData
  ): Promise<Collective> {
    // If picture is a File, use FormData for multipart upload
    if (data.picture instanceof File) {
      const formData = new FormData();
      if (data.description !== undefined) formData.append('description', data.description);
      if (data.rules !== undefined) {
        // Send rules as array items
        data.rules.forEach((rule) => {
          formData.append('rules[]', rule);
        });
      }
      if (data.artist_types !== undefined) {
        // Send artist_types as array items
        data.artist_types.forEach((type) => {
          formData.append('artist_types[]', type);
        });
      }
      formData.append('picture', data.picture);

      const response = await collective.patch(`${collectiveId}/update/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // Regular JSON request - ensure arrays are properly formatted
      const jsonData: any = {};
      if (data.description !== undefined) jsonData.description = data.description;
      if (data.rules !== undefined) jsonData.rules = data.rules;
      if (data.artist_types !== undefined) jsonData.artist_types = data.artist_types;
      // Don't include picture if it's not a File - backend will preserve existing value

      const response = await collective.patch(`${collectiveId}/update/`, jsonData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    }
  },

  /**
   * Leave a collective
   * DELETE /api/collective/<collective_id>/leave/
   */
  async leaveCollective(collectiveId: string): Promise<void> {
    await collective.delete(`${collectiveId}/leave/`, {
      withCredentials: true,
    });
  },

  /**
   * Request to become an admin of a collective
   * POST /api/collective/<collective_id>/admin/request/
   */
  async requestAdmin(collectiveId: string): Promise<void> {
    await collective.post(
      `${collectiveId}/admin/request/`,
      {},
      { withCredentials: true }
    );
  },

  /**
   * Get pending join requests for multiple collectives (bulk)
   * POST /api/collective/join/requests/bulk/
   * Body: { "collective_ids": ["uuid1", "uuid2", ...] }
   * Returns: { "collective_id_1": "request_id", "collective_id_2": "request_id", ... }
   */
  async getBulkPendingJoinRequests(collectiveIds: string[]): Promise<Record<string, string>> {
    const response = await collective.post('join/requests/bulk/', {
      collective_ids: collectiveIds,
    });
    return response.data;
  },

  /**
   * Get paginated list of collectives
   * GET /api/collective/details/?page=<page>&page_size=<pageSize>
   */
  async getCollectives(page: number = 1, pageSize: number = 10): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: CollectiveListItem[];
  }> {
    const response = await collective.get('details/', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Get counts of pending join requests and admin requests for a collective
   * GET /api/collective/<collective_id>/requests/counts/
   */
  async getCollectiveRequestCounts(collectiveId: string): Promise<{
    join_requests_count: number;
    admin_requests_count: number;
    total_pending_requests: number;
  }> {
    const response = await collective.get(`${collectiveId}/requests/counts/`);
    return response.data;
  },

  /**
   * Get join requests for a collective (admin only)
   * GET /api/collective/<collective_id>/join/requests/?status=pending
   */
  async getJoinRequests(collectiveId: string, status: string = 'pending'): Promise<any[]> {
    const response = await collective.get(`${collectiveId}/join/requests/`, {
      params: { status },
    });
    return response.data;
  },

  /**
   * Process a join request (approve/reject)
   * POST /api/collective/join/requests/<request_id>/process/
   */
  async processJoinRequest(requestId: string, action: 'approve' | 'reject'): Promise<void> {
    await collective.post(`join/requests/${requestId}/process/`, {
      action,
    });
  },

  /**
   * Get admin requests for a collective (admin only)
   * GET /api/collective/<collective_id>/admin/requests/?status=pending
   */
  async getAdminRequests(collectiveId: string, status: string = 'pending'): Promise<any[]> {
    const response = await collective.get(`${collectiveId}/admin/requests/`, {
      params: { status },
    });
    return response.data;
  },

  /**
   * Process an admin request (approve/reject)
   * POST /api/collective/admin/requests/<request_id>/process/
   */
  async processAdminRequest(requestId: string, action: 'approve' | 'reject'): Promise<void> {
    await collective.post(`admin/requests/${requestId}/process/`, {
      action,
    });
  },

  /**
   * Get collectives for a specific user by user ID (public endpoint)
   * GET /api/collective/user/<user_id>/collectives/
   */
  async getUserCollectives(userId: number): Promise<{
    collective_id: string;
    title: string;
    picture: string;
    description: string;
    member_count: number;
    collective_role: string;
    created_at: string;
  }[]> {
    const response = await collective.get(`user/${userId}/collectives/`);
    return response.data;
  },
};

