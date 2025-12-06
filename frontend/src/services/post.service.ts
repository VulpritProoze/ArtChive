import { post } from '@lib/api';
import type { Critique, Comment, PostHeart, PostTrophy, PostPraise, PostMetaMap, Post, PostsResponse } from '@types';

export interface UpdateCritiqueData {
  text: string;
}

export interface UpdateCritiqueReplyData {
  text: string;
}

export interface CreatePostData {
  formData: FormData;
}

export interface UpdatePostData {
  postId: string;
  formData: FormData;
}

export interface DeletePostData {
  postId: string;
}

export interface HeartCountResponse {
  hearts_count: number;
  is_hearted_by_user: boolean;
}

export interface PraiseCountResponse {
  praise_count: number;
  is_praised_by_user: boolean;
}

export interface TrophyCountResponse {
  trophy_count: number;
  user_trophies: string[];
}

export interface CommentsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  total_comments?: number;
  results: Comment[];
}

export interface CritiqueResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Critique[];
}

export interface TrophiesResponse {
  results: PostTrophy[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface PraisesResponse {
  results: PostPraise[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface HeartsResponse {
  results: PostHeart[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const postService = {
  /**
   * Get posts list (paginated)
   * GET /api/post/?page=<page>&page_size=<pageSize>
   */
  async getPosts(page: number = 1, pageSize: number = 10): Promise<PostsResponse> {
    const response = await post.get('/', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Get user's posts by user ID (paginated)
   * GET /api/post/me/<userId>/?page=<page>&page_size=<pageSize>
   */
  async getUserPosts(userId: number, page: number = 1, pageSize: number = 10): Promise<PostsResponse> {
    const response = await post.get(`me/${userId}/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Get a single post by ID
   * GET /api/post/<postId>/
   */
  async getPost(postId: string): Promise<Post> {
    const response = await post.get(`/${postId}/`);
    return response.data;
  },

  /**
   * Create a new post
   * POST /api/post/create/
   */
  async createPost(data: CreatePostData): Promise<void> {
    await post.post('/create/', data.formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Update an existing post
   * PUT /api/post/update/<postId>/
   */
  async updatePost(data: UpdatePostData): Promise<void> {
    await post.put(`/update/${data.postId}/`, data.formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Delete a post
   * DELETE /api/post/delete/<postId>/
   */
  async deletePost(data: DeletePostData): Promise<void> {
    await post.delete(`/delete/${data.postId}/`, { data: { confirm: true } });
  },

  /**
   * Get bulk metadata for multiple posts
   * POST /api/post/bulk-meta/
   */
  async getBulkMeta(postIds: string[]): Promise<PostMetaMap> {
    const response = await post.post('/bulk-meta/', { post_ids: postIds });
    return response.data;
  },

  /**
   * Heart a post
   * POST /api/post/heart/react/
   */
  async heartPost(postId: string): Promise<void> {
    await post.post('heart/react/', { post_id: postId });
  },

  /**
   * Unheart a post
   * DELETE /api/post/<postId>/unheart/
   */
  async unheartPost(postId: string): Promise<void> {
    await post.delete(`${postId}/unheart/`);
  },

  /**
   * Get heart count for a post
   * GET /api/post/<postId>/hearts/count/
   */
  async getHeartCount(postId: string): Promise<HeartCountResponse> {
    const response = await post.get<HeartCountResponse>(`${postId}/hearts/count/`);
    return response.data;
  },

  /**
   * Praise a post
   * POST /api/post/praise/create/
   */
  async praisePost(postId: string): Promise<void> {
    await post.post('praise/create/', { post_id: postId });
  },

  /**
   * Get praise count for a post
   * GET /api/post/<postId>/praises/count/
   */
  async getPraiseCount(postId: string): Promise<PraiseCountResponse> {
    const response = await post.get<PraiseCountResponse>(`${postId}/praises/count/`);
    return response.data;
  },

  /**
   * Award a trophy to a post
   * POST /api/post/trophy/create/
   */
  async awardTrophy(data: { post_id: string; trophy_type: string }): Promise<void> {
    await post.post('/trophy/create/', data);
  },

  /**
   * Get trophy count for a post
   * GET /api/post/<postId>/trophies/count/
   */
  async getTrophyCount(postId: string): Promise<TrophyCountResponse> {
    const response = await post.get<TrophyCountResponse>(`${postId}/trophies/count/`);
    return response.data;
  },

  /**
   * Get comments for a post (paginated)
   * GET /api/post/posts/<postId>/comments/
   */
  async getComments(postId: string, page: number = 1, pageSize: number = 10): Promise<CommentsResponse> {
    const response = await post.get(`/posts/${postId}/comments/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Create a comment
   * POST /api/post/comment/create/
   */
  async createComment(data: { text: string; post_id: string }): Promise<Comment> {
    const response = await post.post<Comment>('/comment/create/', data);
    return response.data;
  },

  /**
   * Update a comment
   * PUT /api/post/comment/update/<commentId>/
   */
  async updateComment(commentId: string, text: string): Promise<Comment> {
    const response = await post.put<Comment>(`/comment/update/${commentId}/`, { text });
    return response.data;
  },

  /**
   * Delete a comment
   * DELETE /api/post/comment/delete/<commentId>/
   */
  async deleteComment(commentId: string): Promise<void> {
    await post.delete(`/comment/delete/${commentId}/`, { data: { confirm: true } });
  },

  /**
   * Get replies for a comment (paginated)
   * GET /api/post/comment/<commentId>/replies/
   */
  async getReplies(commentId: string, page: number = 1, pageSize: number = 10): Promise<CommentsResponse> {
    const response = await post.get(`/comment/${commentId}/replies/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Create a reply to a comment
   * POST /api/post/comment/reply/create/
   */
  async createReply(data: { text: string; replies_to: string; post_id: string }): Promise<Comment> {
    const response = await post.post<Comment>('/comment/reply/create/', data);
    return response.data;
  },

  /**
   * Update a reply
   * PUT /api/post/comment/reply/update/<replyId>/
   */
  async updateReply(replyId: string, text: string): Promise<Comment> {
    const response = await post.put<Comment>(`/comment/reply/update/${replyId}/`, { text });
    return response.data;
  },

  /**
   * Get critiques for a post (paginated)
   * GET /api/post/<postId>/critiques/
   */
  async getCritiques(postId: string, page: number = 1, pageSize: number = 10): Promise<CritiqueResponse> {
    const response = await post.get(`/${postId}/critiques/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Get critiques for a gallery (paginated)
   * Note: This endpoint doesn't exist yet, but we can reuse the post endpoint structure
   * For now, we'll need to create a gallery-specific endpoint or extend the existing one
   * GET /api/gallery/<galleryId>/critiques/ (to be implemented)
   * For MVP, we can filter critiques by gallery_id on the backend
   */
  async getGalleryCritiques(galleryId: string, page: number = 1, pageSize: number = 10): Promise<CritiqueResponse> {
    // TODO: Create backend endpoint for gallery critiques
    // For now, we'll need to fetch all critiques and filter client-side, or create the endpoint
    // This is a placeholder - backend needs to implement GET /api/gallery/<galleryId>/critiques/
    const response = await post.get(`/critique/list/`, {
      params: { gallery_id: galleryId, page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Create a critique (supports both post and gallery)
   * POST /api/post/critique/create/
   */
  async createCritique(data: { text: string; impression: string; post_id?: string; gallery_id?: string }): Promise<void> {
    await post.post('/critique/create/', data);
  },

  /**
   * Update an existing critique (text only, impression cannot be changed)
   * PUT /api/post/critique/<critiqueId>/update/
   */
  async updateCritique(
    critiqueId: string,
    data: UpdateCritiqueData
  ): Promise<Critique> {
    const response = await post.put(`/critique/${critiqueId}/update/`, data);
    return response.data;
  },

  /**
   * Delete a critique
   * DELETE /api/post/critique/<critiqueId>/delete/
   */
  async deleteCritique(critiqueId: string): Promise<void> {
    await post.delete(`/critique/${critiqueId}/delete/`, {
      data: { confirm: true },
    });
  },

  /**
   * Get replies for a critique
   * GET /api/post/critique/<critiqueId>/replies/
   */
  async getCritiqueReplies(critiqueId: string): Promise<Comment[]> {
    const response = await post.get(`/critique/${critiqueId}/replies/`);
    return response.data.results || [];
  },

  /**
   * Create a reply to a critique
   * POST /api/post/critique/reply/create/
   */
  async createCritiqueReply(data: { critique_id: string; text: string }): Promise<void> {
    await post.post('/critique/reply/create/', data);
  },

  /**
   * Update an existing critique reply (text only)
   * PUT /api/post/critique/reply/<commentId>/update/
   */
  async updateCritiqueReply(
    commentId: string,
    data: UpdateCritiqueReplyData
  ): Promise<Comment> {
    const response = await post.put(`/critique/reply/${commentId}/update/`, data);
    return response.data;
  },

  /**
   * Delete a critique reply
   * DELETE /api/post/comment/delete/<commentId>/
   */
  async deleteCritiqueReply(commentId: string): Promise<void> {
    await post.delete(`/comment/delete/${commentId}/`, {
      data: { confirm: true }
    });
  },

  /**
   * Get trophies for a post (paginated)
   * GET /api/post/<postId>/trophies/
   */
  async getPostTrophies(postId: string, page: number = 1, pageSize: number = 20): Promise<TrophiesResponse> {
    const response = await post.get(`/${postId}/trophies/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Get praises for a post (paginated)
   * GET /api/post/<postId>/praises/
   */
  async getPostPraises(postId: string, page: number = 1, pageSize: number = 20): Promise<PraisesResponse> {
    const response = await post.get(`/${postId}/praises/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Fetch all users who hearted a specific post (paginated)
   * GET /api/post/<postId>/hearts/
   */
  async getPostHearts(postId: string, page: number = 1, pageSize: number = 20): Promise<HeartsResponse> {
    const response = await post.get(`/${postId}/hearts/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Fetch comment with its parent/replies context for navigation
   * GET /api/post/comment/<commentId>/with-context/
   */
  async getCommentWithContext(commentId: string): Promise<any> {
    const response = await post.get(`/comment/${commentId}/with-context/`);
    return response.data;
  },

  /**
   * Fetch critique with its replies context for navigation
   * GET /api/post/critique/<critiqueId>/with-context/
   */
  async getCritiqueWithContext(critiqueId: string): Promise<any> {
    const response = await post.get(`/critique/${critiqueId}/with-context/`);
    return response.data;
  },

  /**
   * Get global top posts
   * GET /api/posts/top/?limit=<limit>&post_type=<post_type>
   */
  async getTopPosts(limit: number = 25, postType?: string): Promise<{ results: Post[]; count: number; limit: number; post_type?: string }> {
    const params: { limit: number; post_type?: string } = { limit };
    if (postType) {
      params.post_type = postType;
    }
    const response = await post.get('/top/', { params });
    return response.data;
  },
};

