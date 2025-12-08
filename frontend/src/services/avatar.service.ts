import api from '@lib/api';

export interface Avatar {
  avatar_id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  is_primary: boolean;
  canvas_json?: CanvasJSON;
  rendered_image?: string;
  thumbnail?: string;
  created_at: string;
  updated_at: string;
}

export interface CanvasJSON {
  width: number;
  height: number;
  background: string;
  objects: CanvasObject[];
}

export interface CanvasObject {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'image' | 'line' | 'group';
  [key: string]: any;
}

export interface CreateAvatarData {
  name: string;
  description?: string;
  canvas_json?: CanvasJSON;
  status?: 'draft' | 'active' | 'archived';
}

export interface UpdateAvatarData {
  name?: string;
  description?: string;
  canvas_json?: CanvasJSON;
  status?: 'draft' | 'active' | 'archived';
}

export interface DuplicateAvatarData {
  name?: string;
}

class AvatarService {
  /**
   * Get all avatars for the current user
   */
  async list(): Promise<Avatar[]> {
    const response = await api.get('/api/avatar/');
    return response.data;
  }

  /**
   * Get a single avatar by ID with full canvas data
   */
  async get(avatarId: string): Promise<Avatar> {
    const response = await api.get(`/api/avatar/${avatarId}/`);
    return response.data;
  }

  /**
   * Create a new avatar
   * Accepts either CreateAvatarData (JSON) or FormData (with thumbnail image)
   */
  async create(data: CreateAvatarData | FormData): Promise<Avatar> {
    const isFormData = data instanceof FormData;
    const config = isFormData 
      ? {} // Let axios set Content-Type automatically for FormData (includes boundary)
      : { headers: { 'Content-Type': 'application/json' } };
    
    const response = await api.post('/api/avatar/', data, config);
    return response.data;
  }

  /**
   * Update an existing avatar
   * Accepts either UpdateAvatarData (JSON) or FormData (with thumbnail image)
   */
  async update(avatarId: string, data: UpdateAvatarData | FormData): Promise<Avatar> {
    const isFormData = data instanceof FormData;
    const config = isFormData 
      ? {} // Let axios set Content-Type automatically for FormData (includes boundary)
      : { headers: { 'Content-Type': 'application/json' } };
    
    const response = await api.patch(`/api/avatar/${avatarId}/`, data, config);
    return response.data;
  }

  /**
   * Soft delete an avatar
   */
  async delete(avatarId: string): Promise<void> {
    await api.delete(`/api/avatar/${avatarId}/`);
  }

  /**
   * Set an avatar as the primary avatar
   */
  async setPrimary(avatarId: string): Promise<{ message: string; avatar_id: string }> {
    const response = await api.post(`/api/avatar/${avatarId}/set-primary/`);
    return response.data;
  }

  /**
   * Duplicate an avatar
   */
  async duplicate(avatarId: string, data?: DuplicateAvatarData): Promise<Avatar> {
    const response = await api.post(`/api/avatar/${avatarId}/duplicate/`, data || {});
    return response.data;
  }

  /**
   * Trigger avatar rendering (generate images from canvas)
   */
  async render(avatarId: string): Promise<{ message: string; avatar_id: string; rendered_image?: string; thumbnail?: string }> {
    const response = await api.post(`/api/avatar/${avatarId}/render/`);
    return response.data;
  }
}

export const avatarService = new AvatarService();

