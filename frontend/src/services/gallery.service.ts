import { gallery } from '@lib/api';
import type { CanvasState, Comment } from '@types';
import type { PaginatedGalleryListResponse } from '@types';
import type { AxiosProgressEvent } from 'axios';

export interface CommentsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  total_comments?: number;
  results: Comment[];
}

export interface CreatorDetails {
  id: number;
  username: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  profile_picture: string | null;
  artist_types: string[];
  brush_drips_count: number;
  reputation: number;
}

export interface Gallery {
  gallery_id: string;
  title: string;
  description: string;
  status: string;
  picture: string;
  canvas_json?: CanvasState | null;
  canvas_width: number;
  canvas_height: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  creator: string;
  creator_details?: CreatorDetails;
}

export interface CreateGalleryData {
  title: string;
  description?: string;
  status?: string;
  picture?: File;
  canvas_width?: number;
  canvas_height?: number;
}

export interface UpdateGalleryData {
  title?: string;
  description?: string;
  status?: string;
  canvas_json?: CanvasState;
  picture?: string | File;
  canvas_width?: number;
  canvas_height?: number;
}

export interface PaginatedGalleryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Gallery[];
}

export const galleryService = {
  /**
   * Upload an image to the gallery media endpoint
   */
  async uploadImage(
    file: File,
    onProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await gallery.post('media/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });

    return response.data.url;
  },

  /**
   * Create a new gallery
   */
  async createGallery(data: CreateGalleryData): Promise<Gallery> {
    // If picture is included, use FormData for multipart upload
    if (data.picture) {
      const formData = new FormData();
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      if (data.status) formData.append('status', data.status);
      if (data.canvas_width) formData.append('canvas_width', data.canvas_width.toString());
      if (data.canvas_height) formData.append('canvas_height', data.canvas_height.toString());
      formData.append('picture', data.picture);

      const response = await gallery.post('', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // Regular JSON request if no picture
      const response = await gallery.post('', data);
      return response.data;
    }
  },

  /**
   * Get a single gallery by ID
   * For published galleries, use getPublicGallery instead
   */
  async getGallery(galleryId: string): Promise<Gallery> {
    const response = await gallery.get(`${galleryId}/`);
    return response.data;
  },

  /**
   * Get a published gallery by ID (public endpoint)
   */
  async getPublicGallery(galleryId: string): Promise<Gallery> {
    const response = await gallery.get(`${galleryId}/public/`);
    return response.data;
  },

  /**
   * Update an existing gallery
   */
  async updateGallery(
    galleryId: string,
    data: UpdateGalleryData
  ): Promise<Gallery> {
    // If picture is a File, use FormData for multipart upload
    if (data.picture instanceof File) {
      const formData = new FormData();
      if (data.title !== undefined) formData.append('title', data.title);
      if (data.description !== undefined) formData.append('description', data.description);
      if (data.status !== undefined) formData.append('status', data.status);
      if (data.canvas_width !== undefined) formData.append('canvas_width', data.canvas_width.toString());
      if (data.canvas_height !== undefined) formData.append('canvas_height', data.canvas_height.toString());
      if (data.canvas_json !== undefined) formData.append('canvas_json', JSON.stringify(data.canvas_json));
      formData.append('picture', data.picture);

      const response = await gallery.patch(`${galleryId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // Regular JSON request
      const response = await gallery.patch(`${galleryId}/`, data);
      return response.data;
    }
  },

  /**
   * Save gallery canvas state
   */
  async saveGallery(
    galleryId: string,
    canvasData: CanvasState
  ): Promise<Gallery> {
    console.log('[galleryService] saveGallery called:', {
      galleryId,
      objectCount: canvasData.objects.length,
      canvasData,
    });

    const payload = { canvas_json: canvasData };
    console.log('[galleryService] Making PATCH request to:', `${galleryId}/`);
    console.log('[galleryService] Payload:', JSON.stringify(payload, null, 2));

    const response = await gallery.patch(`${galleryId}/`, payload);
    console.log('[galleryService] Response received:', response.data);
    return response.data;
  },

  /**
   * Delete a gallery (soft delete)
   */
  async deleteGallery(galleryId: string): Promise<void> {
    await gallery.delete(`${galleryId}/`);
  },

  /**
   * List all galleries (paginated, public)
   */
  async listGalleries(
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedGalleryListResponse> {
    const response = await gallery.get('list/', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Get top galleries (cached, ranked)
   */
  async getTopGalleries(limit: number = 25): Promise<PaginatedGalleryListResponse> {
    const response = await gallery.get('top/', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * List all galleries for current user
   */
  async userListGalleries(): Promise<Gallery[]> {
    const response = await gallery.get(`user/`);
    return response.data;
  },

  /**
   * Update only the status of a gallery
   */
  async updateGalleryStatus(
    galleryId: string,
    status: 'draft' | 'active' | 'archived'
  ): Promise<Gallery> {
    const response = await gallery.patch(`${galleryId}/status/`, { status });
    return response.data;
  },

  /**
   * Get active gallery by user ID
   */
  async getActiveGalleryByUserId(userId: number): Promise<Gallery> {
    const response = await gallery.get(`user/${userId}/active/`);
    return response.data;
  },

  /**
   * Check if a user has an active gallery
   */
  async hasActiveGallery(userId: number): Promise<{ has_active: boolean }> {
    const response = await gallery.get(`user/${userId}/has-active/`);
    return response.data;
  },

  /**
   * Get comments for a gallery (paginated)
   * GET /api/gallery/<galleryId>/comments/
   */
  async getGalleryComments(
    galleryId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<CommentsResponse> {
    const response = await gallery.get(`${galleryId}/comments/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Create a gallery comment
   * POST /api/gallery/comment/create/
   */
  async createGalleryComment(data: { text: string; gallery: string }): Promise<Comment> {
    const response = await gallery.post<Comment>('comment/create/', data);
    return response.data;
  },

  /**
   * Update a gallery comment
   * PUT /api/gallery/comment/<commentId>/update/
   */
  async updateGalleryComment(commentId: string, text: string): Promise<Comment> {
    const response = await gallery.put<Comment>(`comment/${commentId}/update/`, { text });
    return response.data;
  },

  /**
   * Delete a gallery comment
   * DELETE /api/gallery/comment/<commentId>/delete/
   */
  async deleteGalleryComment(commentId: string): Promise<void> {
    await gallery.delete(`comment/${commentId}/delete/`, { data: { confirm: true } });
  },

  /**
   * Get replies for a gallery comment (paginated)
   * GET /api/gallery/comment/<commentId>/replies/
   */
  async getGalleryCommentReplies(
    commentId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<CommentsResponse> {
    const response = await gallery.get(`comment/${commentId}/replies/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Create a reply to a gallery comment
   * POST /api/gallery/comment/reply/create/
   */
  async createGalleryCommentReply(data: { text: string; replies_to: string }): Promise<Comment> {
    const response = await gallery.post<Comment>('comment/reply/create/', data);
    return response.data;
  },

  /**
   * Get awards for a gallery (paginated)
   * GET /api/gallery/<galleryId>/awards/
   */
  async getGalleryAwards(
    galleryId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: Array<{
      id: number;
      gallery_id: string;
      author: number;
      author_username: string;
      author_picture: string | null;
      gallery_title: string;
      award_type: string;
      brush_drip_value: number;
      awarded_at: string;
      is_deleted: boolean;
    }>;
  }> {
    const response = await gallery.get(`${galleryId}/awards/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Create a gallery award
   * POST /api/gallery/award/create/
   */
  async createGalleryAward(data: { gallery_id: string; award_type: string }): Promise<void> {
    await gallery.post('award/create/', data);
  },

  /**
   * Delete a gallery award
   * DELETE /api/gallery/award/<awardId>/delete/
   */
  async deleteGalleryAward(awardId: number): Promise<void> {
    await gallery.delete(`award/${awardId}/delete/`);
  },

  /**
   * Get awards for multiple galleries in bulk
   * POST /api/gallery/awards/bulk/
   */
  async getBulkGalleryAwards(galleryIds: string[]): Promise<Record<string, Record<string, number>>> {
    const response = await gallery.post('awards/bulk/', { gallery_ids: galleryIds });
    return response.data;
  },
};
