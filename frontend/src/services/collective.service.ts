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

export const collectiveService = {
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
};

