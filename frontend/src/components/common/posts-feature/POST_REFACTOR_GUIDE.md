# Post System Refactor Guide

This guide outlines the complete refactor of the post system from Context API to React Query for better caching, performance, and maintainability.

## 🎯 Key Changes (Updated Plan)

### 🚨 CRITICAL BUG FIX (Do This First!)
**Infinite Query Loop**: The collective endpoint is being queried infinitely. 

**Immediate Fix** (1 line change):
```typescript
// File: frontend/src/components/collective/inside-collective.component.tsx (line 90)
// CHANGE THIS:
}, [collectiveId, fetchCollectiveData]);

// TO THIS:
}, [collectiveId]); // Remove fetchCollectiveData from dependencies
```

**Proper Fix**: See section 2 below - create `use-collective-data.ts` hook.

### Backend Optimization
1. **Remove unnecessary prefetching**: Stop prefetching comments, hearts, praises, and trophies in post list views
2. **Keep only counts**: Use database annotations to get counts without fetching full objects
3. **Faster queries**: Reduce database load by eliminating N+1 queries

### Frontend Simplification
1. **Remove comment previews**: Post cards show only counts, not comment previews
2. **Remove tabbed modal**: Delete `post-view.modal.tsx` - use dedicated detail page instead
3. **Move add comment button**: Place directly on post card for better UX
4. **Implement reply pagination**: Update `useReplies` to support infinite scroll
5. **Create list hooks**: Add React Query hooks for trophy/praise/heart lists
6. **Fix collective data fetching**: Use React Query hook instead of context-based fetching

## Backend Changes

### 1. Optimize Post List View - Remove Unnecessary Prefetching

**File: `backend/post/views.py`** (lines 141-227)

**CRITICAL CHANGE**: Remove prefetching of comments, hearts, praises, and trophies. Only fetch **counts** via annotations.

**Before (REMOVE):**
- `comments_prefetch` - Remove this entire Prefetch
- `'post_heart'` prefetch - Remove
- `'post_praise'` prefetch - Remove  
- `'post_trophy'` prefetch - Remove
- `'post_trophy__post_trophy_type'` prefetch - Remove

**After (KEEP ONLY COUNTS):**

```python
def get_queryset(self):
    user = self.request.user

    # Build base queryset with COUNT annotations only (no prefetching)
    queryset = Post.objects.get_active_objects().annotate(
        # Annotate comment count to avoid separate COUNT queries (exclude critique replies)
        total_comment_count=Count(
            'post_comment',
            filter=Q(post_comment__is_deleted=False, post_comment__is_critique_reply=False)
        ),
        # Annotate hearts count to avoid separate COUNT queries
        total_hearts_count=Count('post_heart', distinct=True),
        total_praise_count=Count('post_praise', distinct=True),
        total_trophy_count=Count('post_trophy', distinct=True),
    ).prefetch_related(
        'novel_post',  # Keep - needed for novel posts
        'channel',
        'channel__collective',  # needed for collective filtering
        # REMOVED: comments_prefetch
        # REMOVED: 'post_heart'
        # REMOVED: 'post_praise'
        # REMOVED: 'post_trophy'
        # REMOVED: 'post_trophy__post_trophy_type'
    ).select_related(
        'author',
        'author__artist',  # Fetch artist info for post author
    ).order_by('-created_at')

    # If user is authenticated, annotate whether they hearted/praised/awarded each post
    if user.is_authenticated:
        queryset = queryset.annotate(
            is_hearted_by_current_user=Exists(
                PostHeart.objects.filter(
                    post_id=OuterRef('pk'),
                    author=user
                )
            ),
            is_praised_by_current_user=Exists(
                PostPraise.objects.filter(
                    post_id=OuterRef('pk'),
                    author=user
                )
            ),
            user_trophies_for_post=ArrayAgg(
                'post_trophy__post_trophy_type__trophy',
                filter=Q(post_trophy__author=user),
                distinct=True
            ),
        )
        # ... rest of filtering logic
```

**File: `backend/collective/views.py`** (lines 256-267)

Apply the same optimization to `InsideCollectivePostsView.get_queryset()`:

```python
def get_queryset(self):
    channel_id = self.kwargs['channel_id']
    channel = get_object_or_404(Channel, channel_id=channel_id)
    user = self.request.user
    
    queryset = Post.objects.get_active_objects().filter(channel=channel).annotate(
        total_comment_count=Count(
            'post_comment',
            filter=Q(post_comment__is_deleted=False, post_comment__is_critique_reply=False)
        ),
        total_hearts_count=Count('post_heart', distinct=True),
        total_praise_count=Count('post_praise', distinct=True),
        total_trophy_count=Count('post_trophy', distinct=True),
    ).prefetch_related(
        'novel_post',
    ).select_related(
        'author',
        'author__artist',
    )
    
    if user.is_authenticated:
        queryset = queryset.annotate(
            is_hearted_by_current_user=Exists(
                PostHeart.objects.filter(post_id=OuterRef('pk'), author=user)
            ),
            is_praised_by_current_user=Exists(
                PostPraise.objects.filter(post_id=OuterRef('pk'), author=user)
            ),
            user_trophies_for_post=ArrayAgg(
                'post_trophy__post_trophy_type__trophy',
                filter=Q(post_trophy__author=user),
                distinct=True
            ),
        )
    
    return queryset.order_by('-created_at')
```

