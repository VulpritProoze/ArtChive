import { gallery } from '@lib/api';
import type { CanvasState } from '@types';
import type { AxiosProgressEvent } from 'axios';

export interface Gallery {
  gallery_id: string;
  title: string;
  description: string;
  status: string;
  picture: string;
  canvas_json?: CanvasState | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  creator: string;
}

export interface CreateGalleryData {
  title: string;
  description?: string;
  status?: string;
}

export interface UpdateGalleryData {
  title?: string;
  description?: string;
  status?: string;
  canvas_json?: CanvasState;
  picture?: string;
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
    const response = await gallery.post('', data);
    return response.data;
  },

  /**
   * Get a single gallery by ID
   */
  async getGallery(galleryId: string): Promise<Gallery> {
    const response = await gallery.get(`${galleryId}/`);
    return response.data;
  },

  /**
   * Update an existing gallery
   */
  async updateGallery(
    galleryId: string,
    data: UpdateGalleryData
  ): Promise<Gallery> {
    const response = await gallery.patch(`${galleryId}/`, data);
    return response.data;
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
   * List all galleries for the current user
   */
  async listGalleries(): Promise<Gallery[]> {
    console.log('[galleryService] listGalleries called');
    console.log('[galleryService] Making GET request to: ""');

    const response = await gallery.get('');

    console.log('[galleryService] listGalleries response:', {
      status: response.status,
      dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
      count: Array.isArray(response.data) ? response.data.length : 'N/A',
      data: response.data,
    });

    return response.data;
  },
};
