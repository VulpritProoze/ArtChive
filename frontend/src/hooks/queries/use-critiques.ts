import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { postService, type CritiqueResponse } from '@services/post.service';
import type { Comment } from '@types';

export type { CritiqueResponse };

interface UseCritiquesOptions {
  enabled?: boolean;
  pageSize?: number;
}

export const useCritiques = (
  targetId: string,
  targetType: 'post' | 'gallery' = 'post',
  options: UseCritiquesOptions = {}
) => {
  const { enabled = true, pageSize = 10 } = options;

  return useInfiniteQuery<CritiqueResponse>({
    queryKey: ['critiques', targetType, targetId],
    queryFn: ({ pageParam = 1 }) => {
      if (targetType === 'gallery') {
        return postService.getGalleryCritiques(targetId, pageParam as number, pageSize);
      }
      return postService.getCritiques(targetId, pageParam as number, pageSize);
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(targetId),
  });
};

export const useCreateCritique = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { 
      text: string; 
      impression: string; 
      post_id?: string; 
      gallery_id?: string;
      targetType?: 'post' | 'gallery';
    }) => {
      await postService.createCritique(payload);
      const targetId = payload.post_id || payload.gallery_id || '';
      const targetType = payload.targetType || (payload.post_id ? 'post' : 'gallery');
      return { targetId, targetType };
    },
    onSuccess: ({ targetId, targetType }) => {
      queryClient.invalidateQueries({ queryKey: ['critiques', targetType, targetId] });
    },
  });
};

export const useUpdateCritique = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      critiqueId: string; 
      text: string; 
      postId?: string;
      galleryId?: string;
      targetType?: 'post' | 'gallery';
    }) => {
      const { critiqueId, text } = input;
      await postService.updateCritique(critiqueId, { text });
      return input;
    },
    onSuccess: ({ postId, galleryId, targetType }) => {
      const targetId = postId || galleryId || '';
      const type = targetType || (postId ? 'post' : 'gallery');
      queryClient.invalidateQueries({ queryKey: ['critiques', type, targetId] });
    },
  });
};

export const useDeleteCritique = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      critiqueId: string; 
      postId?: string;
      galleryId?: string;
      targetType?: 'post' | 'gallery';
    }) => {
      const { critiqueId } = input;
      await postService.deleteCritique(critiqueId);
      return input;
    },
    onSuccess: ({ postId, galleryId, targetType }) => {
      const targetId = postId || galleryId || '';
      const type = targetType || (postId ? 'post' : 'gallery');
      queryClient.invalidateQueries({ queryKey: ['critiques', type, targetId] });
    },
  });
};

interface UseCritiqueRepliesOptions {
  enabled?: boolean;
}

export const useCritiqueReplies = (critiqueId: string, options: UseCritiqueRepliesOptions = {}) => {
  const { enabled = false } = options;

  return useQuery<Comment[]>({
    queryKey: ['critiqueReplies', critiqueId],
    queryFn: () => {
      return postService.getCritiqueReplies(critiqueId);
    },
    enabled: enabled && Boolean(critiqueId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCritiqueReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      critiqueId: string; 
      postId?: string;
      galleryId?: string;
      targetType?: 'post' | 'gallery';
      text: string;
    }) => {
      const { critiqueId, text } = input;
      await postService.createCritiqueReply({ critique_id: critiqueId, text });
      return input;
    },
    onSuccess: ({ critiqueId, postId, galleryId, targetType }) => {
      queryClient.invalidateQueries({ queryKey: ['critiqueReplies', critiqueId] });
      const targetId = postId || galleryId || '';
      const type = targetType || (postId ? 'post' : 'gallery');
      queryClient.invalidateQueries({ queryKey: ['critiques', type, targetId] });
    },
  });
};

export const useUpdateCritiqueReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      replyId: string; 
      critiqueId: string; 
      postId?: string;
      galleryId?: string;
      targetType?: 'post' | 'gallery';
      text: string;
    }) => {
      const { replyId, text } = input;
      await postService.updateCritiqueReply(replyId, { text });
      return input;
    },
    onSuccess: ({ critiqueId, postId, galleryId, targetType }) => {
      queryClient.invalidateQueries({ queryKey: ['critiqueReplies', critiqueId] });
      const targetId = postId || galleryId || '';
      const type = targetType || (postId ? 'post' : 'gallery');
      queryClient.invalidateQueries({ queryKey: ['critiques', type, targetId] });
    },
  });
};

export const useDeleteCritiqueReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      replyId: string; 
      critiqueId: string; 
      postId?: string;
      galleryId?: string;
      targetType?: 'post' | 'gallery';
    }) => {
      const { replyId } = input;
      await postService.deleteCritiqueReply(replyId);
      return input;
    },
    onSuccess: ({ critiqueId, postId, galleryId, targetType }) => {
      queryClient.invalidateQueries({ queryKey: ['critiqueReplies', critiqueId] });
      const targetId = postId || galleryId || '';
      const type = targetType || (postId ? 'post' : 'gallery');
      queryClient.invalidateQueries({ queryKey: ['critiques', type, targetId] });
    },
  });
};