**File: `backend/post/serializers.py`** (lines 360-463)

**CRITICAL CHANGE**: `PostViewSerializer` already has the count fields. Update `get_trophy_counts_by_type` to work without prefetched data:

```python
def get_trophy_counts_by_type(self, obj):
    """Calculate trophy counts by type - use annotation if available, otherwise query"""
    # If we have annotated counts, we need to query trophies to get type breakdown
    # Since we removed prefetching, always use the fallback query
    counts = {}
    aggregates = obj.post_trophy.values('post_trophy_type__trophy').annotate(count=Count('id'))
    for row in aggregates:
        counts[row['post_trophy_type__trophy']] = row['count']
    
    # Fill in missing trophy types with 0
    for trophy_type in TrophyType.objects.all():
        counts.setdefault(trophy_type.trophy, 0)
    return counts
```

**File: `backend/post/serializers.py`** (lines 470-504)

**REMOVE** `PostListViewSerializer.get_comments()` method entirely. Remove the `comments` field from `PostListViewSerializer`:

```python
class PostListViewSerializer(PostViewSerializer):
    # REMOVED: comments = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = '__all__'
    
    # REMOVED: def get_comments(self, obj):
    #   ... entire method removed
```

**Note**: The `PostViewSerializer` base class already includes all count fields (`praise_count`, `trophy_counts_by_type`, `hearts_count`, `comment_count`) via `SerializerMethodField`, which will use the annotated counts from the queryset.

### 2. Frontend: Create React Query Hook for Collective Data (CRITICAL BUG FIX)

**CRITICAL BUG**: The collective endpoint `/api/collective/{collectiveId}/` is being queried infinitely due to `fetchCollectiveData` being in a `useEffect` dependency array.

**File: `frontend/src/components/collective/inside-collective.component.tsx`** (line 90)

**Current (BROKEN):**
```typescript
useEffect(() => {
  fetchCollectiveData(collectiveId);
  // ...
}, [collectiveId, fetchCollectiveData]); // ❌ fetchCollectiveData changes on every render!
```

**Fix 1 (Immediate):** Remove `fetchCollectiveData` from dependency array:
```typescript
useEffect(() => {
  if (collectiveId) {
    fetchCollectiveData(collectiveId);
  }
  setHeroImageError(false);
  hasAutoSelectedChannel.current = false;
}, [collectiveId]); // ✅ Only depend on collectiveId
```

**Fix 2 (Proper Solution):** Create React Query hook for collective data.

**New File: `frontend/src/hooks/queries/use-collective-data.ts`**

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collective } from '@lib/api';
import type { Collective } from '@types';

interface CollectiveDataResponse extends Collective {
  channels: Array<{
    channel_id: string;
    title: string;
    description: string;
    channel_type: string;
    posts_count: number;
  }>;
  members: Array<{
    // member data
  }>;
  member_count: number;
}

