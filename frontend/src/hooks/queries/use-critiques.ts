import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { postService, type CritiqueResponse } from '@services/post.service';
import type { Comment } from '@types';

export type { CritiqueResponse };

interface UseCritiquesOptions {
  enabled?: boolean;
  pageSize?: number;
}

export const useCritiques = (postId: string, options: UseCritiquesOptions = {}) => {
  const { enabled = true, pageSize = 10 } = options;

  return useInfiniteQuery<CritiqueResponse>({
    queryKey: ['critiques', postId],
    queryFn: ({ pageParam = 1 }) => {
      return postService.getCritiques(postId, pageParam as number, pageSize);
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(postId),
  });
};

export const useCreateCritique = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { text: string; impression: string; post_id: string }) => {
      await postService.createCritique(payload);
      return payload.post_id;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: ['critiques', postId] });
    },
  });
};

export const useUpdateCritique = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { critiqueId: string; text: string; postId: string }) => {
      const { critiqueId, text } = input;
      await postService.updateCritique(critiqueId, { text });
      return input;
    },
    onSuccess: ({ postId }) => {
      queryClient.invalidateQueries({ queryKey: ['critiques', postId] });
    },
  });
};

export const useDeleteCritique = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { critiqueId: string; postId: string }) => {
      const { critiqueId } = input;
      await postService.deleteCritique(critiqueId);
      return input;
    },
    onSuccess: ({ postId }) => {
      queryClient.invalidateQueries({ queryKey: ['critiques', postId] });
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
    mutationFn: async (input: { critiqueId: string; postId: string; text: string }) => {
      const { critiqueId, text } = input;
      await postService.createCritiqueReply({ critique_id: critiqueId, text });
      return input;
    },
    onSuccess: ({ critiqueId, postId }) => {
      queryClient.invalidateQueries({ queryKey: ['critiqueReplies', critiqueId] });
      queryClient.invalidateQueries({ queryKey: ['critiques', postId] });
    },
  });
};

export const useUpdateCritiqueReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { replyId: string; critiqueId: string; postId: string; text: string }) => {
      const { replyId, text } = input;
      await postService.updateCritiqueReply(replyId, { text });
      return input;
    },
    onSuccess: ({ critiqueId, postId }) => {
      queryClient.invalidateQueries({ queryKey: ['critiqueReplies', critiqueId] });
      queryClient.invalidateQueries({ queryKey: ['critiques', postId] });
    },
  });
};

export const useDeleteCritiqueReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { replyId: string; critiqueId: string; postId: string }) => {
      const { replyId } = input;
      await postService.deleteCritiqueReply(replyId);
      return input;
    },
    onSuccess: ({ critiqueId, postId }) => {
      queryClient.invalidateQueries({ queryKey: ['critiqueReplies', critiqueId] });
      queryClient.invalidateQueries({ queryKey: ['critiques', postId] });
    },
  });
};

