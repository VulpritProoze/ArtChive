import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { post } from '@lib/api';
import type { Critique, Comment } from '@types';

interface CritiqueResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Critique[];
}

interface UseCritiquesOptions {
  enabled?: boolean;
  pageSize?: number;
}

export const useCritiques = (postId: string, options: UseCritiquesOptions = {}) => {
  const { enabled = true, pageSize = 10 } = options;

  return useInfiniteQuery<CritiqueResponse>({
    queryKey: ['critiques', postId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await post.get(`/${postId}/critiques/`, {
        params: { page: pageParam, page_size: pageSize },
      });
      return response.data;
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
      await post.post('/critique/create/', payload);
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
      await post.put(`/critique/${critiqueId}/update/`, { text });
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
      await post.delete(`/critique/${critiqueId}/delete/`, {
        data: { confirm: true },
      });
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
    queryFn: async () => {
      const response = await post.get(`/critique/${critiqueId}/replies/`);
      return response.data.results || [];
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
      await post.post('/critique/reply/create/', {
        critique_id: critiqueId,
        text,
      });
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
      await post.put(`/critique/reply/${replyId}/update/`, { text });
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
      await post.delete(`/comment/delete/${replyId}/`, {
        data: { confirm: true },
      });
      return input;
    },
    onSuccess: ({ critiqueId, postId }) => {
      queryClient.invalidateQueries({ queryKey: ['critiqueReplies', critiqueId] });
      queryClient.invalidateQueries({ queryKey: ['critiques', postId] });
    },
  });
};