export const useCollectiveData = (collectiveId: string | undefined) => {
  return useQuery<CollectiveDataResponse>({
    queryKey: ['collective-data', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('Collective ID is required');
      const response = await collective.get(`${collectiveId}/`);
      return response.data;
    },
    enabled: Boolean(collectiveId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

// Mutation hook for invalidating collective data
export const useInvalidateCollectiveData = () => {
  const queryClient = useQueryClient();
  
  return (collectiveId: string) => {
    queryClient.invalidateQueries({ queryKey: ['collective-data', collectiveId] });
  };
};
```

**Update: `frontend/src/components/collective/inside-collective.component.tsx`**

Replace `useCollectivePostContext().fetchCollectiveData` with:
```typescript
const { data: collectiveData, isLoading: loadingCollective } = useCollectiveData(collectiveId);
```

**Update: `frontend/src/context/collective-post-context.tsx`**

- Remove `fetchCollectiveData` function
- Remove `collectiveData` and `loading` state (use React Query hook instead)
- Update channel mutations to use `useInvalidateCollectiveData()` instead of calling `fetchCollectiveData`

**Benefits:**
- ✅ Stops infinite query loop
- ✅ Proper caching (no refetch on navigation)
- ✅ Automatic refetch on window focus (optional)
- ✅ Better error handling
- ✅ Loading states handled by React Query

### 3. Frontend: Create React Query Hooks for Trophy/Praise/Heart Lists

**New File: `frontend/src/hooks/queries/use-post-lists.ts`**

Create hooks to fetch paginated lists of trophies, praises, and hearts for a post:

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { post } from '@lib/api';
import type { PostTrophy, PostPraise, PostHeart } from '@types';

interface TrophiesResponse {
  results: PostTrophy[];
  count: number;
  next: string | null;
  previous: string | null;
}

interface PraisesResponse {
  results: PostPraise[];
  count: number;
  next: string | null;
  previous: string | null;
}

interface HeartsResponse {
  results: PostHeart[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const usePostTrophies = (postId: string, enabled = true) => {
  return useInfiniteQuery<TrophiesResponse>({
    queryKey: ['post-trophies', postId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await post.get(`/${postId}/trophies/`, {
        params: { page: pageParam, page_size: 20 },
      });
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(postId),
  });
};

export const usePostPraises = (postId: string, enabled = true) => {
  return useInfiniteQuery<PraisesResponse>({
    queryKey: ['post-praises', postId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await post.get(`/${postId}/praises/`, {
        params: { page: pageParam, page_size: 20 },
      });
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(postId),
  });
};

export const usePostHearts = (postId: string, enabled = true) => {
  return useInfiniteQuery<HeartsResponse>({
    queryKey: ['post-hearts', postId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await post.get(`/${postId}/hearts/`, {
        params: { page: pageParam, page_size: 20 },
      });
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(postId),
  });
};
```

**Update**: `frontend/src/components/common/posts-feature/modal/praise-list.modal.tsx`, `trophy-list.modal.tsx`, `heart-list.modal.tsx` to use these hooks.

### 4. Frontend: Implement Reply Pagination

**File: `frontend/src/hooks/queries/use-comments.ts`**

Update `useReplies` to support pagination:

```typescript
export const useReplies = (commentId: string, enabled = false) => {
  return useInfiniteQuery({
    queryKey: ['replies', commentId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await post.get(`/comment/${commentId}/replies/`, {
        params: { page: pageParam, page_size: 10 },
      });
      return {
        ...response.data,
        results: normalizeComments(response.data.results || []),
        comment_id: commentId, // Include parent comment ID in response
      };
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(commentId),
    staleTime: Infinity,
  });
};
```

**Note**: The backend endpoint `/comment/<comment_id>/replies/` already returns paginated results with `CommentPagination`. The response includes the parent `comment_id` implicitly via the URL.

**File: `frontend/src/components/common/posts-feature/reply.component.tsx`**

- Remove duplicate "View replies" button (keep only the one in `ReplyComponent`)
- Update to use `useInfiniteQuery` for replies with `fetchNextPage` support
- Add "Load more replies" button when `hasNextPage` is true

### 5. Frontend: Remove Comments from Post Display

**File: `frontend/src/components/common/posts-feature/post-card.component.tsx`**

**CHANGES:**
1. **Remove** `FirstCommentsSection` and `DetailedCommentSection` components
2. **Remove** the `activeSection` state and tabbed view (comments/critiques toggle)
3. **Add** "Add Comment" button directly on the post card (next to other action buttons)
4. **Display only counts**: Show `comment_count`, `hearts_count`, `praise_count`, `trophy_counts_by_type` as clickable badges/buttons
5. Clicking comment count opens the post detail page or a comment modal
6. Clicking critique button opens critique section (if needed) or post detail page

**File: `frontend/src/components/common/posts-feature/modal/post-view.modal.tsx`**

**DELETE THIS FILE** - We no longer need the tabbed modal view since we have a dedicated post detail page (`/post/:postId`).

**File: `frontend/src/components/post/post-detail.component.tsx`**

This is the dedicated detail view. Ensure it:
- Shows full post content
- Has comment section with pagination
- Has critique section with pagination
- All counts are displayed

### 6. Frontend: Update Collective Posts View

**File: `backend/collective/views.py`** (lines 256-267)

Already covered in section 1 - apply the same optimizations to `InsideCollectivePostsView`.

### 7. Create Bulk Fetch Endpoints for Trophy/Praise (OPTIONAL - for future optimization)

**File: `backend/post/views.py`** (add new views after line 1023)

```python
class BulkPostPraiseCountView(APIView):
    """
    Get praise counts for multiple posts
    POST /api/posts/bulk/praises/count/
    Body: { "post_ids": ["uuid1", "uuid2", ...] }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        post_ids = request.data.get('post_ids', [])
        if not post_ids or len(post_ids) > 50:  # Limit to 50 posts
            return Response({'error': 'Provide 1-50 post IDs'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate all are valid UUIDs
        try:
            post_ids = [str(uuid.UUID(pid)) for pid in post_ids]
        except (ValueError, AttributeError):
            return Response({'error': 'Invalid post IDs'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Build cache keys
        user_id = request.user.id
        results = {}
        missing_ids = []
        
        for post_id in post_ids:
            cache_key = get_post_praise_count_cache_key(post_id, user_id)
            cached = cache.get(cache_key)
            if cached:
                results[post_id] = cached
            else:
                missing_ids.append(post_id)
        
        # Fetch missing data in bulk
        if missing_ids:
            praises = PostPraise.objects.filter(post_id__post_id__in=missing_ids).values('post_id').annotate(
                count=Count('id'),
                user_praised=Count('id', filter=Q(author=request.user))
            )
            
            praise_map = {str(p['post_id']): p for p in praises}
            
            for post_id in missing_ids:
                praise_data = praise_map.get(post_id, {'count': 0, 'user_praised': 0})
                payload = {
                    'post_id': post_id,
                    'praise_count': praise_data['count'],
                    'is_praised_by_user': bool(praise_data['user_praised'])
                }
                results[post_id] = payload
                cache_key = get_post_praise_count_cache_key(post_id, user_id)
                cache.set(cache_key, payload, POST_META_COUNT_CACHE_TIMEOUT)
        
        return Response(results, status=status.HTTP_200_OK)


class BulkPostTrophyCountView(APIView):
    """
    Get trophy counts for multiple posts
    POST /api/posts/bulk/trophies/count/
    Body: { "post_ids": ["uuid1", "uuid2", ...] }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        post_ids = request.data.get('post_ids', [])
        if not post_ids or len(post_ids) > 50:
            return Response({'error': 'Provide 1-50 post IDs'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            post_ids = [str(uuid.UUID(pid)) for pid in post_ids]
        except (ValueError, AttributeError):
            return Response({'error': 'Invalid post IDs'}, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = request.user.id
        results = {}
        missing_ids = []
        
        for post_id in post_ids:
            cache_key = get_post_trophy_count_cache_key(post_id, user_id)
            cached = cache.get(cache_key)
            if cached:
                results[post_id] = cached
            else:
                missing_ids.append(post_id)
        
        if missing_ids:
            # Fetch trophy counts grouped by post and type
            trophies = PostTrophy.objects.filter(post_id__post_id__in=missing_ids).values(
                'post_id', 'post_trophy_type__trophy'
            ).annotate(count=Count('id'))
            
            # Fetch user's awarded trophies
            user_trophies = PostTrophy.objects.filter(
                post_id__post_id__in=missing_ids, author=request.user
            ).values('post_id', 'post_trophy_type__trophy')
            
            # Organize by post
            post_trophy_map = {}
            for t in trophies:
                post_id = str(t['post_id'])
                if post_id not in post_trophy_map:
                    post_trophy_map[post_id] = {}
                post_trophy_map[post_id][t['post_trophy_type__trophy']] = t['count']
            
            user_trophy_map = {}
            for t in user_trophies:
                post_id = str(t['post_id'])
                if post_id not in user_trophy_map:
                    user_trophy_map[post_id] = []
                user_trophy_map[post_id].append(t['post_trophy_type__trophy'])
            
            # Build response for each post
            all_trophy_types = list(TrophyType.objects.values_list('trophy', flat=True))
            
            for post_id in missing_ids:
                trophy_counts = post_trophy_map.get(post_id, {})
                # Fill in missing types with 0
                for trophy_type in all_trophy_types:
                    if trophy_type not in trophy_counts:
                        trophy_counts[trophy_type] = 0
                
                total_count = sum(trophy_counts.values())
                
                payload = {
                    'post_id': post_id,
                    'trophy_counts': trophy_counts,
                    'total_trophy_count': total_count,
                    'user_awarded_trophies': user_trophy_map.get(post_id, [])
                }
                results[post_id] = payload
                cache_key = get_post_trophy_count_cache_key(post_id, user_id)
                cache.set(cache_key, payload, POST_META_COUNT_CACHE_TIMEOUT)
        
        return Response(results, status=status.HTTP_200_OK)
```

**File: `backend/post/urls.py`** (add after line 99)

```python
# Bulk endpoints
path('bulk/praises/count/', BulkPostPraiseCountView.as_view(), name='bulk-post-praise-count'),
path('bulk/trophies/count/', BulkPostTrophyCountView.as_view(), name='bulk-post-trophy-count'),
```

## Frontend Changes

### 3. Install React Query

```bash
npm install @tanstack/react-query
```

### 4. Create React Query Provider

**New File: `frontend/src/providers/query-provider.tsx`**

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };
```

Update `frontend/src/main.tsx` to wrap with QueryProvider.

### 5. Create React Query Hooks for Posts

**New File: `frontend/src/hooks/queries/use-posts.ts`**

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { post, collective } from '@lib/api';
import type { Post } from '@types';

interface PostsResponse {
  results: Post[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const usePosts = (channelId?: string, userId?: number) => {
  return useInfiniteQuery<PostsResponse>({
    queryKey: ['posts', channelId, userId],
    queryFn: async ({ pageParam = 1 }) => {
      let url = '/';
      let api = post;
      
      if (channelId) {
        url = `channel/${channelId}/posts/`;
        api = collective;
      } else if (userId) {
        url = `me/${userId}/`;
      }
      
      const response = await api.get(url, {
        params: { page: pageParam, page_size: 10 },
      });
      
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.next ? pages.length + 1 : undefined;
    },
  });
};
```

### 6. Create React Query Hooks for Comments

**New File: `frontend/src/hooks/queries/use-comments.ts`**

```typescript
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@lib/api';
import type { Comment } from '@types';

interface CommentsResponse {
  results: Comment[];
  count: number;
  total_comments: number;
  next: string | null;
  previous: string | null;
}

export const useComments = (postId: string) => {
  return useInfiniteQuery<CommentsResponse>({
    queryKey: ['comments', postId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await post.get(`/comment/${postId}/`, {
        params: { page: pageParam },
      });
      
      // Initialize is_replying for comments and replies
      const results = response.data.results.map((comment: Comment) => ({
        ...comment,
        is_replying: false,
        replies: comment.replies?.map((reply: Comment) => ({
          ...reply,
          is_replying: false
        }))
      }));
      
      return { ...response.data, results };
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.next ? pages.length + 1 : undefined;
    },
    enabled: !!postId,
  });
};

export const useReplies = (commentId: string) => {
  return useQuery({
    queryKey: ['replies', commentId],
    queryFn: async () => {
      const response = await post.get(`/comment/${commentId}/replies/`);
      const results = response.data.results || [];
      return results.map((reply: Comment) => ({
        ...reply,
        is_replying: false
      }));
    },
    enabled: false, // Only fetch when explicitly refetched
    staleTime: Infinity, // Keep replies cached indefinitely
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { text: string; post_id: string }) => {
      return await post.post('/comment/create/', data);
    },
    onSuccess: (_, variables) => {
      // Invalidate comments for this post
      queryClient.invalidateQueries({ queryKey: ['comments', variables.post_id] });
    },
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ commentId, text, postId }: { commentId: string; text: string; postId: string }) => {
      return await post.put(`/comment/update/${commentId}/`, { text });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      return await post.delete(`/comment/delete/${commentId}/`, { data: { confirm: true } });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
    },
  });
};
```

### 7. Create React Query Hooks for Critiques

**New File: `frontend/src/hooks/queries/use-critiques.ts`**

Similar structure to comments, with critique-specific endpoints.

### 8. Create Lightweight UI Context

**New File: `frontend/src/context/post-ui-context.tsx`**

```typescript
import { createContext, useContext, useState } from 'react';
import type { Post, Comment, Critique } from '@types';

interface PostUIContextType {
  // Modal states
  showPostForm: boolean;
  setShowPostForm: (show: boolean) => void;
  showCommentForm: boolean;
  setShowCommentForm: (show: boolean) => void;
  showCritiqueForm: boolean;
  setShowCritiqueForm: (show: boolean) => void;
  
  // Active selections
  activePost: Post | null;
  setActivePost: (post: Post | null) => void;
  selectedComment: Comment | null;
  setSelectedComment: (comment: Comment | null) => void;
  selectedCritique: Critique | null;
  setSelectedCritique: (critique: Critique | null) => void;
  
  // Dropdown/UI state
  dropdownOpen: string | null;
  setDropdownOpen: (id: string | null) => void;
  expandedPost: string | null;
  setExpandedPost: (id: string | null) => void;
  
  // Editing state
  editing: boolean;
  setEditing: (editing: boolean) => void;
  editingCritique: boolean;
  setEditingCritique: (editing: boolean) => void;
  
  // Modals
  showPraiseListModal: boolean;
  setShowPraiseListModal: (show: boolean) => void;
  selectedPostForPraiseList: string | null;
  setSelectedPostForPraiseList: (id: string | null) => void;
  showTrophyModal: boolean;
  setShowTrophyModal: (show: boolean) => void;
  selectedPostForTrophy: string | null;
  setSelectedPostForTrophy: (id: string | null) => void;
  showTrophyListModal: boolean;
  setShowTrophyListModal: (show: boolean) => void;
  selectedPostForTrophyList: string | null;
  setSelectedPostForTrophyList: (id: string | null) => void;
}

const PostUIContext = createContext<PostUIContextType | undefined>(undefined);

export function PostUIProvider({ children }: { children: React.ReactNode }) {
  // All UI state here (modals, selections, dropdowns)
  // ... implementation
  
  return <PostUIContext.Provider value={value}>{children}</PostUIContext.Provider>;
}

export const usePostUI = () => {
  const context = useContext(PostUIContext);
  if (!context) throw new Error('usePostUI must be within PostUIProvider');
  return context;
};
```

### 9. Delete Old Post Context

**Delete: `frontend/src/context/post-context.tsx`**

This 1067-line file will be completely replaced by:
- React Query hooks (server state)
- PostUIContext (UI state)

### 10. Update Components to Use New Hooks

**Update: `frontend/src/components/common/posts-feature/post-card.component.tsx`**

Remove `useEffect` calls for `fetchPraiseStatus` and `fetchTrophyStatus` (lines 69-73). Instead, read praise/trophy data directly from the post object returned by React Query.

```typescript
// Old approach
useEffect(() => {
  fetchPraiseStatus(postItem.post_id);
  fetchTrophyStatus(postItem.post_id);
}, [postItem.post_id]);

// New approach - data already in postItem from serializer
const praiseCount = postItem.praise_count || 0;
const isPraised = postItem.is_praised_by_user || false;
const trophyCount = postItem.trophy_count || 0;
const userTrophies = postItem.user_awarded_trophies || [];
const trophyCounts = postItem.trophy_counts_by_type || {};
```

**Update: All components using `usePostContext()`**

Replace with:
- `usePosts()` for post list
- `useComments(postId)` for comments
- `usePostUI()` for UI state (modals, dropdowns)

### 11. Frontend Form & Mutation Strategy

_Status: implemented_

**Form State Separation**

- Create `post-form.store.ts`, `comment-form.store.ts`, `critique-form.store.ts` (or equivalent hooks) to hold:
  - `formValues`, `setFormValues`
  - `isSubmitting` flags
  - `resetForm` helpers
  - `handleFormChange` utilities (including file uploads for image/video posts and novel chapters)
- Move reply form state into the comments hook (`useReplies`) to keep `replyForms` scoped to a comment id.
- Move critique reply form state into the critiques hook.

**Post Mutations (new file `use-post-mutations.ts`)**

```typescript
export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ formData, channelId }: CreatePostDTO) => {
      return await post.post("/create/", formData, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts", variables.channelId] });
    },
  });
};

// Similar hooks: useUpdatePost, useDeletePost, useHeartPost, useUnheartPost,
// usePraisePost, useAwardTrophy.
```

**Comment/Critique Mutations**

- Place in `use-comments.ts` / `use-critiques.ts`:
  - `useCreateComment`, `useUpdateComment`, `useDeleteComment`
  - `useCreateReply`, `useUpdateReply`, `useDeleteReply`
  - `useCreateCritique`, `useUpdateCritique`, `useDeleteCritique`
  - `useCreateCritiqueReply`, `useUpdateCritiqueReply`, `useDeleteCritiqueReply`
- Each mutation should invalidate the relevant query key (`["comments", postId]`, `["critiques", postId]`, `["replies", commentId]`).

### 12. Post UI Context Responsibilities

_Status: implemented_

`PostUIContext` should only manage UI state:

- Modals: `showPostForm`, `showCommentForm`, `showCritiqueForm`, `showPraiseListModal`, `showTrophyModal`, `showTrophyListModal`
- Active selections: `activePost`, `selectedComment`, `selectedCritique`
- Dropdown states: `dropdownOpen`, `expandedPost`
- Flags: `editing`, `editingCritique`, `isPostFormInCollective`, etc.
- Provide helper methods: `openPostForm({ channelId? })`, `closePostForm()`, `openPostModal(post)`, `closePostModal()`.

### 13. Component Migration Checklist

All components importing `usePostContext` must be migrated to the new hooks:

- [x] `components/common/posts-feature/post-card.component.tsx` (implemented)
- [x] `components/common/posts-feature/post-header.tsx` (implemented)
- [x] `components/common/posts-feature/comment-section.component.tsx` (implemented)
- [x] `components/common/posts-feature/detailed-comment-section.component.tsx` (implemented)
- [x] `components/common/posts-feature/infinite-scrolling.loading.tsx` (implemented)
- [x] `components/common/posts-feature/first-comments-section.component.tsx` (implemented)
- [x] `components/common/posts-feature/reply.component.tsx` (implemented)
- [x] `components/common/posts-feature/critique-section.component.tsx` (implemented)
- [x] `components/common/posts-feature/novel-renderer.component.tsx` (implemented)
- [x] `components/common/posts-feature/modal/post-form.modal.tsx` (implemented)
- [x] `components/common/posts-feature/modal/comment-form.modal.tsx` (implemented)
- [x] `components/common/posts-feature/modal/critique-form.modal.tsx` (implemented)
- [x] `components/common/posts-feature/modal/post-view.modal.tsx` (implemented)
- [ ] `components/common/posts-feature/modal/trophy-selection.modal.tsx`
- [x] `components/profile/timeline.component.tsx` (implemented)
- [x] `components/home/index.component.tsx` (implemented)
- [ ] `components/collective/index.component.tsx`
- [x] `components/collective/inside-collective.component.tsx` (implemented)
- [x] `components/post/post-detail.component.tsx` (implemented)

**Component cleanup checklist**

- [x] Rename `post-loading-indicator.component.tsx` → `infinite-scrolling.loading.tsx` and update barrel exports/imports. (implemented)
- [x] Rename `comments-renderer.component.tsx` → `comment-section.component.tsx`. (implemented)
- [x] Extract the `isFirstComments` branch into `first-comments-section.component.tsx`. (implemented)
- [x] Rename `comments-renderer-full.component.tsx` → `detailed-comment-section.component.tsx`. (implemented)
- [x] Update `PostCard`, `PostDetail`, and any other consumers to use the new component names. (implemented)
- [x] Ensure `components/common/posts-feature/index.ts` re-exports the renamed components. (implemented)

Each component should import only the hooks it needs:
- Lists: `usePosts`, `useCollectivePosts`
- Comments/replies: `useComments`, `useReplies`
- UI state: `usePostUI`
- Mutations: `usePostMutations`, `useCommentMutations`, etc.

### 14. Type Updates

_Status: implemented_

**File: `frontend/src/types/post.types.ts`**

Add fields to `Post`:

```typescript
export interface Post {
  // existing fields …
  praise_count?: number;
  is_praised_by_user?: boolean;
  trophy_count?: number;
  user_awarded_trophies?: string[];
  trophy_counts_by_type?: Record<string, number>;
}
```

### 15. Infinite Scroll & Observers

_Status: implemented_

- Replace manual pagination state with `useInfiniteQuery`.
- Components using IntersectionObserver (`InfiniteScrolling`, timeline, collectives) should call `fetchNextPage` when the sentinel enters the viewport and check `hasNextPage`.
- Ensure `usePosts` exposes `{ data, hasNextPage, fetchNextPage, isFetchingNextPage }`.

### 16. Active Post & Modal Behavior

_Status: implemented_

- `PostViewModal` should subscribe to `usePostUI` to read `activePost`.
- When `activePost` changes, `PostViewModal` should call `queryClient.prefetchQuery(['comments', activePost.post_id])`.
- Closing the modal should call `setActivePost(null)` via `usePostUI`.

### 17. Collective-Specific Logic

_Status: implemented_
- Create `useCollectivePosts(channelId)` wrapper that calls `usePosts(channelId)`.
- `collective-post-context.tsx` can stay but should only handle collective metadata (channels, forms). It should not manage post state; instead, consume the new hooks.
- Ensure channel switching passes `channelId` into `usePosts` query key so data is cached per channel.

### 11. Update Collective Post Context

**File: `frontend/src/context/collective-post-context.tsx`**

This can remain as a lightweight wrapper around `usePosts()` with collective-specific logic, or be deleted if not needed.

## Questions & Answers

### Q1: Do we have Tanstack Query hooks for trophies? praises? hearts?

**Answer**: **NO** - We only have **mutation hooks** (`useHeartPost`, `usePraisePost`, `useAwardTrophy`) but **NO query hooks** for fetching the lists.

**Action Required**: Create `use-post-lists.ts` with:
- `usePostTrophies(postId)` - fetches paginated trophy list
- `usePostPraises(postId)` - fetches paginated praise list  
- `usePostHearts(postId)` - fetches paginated heart list

Each post has a separate cached list. The backend endpoints are:
- `GET /api/post/<post_id>/trophies/` - paginated
- `GET /api/post/<post_id>/praises/` - paginated
- `GET /api/post/<post_id>/hearts/` - paginated

### Q2: Does our fetch comment endpoint fetch only paginated comments of that post?

**Answer**: **YES** - The endpoint `GET /api/post/comment/<post_id>/` returns:
- Paginated top-level comments (uses `CommentPagination`)
- Each comment includes `reply_count` (annotated in queryset)
- Does NOT include nested replies (replies are fetched separately)

**Backend**: `PostCommentsView` (lines 252-314 in `views.py`)
- Uses `CommentPagination` class
- Returns `{ results: Comment[], count, next, previous, total_comments }`
- Each comment has `reply_count` field

### Q3: Does our fetch replies endpoint fetch PAGINATED replies?

**Answer**: **YES** - The endpoint `GET /api/post/comment/<comment_id>/replies/` returns:
- Paginated replies for a specific comment
- Uses `CommentPagination` class
- Returns `{ results: Comment[], count, next, previous }`
- The parent `comment_id` is implicit in the URL

**Backend**: `PostCommentsReplyDetailView` (lines 352-367 in `views.py`)

**Frontend Issue**: `useReplies` currently uses `useQuery` (single fetch) instead of `useInfiniteQuery` (paginated). **MUST FIX** to support pagination.

**Action Required**:
1. Update `useReplies` to use `useInfiniteQuery` (see section 3 above)
2. Update `reply.component.tsx` to support "Load more replies" button
3. Remove duplicate "View replies" button (keep only one in `ReplyComponent`)

### Q4: Are comments and replies already cached by Tanstack Query?

**Answer**: **PARTIALLY**:
- ✅ Comments are cached: `useComments(postId)` uses `useInfiniteQuery` with key `['comments', postId]`
- ⚠️ Replies are cached BUT not paginated: `useReplies(commentId)` uses `useQuery` (single fetch, no pagination)
- ✅ Reply mutations invalidate both `['comments', postId]` and `['replies', commentId]` cache keys

**Action Required**: Update `useReplies` to use `useInfiniteQuery` for proper pagination and caching.

## Summary of Changes

**Backend:**
- ✅ **REMOVED** prefetching of comments, hearts, praises, trophies from `PostListView`
- ✅ **KEEP ONLY** count annotations (`total_comment_count`, `total_hearts_count`, `total_praise_count`, `total_trophy_count`)
- ✅ **REMOVED** `comments` field from `PostListViewSerializer`
- ✅ **UPDATED** `get_trophy_counts_by_type` to work without prefetched data
- ✅ **APPLIED** same optimizations to `InsideCollectivePostsView` (collective posts)

**Frontend:**
- ✅ Install `@tanstack/react-query` (already done)
- ✅ Create `QueryProvider` wrapper (already done)
- ✅ Create hooks: `use-posts.ts`, `use-comments.ts`, `use-critiques.ts` (already done)
- ✅ Create lightweight `post-ui-context.tsx` (already done)
- ✅ Delete `post-context.tsx` (already done)
- ✅ **CRITICAL BUG FIX**: Create `use-collective-data.ts` hook to stop infinite query loop (✅ implemented)
- ✅ **CRITICAL BUG FIX**: Fix `inside-collective.component.tsx` useEffect dependency (✅ implemented)
- ✅ **CRITICAL BUG FIX**: Update `collective-post-context.tsx` to use React Query (✅ implemented)
- ✅ **NEW**: Create `use-post-lists.ts` for trophy/praise/heart lists (✅ implemented)
- ✅ **NEW**: Update `useReplies` to use `useInfiniteQuery` for pagination (✅ implemented)
- ✅ **NEW**: Remove `FirstCommentsSection` and `DetailedCommentSection` from post cards (feed view) (✅ implemented)
- ✅ **NEW**: Remove `post-view.modal.tsx` (tabbed view) (✅ implemented)
- ✅ **NEW**: Add "Add Comment" button directly to post card (✅ implemented)
- ✅ **NEW**: Display only counts on post cards (no comment previews) (✅ implemented)
- ✅ **NEW**: Fix duplicate "View replies" button in `reply.component.tsx` (✅ implemented)
- ✅ **NEW**: Update all list modals to use React Query hooks with pagination (✅ implemented)

**Benefits:**
- 🐛 **Fixes infinite query bug** - collective endpoint no longer loops infinitely
- ⚡ **Faster post list loading** - no prefetching of comments/hearts/praises/trophies
- ⚡ **Reduced database queries** - only count annotations, no N+1 queries
- ⚡ **Better UX** - dedicated post detail page instead of modal
- ⚡ **Proper pagination** - replies now support infinite scroll
- ⚡ **Cleaner UI** - post cards show counts only, full content on detail page
- ⚡ **Better caching** - collective data cached by React Query

## Migration Checklist

### ✅ Completed Items (Latest Session)
- ✅ **CRITICAL BUG FIX**: Created `use-collective-data.ts` React Query hook
- ✅ **CRITICAL BUG FIX**: Fixed infinite query loop in `inside-collective.component.tsx`
- ✅ **CRITICAL BUG FIX**: Updated `collective-post-context.tsx` to use React Query invalidation
- ✅ Updated `channel-create.modal.tsx` and `channel-edit.modal.tsx` to use new hook
- ✅ Updated type definitions in `collective-post-context.type.ts`
- ✅ **ALL BACKEND OPTIMIZATIONS**: Removed prefetching, kept only count annotations
- ✅ **ALL FRONTEND HOOKS**: Created `use-post-lists.ts`, updated `useReplies` for pagination
- ✅ **ALL COMPONENT UPDATES**: Removed comment sections from feed, added counts, deleted modal
- ✅ **ALL MODAL UPDATES**: Updated all list modals to use React Query hooks with pagination

### Backend Changes
- [x] **REMOVE** comments prefetch from `PostListView.get_queryset()` (✅ implemented)
- [x] **REMOVE** hearts/praises/trophies prefetch from `PostListView.get_queryset()` (✅ implemented)
- [x] **KEEP** only count annotations (total_comment_count, total_hearts_count, etc.) (✅ implemented)
- [x] **REMOVE** `comments` field from `PostListViewSerializer` (✅ implemented)
- [x] **UPDATE** `get_trophy_counts_by_type` to work without prefetched data (✅ implemented)
- [x] **APPLY** same optimizations to `InsideCollectivePostsView.get_queryset()` (✅ implemented)

### Frontend: New Hooks
- [x] **CRITICAL**: Create `use-collective-data.ts` hook to fix infinite query loop (✅ implemented)
- [x] **CRITICAL**: Fix `inside-collective.component.tsx` useEffect dependency (remove `fetchCollectiveData`) (✅ implemented)
- [x] **CRITICAL**: Update `collective-post-context.tsx` to use React Query instead of manual fetching (✅ implemented)
- [x] Create `use-post-lists.ts` with `usePostTrophies`, `usePostPraises`, `usePostHearts` (✅ implemented)
- [x] Update `useReplies` to use `useInfiniteQuery` for pagination (✅ implemented)
- [x] Update `PraiseListModal`, `TrophyListModal`, `HeartListModal` to use new hooks (✅ implemented)

### Frontend: Component Updates
- [x] **REMOVE** `FirstCommentsSection` from `post-card.component.tsx` (feed view) (✅ implemented)
- [x] **REMOVE** `DetailedCommentSection` from `post-card.component.tsx` (feed view, kept for detail page) (✅ implemented)
- [x] **REMOVE** `activeSection` state and tabbed view from `post-card.component.tsx` (✅ implemented)
- [x] **ADD** "Add Comment" button directly to post card (✅ implemented)
- [x] **DISPLAY** only counts (comment_count, hearts_count, etc.) on post cards (✅ implemented)
- [x] **DELETE** `post-view.modal.tsx` file (✅ implemented)
- [x] **FIX** duplicate "View replies" button in `reply.component.tsx` (✅ implemented)
- [x] **UPDATE** `reply.component.tsx` to support "Load more replies" pagination (✅ implemented)

### Frontend: Testing
- [ ] Test post list loading performance (should be faster)
- [ ] Test comment pagination on detail page
- [ ] Test reply pagination (load more replies)
- [ ] Test trophy/praise/heart list modals with pagination
- [ ] Verify caching works (no refetches on navigation)
- [ ] Verify counts update after mutations (heart, praise, trophy, comment)

