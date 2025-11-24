import { post } from '@lib/api';
import type { Critique, Comment, PostHeart } from '@types';

export interface UpdateCritiqueData {
  text: string;
}

export interface UpdateCritiqueReplyData {
  text: string;
}

export const postService = {
  /**
   * Update an existing critique (text only, impression cannot be changed)
   */
  async updateCritique(
    critiqueId: string,
    data: UpdateCritiqueData
  ): Promise<Critique> {
    const response = await post.put(`/critique/${critiqueId}/update/`, data);
    return response.data;
  },

  /**
   * Update an existing critique reply (text only)
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
   */
  async deleteCritiqueReply(commentId: string): Promise<void> {
    await post.delete(`/comment/delete/${commentId}/`, {
      data: { confirm: true }
    });
  },

  /**
   * Fetch all users who hearted a specific post
   */
  async getPostHearts(postId: string): Promise<PostHeart[]> {
    const response = await post.get(`/${postId}/hearts/`);
    return response.data;
  },

  /**
   * Fetch comment with its parent/replies context for navigation
   */
  async getCommentWithContext(commentId: string): Promise<any> {
    const response = await post.get(`/comment/${commentId}/with-context/`);
    return response.data;
  },

  /**
   * Fetch critique with its replies context for navigation
   */
  async getCritiqueWithContext(critiqueId: string): Promise<any> {
    const response = await post.get(`/critique/${critiqueId}/with-context/`);
    return response.data;
  },
};

