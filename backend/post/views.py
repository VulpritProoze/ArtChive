import uuid
from collections import deque

from django.contrib.postgres.aggregates import ArrayAgg
from django.core.cache import cache
from django.db import transaction
from django.db.models import (
    Count,
    Exists,
    IntegerField,
    OuterRef,
    Prefetch,
    Q,
    Subquery,
)
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from collective.models import CollectiveMember
from common.utils.choices import TROPHY_BRUSH_DRIP_COSTS
from core.models import BrushDripTransaction, BrushDripWallet, User
from core.permissions import IsAuthorOrSuperUser
from notification.utils import (
    create_comment_notification,
    create_comment_reply_notification,
    create_critique_notification,
    create_critique_reply_notification,
    create_praise_notification,
    create_trophy_notification,
)

from .cache_utils import (
    get_post_praise_count_cache_key,
    get_post_trophy_count_cache_key,
)
from .models import (
    Comment,
    Critique,
    NovelPost,
    Post,
    PostHeart,
    PostPraise,
    PostTrophy,
    TrophyType,
)
from .pagination import (
    CommentPagination,
    CritiquePagination,
    PostListPagination,
    PostPagination,
)
from .serializers import (
    CommentCreateSerializer,
    CommentDeleteSerializer,
    CommentReplyCreateSerializer,
    CommentReplyViewSerializer,
    CommentSerializer,
    CommentUpdateSerializer,
    CritiqueCreateSerializer,
    CritiqueDeleteSerializer,
    CritiqueReplyCreateSerializer,
    CritiqueReplySerializer,
    CritiqueReplyUpdateSerializer,
    CritiqueSerializer,
    CritiqueUpdateSerializer,
    PostCreateSerializer,
    PostDeleteSerializer,
    PostDetailViewSerializer,
    PostHeartCreateSerializer,
    PostHeartSerializer,
    PostListViewSerializer,
    PostPraiseCreateSerializer,
    PostPraiseSerializer,
    PostTrophyCreateSerializer,
    PostTrophySerializer,
    PostUpdateSerializer,
    ReplyUpdateSerializer,
    TopLevelCommentsViewSerializer,
)

POST_META_COUNT_CACHE_TIMEOUT = 300  # seconds


class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostCreateSerializer
    permission_classes = [IsAuthenticated]

    # Allow only the authenticated user to post
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class PostListView(generics.ListAPIView):
    '''
    Paginated list of all posts with caching
    Example URLs:
    - /posts/ (first 10 posts)
    - /posts/?page=2 (next 10 posts)
    - /posts/?page_size=20 (20 posts per page)

    Cache is automatically invalidated when posts, comments, or hearts are modified.
    Cache TTL: 5 minutes (300 seconds)
    '''
    serializer_class = PostListViewSerializer
    pagination_class = PostPagination

    '''
    def list(self, request, *args, **kwargs):
        """
        Override list to add caching support.
        Cache key is based on user ID, page number, and page size.
        """
        # Get pagination parameters
        page = request.query_params.get('page', 1)
        try:
            page = int(page)
        except (ValueError, TypeError):
            page = 1

        page_size = request.query_params.get('page_size', 10)
        try:
            page_size = int(page_size)
        except (ValueError, TypeError):
            page_size = 10

        # Generate cache key
        user_id = request.user.id if request.user.is_authenticated else None
        cache_key = get_post_list_cache_key(user_id, page, page_size)

        # Try to get from cache
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            return Response(cached_response)

        # If not in cache, get from database
        response = super().list(request, *args, **kwargs)

        # Cache the response data for 5 minutes (300 seconds)
        cache.set(cache_key, response.data, 300)

        return response
    '''

    def get_queryset(self):
        '''
        Fetch public posts, and also posts from collectives the user has joined.
        Only returns active (non-deleted) posts.
        '''
        from post.models import Comment

        user = self.request.user

        # Subquery for comment count (exclude deleted comments and critique replies)
        comment_count_subquery = Subquery(
            Comment.objects.get_active_objects().filter(
                post_id=OuterRef('pk'),
                is_critique_reply=False
            ).values('post_id').annotate(count=Count('comment_id')).values('count')[:1],
            output_field=IntegerField()
        )

        # Build base queryset with COUNT annotations only (no prefetching of full objects)
        queryset = Post.objects.get_active_objects().annotate(
            # Annotate comment count using subquery (exclude critique replies)
            total_comment_count=comment_count_subquery,
            # Annotate hearts count to avoid separate COUNT queries
            total_hearts_count=Count('post_heart', distinct=True),
            total_praise_count=Count('post_praise', distinct=True),
            total_trophy_count=Count('post_trophy', distinct=True),
        ).prefetch_related(
            'novel_post',  # Keep - needed for novel posts
            'channel',
            'channel__collective',  # needed for collective filtering
            # REMOVED: comments_prefetch - comments fetched separately via API
            # REMOVED: 'post_heart' - only need count, not full objects
            # REMOVED: 'post_praise' - only need count, not full objects
            # REMOVED: 'post_trophy' - only need count, not full objects
            # REMOVED: 'post_trophy__post_trophy_type' - only need count, not full objects
        ).select_related(
            'author',
            'author__artist',  # Fetch artist info for post author
        ).order_by('-created_at')

        # If user is authenticated, annotate whether they hearted each post
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

            joined_collectives = CollectiveMember.objects.filter(
                member=user
            ).values_list('collective_id', flat=True)

            # Posts from joined collectives
            joined_posts = Q(channel__collective__in=joined_collectives)

            # Always include public posts (from the known public channel)
            public_channel_id = '00000000-0000-0000-0000-000000000001'
            public_posts = Q(channel=public_channel_id)

            # Combine: public posts OR posts from joined collectives
            return queryset.filter(public_posts | joined_posts)

        # Returns only public posts if unauthenticated
        return queryset.filter(
            channel='00000000-0000-0000-0000-000000000001'
        )

class OwnPostsListView(generics.ListAPIView):
    '''
    Fetch user's list of posts
    Example URLs:
    - /posts/me/1/ (first 10 posts)
    - /posts/me/1/?page=2 (next 10 posts)
    - /posts/me/1/?page_size=20 (20 posts per page)
    '''
    serializer_class = PostListViewSerializer
    pagination_class = PostPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs['id']
        user = get_object_or_404(User, id=user_id)

        # Use get_active_objects() to filter out soft-deleted posts
        return Post.objects.get_active_objects().filter(author=user).prefetch_related(
            'novel_post',
        ).select_related(
            'author',
        ).order_by('-created_at')

class PostCommentsView(generics.ListAPIView):
    '''
    Fetch all top-level comments with their replies (with context)
    '''
    serializer_class = TopLevelCommentsViewSerializer
    pagination_class = CommentPagination

    def get_queryset(self):
        post_id = self.kwargs['post_id']

        # Prefetch replies for each comment
        replies_prefetch = Prefetch(
            'comment_reply',
            queryset=Comment.objects.get_active_objects().filter(
                is_critique_reply=False
            ).select_related('author', 'author__artist').order_by('created_at'),
            to_attr='prefetched_replies'
        )

        return Comment.objects.get_active_objects().filter(
            post_id=post_id,
            replies_to__isnull=True,
            critique_id__isnull=True
            ).annotate(
                reply_count=Count('comment_reply',
                    filter=Q(
                        comment_reply__is_deleted=False,
                        comment_reply__is_critique_reply=False
                    ))
            ).select_related(
                'author', 'author__artist'
            ).prefetch_related(
                replies_prefetch
            ).order_by(
                '-created_at'
            )

    def list(self, request, *args, **kwargs):
        # Get the full queryset (before pagination)
        queryset = self.filter_queryset(self.get_queryset())
        post_id = self.kwargs['post_id']

        # Count total comments excluding critique replies
        total_comments = Comment.objects.get_active_objects().filter(
            post_id=post_id,
            is_critique_reply=False
        ).count()

        # Let DRF handle pagination and serialization
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Inject extra data into paginator
            self.paginator.extra_data = {
                'total_comments': total_comments
            }
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'total_comments': total_comments
        })

class PostCommentsReplyView(ListAPIView):
    '''
    Fetch all reply comments
    '''
    serializer_class = CommentReplyViewSerializer
    pagination_class = CommentPagination

    def get_queryset(self):
        return Comment.objects.get_active_objects().filter(
            replies_to__isnull=False,
            critique_id__isnull=True
            ).select_related(
                'author',
            ).order_by(
                '-created_at'
            )

class CommentReplyCreateView(generics.CreateAPIView):
    serializer_class = CommentReplyCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Create the reply
        reply = serializer.save(author=self.request.user)

        # Send notification to parent comment author
        if reply.replies_to:
            parent_author = reply.replies_to.author
            create_comment_reply_notification(reply, parent_author)

class CommentReplyUpdateView(generics.UpdateAPIView):
    queryset = Comment.objects.get_active_objects().filter(replies_to__isnull=False)
    serializer_class = ReplyUpdateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = 'comment_id'

class PostCommentsReplyDetailView(ListAPIView):
    serializer_class = CommentReplyViewSerializer
    pagination_class = CommentPagination
    lookup_field = 'comment_id'

    def get_queryset(self):
        comment_id = self.kwargs['comment_id']
        # Safely get the parent comment (returns 404 if not found)
        parent_comment = get_object_or_404(Comment, comment_id=comment_id)

        return Comment.objects.get_active_objects().filter(
            replies_to=parent_comment,      # ← replies TO this comment
            critique_id__isnull=True
        ).select_related(
            'author'
        ).order_by('-created_at')

class PostDetailView(generics.RetrieveAPIView):
    # Use get_active_objects() to filter out soft-deleted posts
    queryset = Post.objects.get_active_objects().prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostDetailViewSerializer
    lookup_field = 'post_id'

class PostUpdateView(generics.UpdateAPIView):
    # Use get_active_objects() to filter out soft-deleted posts
    queryset = Post.objects.get_active_objects().prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostUpdateSerializer
    lookup_field = 'post_id'
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]

class PostDeleteView(generics.DestroyAPIView):
    # Use get_active_objects() to filter out soft-deleted posts
    queryset = Post.objects.get_active_objects().prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostDeleteSerializer
    lookup_field = 'post_id'
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]

    def perform_destroy(self, instance):
        # Delete media files
        if instance.image_url:
            instance.image_url.delete(save=False)
        if instance.video_url:
            instance.video_url.delete(save=False)

        # Delete related novel posts
        NovelPost.objects.filter(post_id=instance).delete()

        instance.delete()

class CommentListView(generics.ListAPIView):
    queryset = Comment.objects.get_active_objects().select_related('author', 'post_id')
    serializer_class = CommentSerializer
    pagination_class = CommentPagination


class CommentDetailView(generics.RetrieveAPIView):
    """
    View for retrieving a single comment.
    No authentication required if comments are public.
    """
    queryset = Comment.objects.get_active_objects().select_related('author', 'post_id')
    serializer_class = CommentSerializer
    lookup_field = 'comment_id'



class CommentCreateView(generics.CreateAPIView):
    queryset = Comment.objects.get_active_objects()
    serializer_class = CommentCreateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]

    def perform_create(self, serializer):
        # Create the comment
        comment = serializer.save(author=self.request.user)

        # Send notification to post author
        if comment.post_id:
            post_author = comment.post_id.author
            create_comment_notification(comment, post_author)

class CommentUpdateView(generics.UpdateAPIView):
    """
    View for updating a comment.
    Requires authentication and ownership/admin rights.
    """
    queryset = Comment.objects.get_active_objects().select_related('author', 'post_id')
    serializer_class = CommentUpdateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = 'comment_id'

class CommentDeleteView(APIView):
    """
    Soft-delete a comment and all its replies (descendants).
    Requires confirmation and ownership/admin rights.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, comment_id):
        # Fetch the comment (only non-deleted)
        instance = get_object_or_404(
            Comment.objects.get_active_objects(),
            comment_id=comment_id
        )

        # Manual permission check (since we're not using generic view permissions)
        user = request.user
        if not (user == instance.author or user.is_staff):
            return Response(
                {"detail": "You can only delete your own comments."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate confirmation using serializer
        serializer = CommentDeleteSerializer(
            instance,
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        # Perform soft deletion of comment + all descendants
        self.soft_delete_with_replies(instance)

        return Response(
            {"detail": "Comment and all replies deleted successfully."},
            status=status.HTTP_200_OK
        )

    @transaction.atomic
    def soft_delete_with_replies(self, root_comment):
        """Recursively collect and soft-delete all replies."""
        comments_to_delete = []
        queue = deque([root_comment])

        while queue:
            current = queue.popleft()
            if not current.is_deleted:
                comments_to_delete.append(current)
                # Get direct replies that are not deleted
                replies = Comment.objects.get_active_objects().filter(
                    replies_to=current
                )
                queue.extend(replies)

        # Use the delete() method for each comment (soft deletion)
        for comment in comments_to_delete:
            comment.delete()

class PostHeartCreateView(generics.CreateAPIView):
    """Create a heart for a post"""
    queryset = PostHeart.objects.all()
    serializer_class = PostHeartCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class PostHeartDestroyView(generics.DestroyAPIView):
    """Remove a heart from a post"""
    serializer_class = PostHeartSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]

    def get_queryset(self):
        return PostHeart.objects.filter(author=self.request.user)

    def get_object(self):
        post_id = self.kwargs.get('post_id')
        return get_object_or_404(
            PostHeart,
            post_id=post_id,
            author=self.request.user
        )

class UserHeartedPostsListView(generics.ListAPIView):
    """List all posts hearted by the current user"""
    serializer_class = PostHeartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PostHeart.objects.filter(
            author=self.request.user
        ).select_related('post_id', 'author').order_by('-hearted_at')

class PostHeartsListView(ListAPIView):
    """List all hearts for a specific post (paginated)"""
    serializer_class = PostHeartSerializer
    pagination_class = PostListPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        post_id = self.kwargs.get('post_id')
        return PostHeart.objects.filter(
            post_id=post_id
        ).select_related('author').order_by('-hearted_at')

class CritiqueListView(ListAPIView):
    """
    List all critiques for a specific post
    """
    serializer_class = CritiqueSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CritiquePagination

    def get_queryset(self):
        post_id = self.kwargs['post_id']
        return Critique.objects.get_active_objects().filter(
            post_id=post_id
        ).annotate(
            reply_count=Count('critique_reply',
                filter=Q(
                    critique_reply__is_deleted=False
                ))
        ).select_related('author', 'post_id'
        ).order_by('-created_at')

class CritiqueCreateView(CreateAPIView):
    """
    Create a new critique for a post
    """
    serializer_class = CritiqueCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Create the critique
        critique = serializer.save()

        # Send notification to post author
        if critique.post_id:
            post_author = critique.post_id.author
            create_critique_notification(critique, post_author)

class CritiqueDetailView(RetrieveAPIView):
    """
    Retrieve a specific critique
    """
    serializer_class = CritiqueSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'critique_id'

    def get_queryset(self):
        return Critique.objects.get_active_objects().select_related('author', 'post_id')

class CritiqueUpdateView(UpdateAPIView):
    """
    Update a specific critique (text only, impression cannot be changed)
    """
    serializer_class = CritiqueUpdateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = 'critique_id'

    def get_queryset(self):
        return Critique.objects.get_active_objects()

class CritiqueDeleteView(DestroyAPIView):
    """
    Delete a specific critique (soft delete)
    """
    serializer_class = CritiqueDeleteSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = 'critique_id'

    def get_queryset(self):
        return Critique.objects.get_active_objects()

    def perform_destroy(self, instance):
        # Simply call delete() which now performs soft deletion
        instance.delete()

class UserCritiquesListView(ListAPIView):
    """
    List all critiques by the current user
    """
    serializer_class = CritiqueSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CritiquePagination

    def get_queryset(self):
        return Critique.objects.get_active_objects().filter(
            author=self.request.user
        ).select_related('author', 'post_id')

class CritiqueReplyListView(generics.ListAPIView):
    """
    List all replies for a specific critique
    GET /api/critiques/<critique_id>/replies/
    """
    serializer_class = CritiqueReplySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        critique_id = self.kwargs['critique_id']
        return Comment.objects.get_active_objects().filter(
            critique_id=critique_id,
            is_critique_reply=True
        ).select_related('author', 'post_id', 'critique_id')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        reply_count = queryset.count()  # Efficient count
        serializer = self.get_serializer(queryset, many=True)

        return Response({
            "results": serializer.data,
            "reply_count": reply_count
        })

class CritiqueReplyCreateView(generics.CreateAPIView):
    """
    Create a reply to a critique
    POST /api/critiques/replies/create/
    """
    serializer_class = CritiqueReplyCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Create the critique reply
        reply = serializer.save()

        # Send notification to critique author
        if reply.critique_id:
            critique_author = reply.critique_id.author
            create_critique_reply_notification(reply, critique_author)

class CritiqueReplyDetailView(generics.RetrieveAPIView):
    """
    Retrieve a specific critique reply
    GET /api/critiques/replies/<comment_id>/
    """
    serializer_class = CritiqueReplySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'comment_id'

    def get_queryset(self):
        return Comment.objects.get_active_objects().filter(
            is_critique_reply=True
        ).select_related('author', 'post_id', 'critique_id')


class CritiqueReplyUpdateView(generics.UpdateAPIView):
    """
    Update a critique reply (text only)
    PUT/PATCH /api/critiques/replies/<comment_id>/update/
    """
    serializer_class = CritiqueReplyUpdateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = 'comment_id'

    def get_queryset(self):
        return Comment.objects.get_active_objects().filter(
            is_critique_reply=True
        )


# ============================================================================
# POST PRAISE VIEWS
# ============================================================================

class PostPraiseCreateView(APIView):
    """
    Create a praise for a post (costs 1 Brush Drip)
    POST /api/posts/praise/create/

    Body: { "post_id": "<uuid>" }

    This endpoint:
    1. Validates user has 1 Brush Drip
    2. Creates PostPraise record
    3. Deducts 1 Brush Drip from user
    4. Adds 1 Brush Drip to post author
    5. Creates transaction record

    All operations are atomic (either all succeed or all fail)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Validate request data
        serializer = PostPraiseCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        post = serializer.validated_data['post_id']
        post_author = post.author

        try:
            with transaction.atomic():
                # Lock wallets to prevent race conditions
                sender_wallet = BrushDripWallet.objects.select_for_update().get(user=user)
                receiver_wallet = BrushDripWallet.objects.select_for_update().get(user=post_author)

                # Final balance check
                if sender_wallet.balance < 1:
                    return Response(
                        {'error': 'Insufficient Brush Drips'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Update balances
                sender_wallet.balance -= 1
                receiver_wallet.balance += 1

                sender_wallet.save()
                receiver_wallet.save()

                # Create PostPraise
                post_praise = PostPraise.objects.create(
                    post_id=post,
                    author=user
                )

                # Create transaction record
                BrushDripTransaction.objects.create(
                    amount=1,
                    transaction_object_type='praise',
                    transaction_object_id=str(post_praise.id),
                    transacted_by=user,
                    transacted_to=post_author
                )

                # Send notification to post author
                create_praise_notification(post_praise, post_author)

            # Return serialized response
            response_serializer = PostPraiseSerializer(post_praise, context={'request': request})
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            return Response(
                {'error': f'Failed to create praise: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PostPraiseListView(generics.ListAPIView):
    """
    List all praises for a specific post (paginated)
    GET /api/posts/<post_id>/praises/
    """
    serializer_class = PostPraiseSerializer
    pagination_class = PostListPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        post_id = self.kwargs['post_id']
        return PostPraise.objects.filter(
            post_id=post_id
        ).select_related('author', 'post_id').order_by('-praised_at')


class UserPraisedPostsListView(generics.ListAPIView):
    """
    List all posts praised by the current user
    GET /api/posts/praise/list/me/
    """
    serializer_class = PostPraiseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PostPraise.objects.filter(
            author=self.request.user
        ).select_related('author', 'post_id').order_by('-praised_at')


class BulkPostPraiseCountView(APIView):
    """
    Get praise counts for multiple posts in a single request
    POST /api/posts/bulk/praises/count/
    Body: {"post_ids": ["uuid1", "uuid2", ...]}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        post_ids = request.data.get('post_ids')
        if not isinstance(post_ids, list) or not post_ids or len(post_ids) > 50:
            return Response(
                {'error': 'Provide between 1 and 50 post IDs'},
                status=status.HTTP_400_BAD_REQUEST
            )

        normalized_ids = []
        normalized_uuid = []
        seen = set()
        for pid in post_ids:
            try:
                post_uuid = uuid.UUID(str(pid))
            except (ValueError, TypeError):
                return Response({'error': f'Invalid post ID: {pid}'}, status=status.HTTP_400_BAD_REQUEST)
            str_id = str(post_uuid)
            if str_id in seen:
                continue
            seen.add(str_id)
            normalized_ids.append(str_id)
            normalized_uuid.append(post_uuid)

        user_id = request.user.id
        results = {}
        missing_ids = []

        for post_id in normalized_ids:
            cache_key = get_post_praise_count_cache_key(post_id, user_id)
            cached_payload = cache.get(cache_key)
            if cached_payload:
                results[post_id] = cached_payload
            else:
                missing_ids.append(post_id)

        if missing_ids:
            missing_uuid = [uuid.UUID(post_id) for post_id in missing_ids]
            praise_queryset = PostPraise.objects.filter(
                post_id__in=missing_uuid
            ).values('post_id').annotate(
                total_count=Count('id'),
                user_count=Count('id', filter=Q(author=request.user)),
            )
            praise_map = {
                str(row['post_id']): row for row in praise_queryset
            }

            for post_id in missing_ids:
                aggregate = praise_map.get(post_id, {'total_count': 0, 'user_count': 0})
                payload = {
                    'post_id': post_id,
                    'praise_count': aggregate['total_count'] or 0,
                    'is_praised_by_user': bool(aggregate['user_count']),
                }
                results[post_id] = payload
                cache_key = get_post_praise_count_cache_key(post_id, user_id)
                cache.set(cache_key, payload, POST_META_COUNT_CACHE_TIMEOUT)

        return Response(results, status=status.HTTP_200_OK)


class PostPraiseCountView(APIView):
    """
    Get praise count for a specific post
    GET /api/posts/<post_id>/praises/count/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, post_id):
        post = get_object_or_404(Post, post_id=post_id)
        user_id = request.user.id if request.user.is_authenticated else None
        cache_key = get_post_praise_count_cache_key(post_id, user_id)
        cached_payload = cache.get(cache_key)
        if cached_payload:
            return Response(cached_payload, status=status.HTTP_200_OK)

        aggregate_result = PostPraise.objects.filter(post_id=post).aggregate(
            total_count=Count('id'),
            user_count=Count('id', filter=Q(author=request.user)),
        )

        payload = {
            'post_id': str(post_id),
            'praise_count': aggregate_result['total_count'] or 0,
            'is_praised_by_user': bool(aggregate_result['user_count']),
        }
        cache.set(cache_key, payload, POST_META_COUNT_CACHE_TIMEOUT)
        return Response(payload, status=status.HTTP_200_OK)


class PostPraiseCheckView(APIView):
    """
    Check if current user has praised a specific post
    GET /api/posts/<post_id>/praise/check/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, post_id):
        post = get_object_or_404(Post, post_id=post_id)
        is_praised = PostPraise.objects.filter(
            post_id=post,
            author=request.user
        ).exists()

        return Response({
            'post_id': str(post_id),
            'is_praised_by_user': is_praised
        }, status=status.HTTP_200_OK)


# ============================================================================
# POST TROPHY VIEWS
# ============================================================================

class PostTrophyCreateView(APIView):
    """
    Create a trophy for a post (costs 5/10/20 Brush Drips based on trophy type)
    POST /api/posts/trophy/create/

    Body: {
        "post_id": "<uuid>",
        "trophy_type": "bronze_stroke" | "golden_bristle" | "diamond_canvas"
    }

    Trophy costs:
    - bronze_stroke: 5 Brush Drips
    - golden_bristle: 10 Brush Drips
    - diamond_canvas: 20 Brush Drips

    This endpoint:
    1. Validates user has sufficient Brush Drips
    2. Creates PostTrophy record
    3. Deducts Brush Drips from user
    4. Adds Brush Drips to post author
    5. Creates transaction record

    All operations are atomic (either all succeed or all fail)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Validate request data
        serializer = PostTrophyCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        post = serializer.validated_data['post_id']
        post_author = post.author
        trophy_type_name = serializer.validated_data['trophy_type']
        required_amount = TROPHY_BRUSH_DRIP_COSTS[trophy_type_name]

        try:
            with transaction.atomic():
                # Get the TrophyType object
                trophy_type_obj = TrophyType.objects.get(trophy=trophy_type_name)

                # Lock wallets to prevent race conditions
                sender_wallet = BrushDripWallet.objects.select_for_update().get(user=user)
                receiver_wallet = BrushDripWallet.objects.select_for_update().get(user=post_author)

                # Final balance check
                if sender_wallet.balance < required_amount:
                    return Response(
                        {'error': 'Insufficient Brush Drips'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Update balances
                sender_wallet.balance -= required_amount
                receiver_wallet.balance += required_amount

                sender_wallet.save()
                receiver_wallet.save()

                # Create PostTrophy
                post_trophy = PostTrophy.objects.create(
                    post_id=post,
                    author=user,
                    post_trophy_type=trophy_type_obj
                )

                # Create transaction record
                BrushDripTransaction.objects.create(
                    amount=required_amount,
                    transaction_object_type='trophy',
                    transaction_object_id=str(post_trophy.id),
                    transacted_by=user,
                    transacted_to=post_author
                )

                # Send notification to post author
                create_trophy_notification(post_trophy, post_author)

            # Return serialized response
            response_serializer = PostTrophySerializer(post_trophy, context={'request': request})
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            return Response(
                {'error': f'Failed to award trophy: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PostTrophyListView(generics.ListAPIView):
    """
    List all trophies for a specific post (paginated)
    GET /api/posts/<post_id>/trophies/
    """
    serializer_class = PostTrophySerializer
    pagination_class = PostListPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        post_id = self.kwargs['post_id']
        return PostTrophy.objects.filter(
            post_id=post_id
        ).select_related('author', 'post_id', 'post_trophy_type').order_by('-awarded_at')


class UserAwardedTrophiesListView(generics.ListAPIView):
    """
    List all trophies awarded by the current user
    GET /api/posts/trophy/list/me/
    """
    serializer_class = PostTrophySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PostTrophy.objects.filter(
            author=self.request.user
        ).select_related('author', 'post_id', 'post_trophy_type').order_by('-awarded_at')


class BulkPostTrophyCountView(APIView):
    """
    Get trophy counts (per type) for multiple posts in a single request
    POST /api/posts/bulk/trophies/count/
    Body: {"post_ids": ["uuid1", "uuid2", ...]}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        post_ids = request.data.get('post_ids')
        if not isinstance(post_ids, list) or not post_ids or len(post_ids) > 50:
            return Response(
                {'error': 'Provide between 1 and 50 post IDs'},
                status=status.HTTP_400_BAD_REQUEST
            )

        normalized_ids = []
        normalized_uuid = []
        seen = set()
        for pid in post_ids:
            try:
                post_uuid = uuid.UUID(str(pid))
            except (ValueError, TypeError):
                return Response({'error': f'Invalid post ID: {pid}'}, status=status.HTTP_400_BAD_REQUEST)
            str_id = str(post_uuid)
            if str_id in seen:
                continue
            seen.add(str_id)
            normalized_ids.append(str_id)
            normalized_uuid.append(post_uuid)

        user_id = request.user.id
        results = {}
        missing_ids = []

        for post_id in normalized_ids:
            cache_key = get_post_trophy_count_cache_key(post_id, user_id)
            cached_payload = cache.get(cache_key)
            if cached_payload:
                results[post_id] = cached_payload
            else:
                missing_ids.append(post_id)

        if missing_ids:
            missing_uuid = [uuid.UUID(post_id) for post_id in missing_ids]
            trophies = PostTrophy.objects.filter(
                post_id__in=missing_uuid
            ).values('post_id', 'post_trophy_type__trophy').annotate(count=Count('id'))

            user_trophies = PostTrophy.objects.filter(
                post_id__in=missing_uuid,
                author=request.user
            ).values('post_id', 'post_trophy_type__trophy')

            trophy_map = {}
            for row in trophies:
                str_id = str(row['post_id'])
                trophy_map.setdefault(str_id, {})
                trophy_map[str_id][row['post_trophy_type__trophy']] = row['count']

            user_trophy_map = {}
            for row in user_trophies:
                str_id = str(row['post_id'])
                user_trophy_map.setdefault(str_id, [])
                user_trophy_map[str_id].append(row['post_trophy_type__trophy'])

            all_trophy_types = list(TrophyType.objects.values_list('trophy', flat=True))

            for post_id in missing_ids:
                counts = trophy_map.get(post_id, {}).copy()
                for trophy_type in all_trophy_types:
                    counts.setdefault(trophy_type, 0)
                total = sum(counts.values())
                payload = {
                    'post_id': post_id,
                    'trophy_counts': counts,
                    'total_trophy_count': total,
                    'user_awarded_trophies': user_trophy_map.get(post_id, []),
                }
                results[post_id] = payload
                cache_key = get_post_trophy_count_cache_key(post_id, user_id)
                cache.set(cache_key, payload, POST_META_COUNT_CACHE_TIMEOUT)

        return Response(results, status=status.HTTP_200_OK)


class PostTrophyCountView(APIView):
    """
    Get trophy count for a specific post (grouped by trophy type)
    GET /api/posts/<post_id>/trophies/count/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, post_id):
        post = get_object_or_404(Post, post_id=post_id)
        user_id = request.user.id if request.user.is_authenticated else None
        cache_key = get_post_trophy_count_cache_key(post_id, user_id)
        cached_payload = cache.get(cache_key)
        if cached_payload:
            return Response(cached_payload, status=status.HTTP_200_OK)

        trophies_qs = PostTrophy.objects.filter(post_id=post)
        counts_by_type = {
            row['post_trophy_type__trophy']: row['count']
            for row in trophies_qs.values('post_trophy_type__trophy').annotate(count=Count('id'))
        }

        trophy_counts = {}
        total_count = 0
        for trophy_type in TrophyType.objects.all():
            count = counts_by_type.get(trophy_type.trophy, 0)
            trophy_counts[trophy_type.trophy] = count
            total_count += count

        user_awarded_trophies = list(
            trophies_qs.filter(author=request.user).values_list('post_trophy_type__trophy', flat=True)
        )

        payload = {
            'post_id': str(post_id),
            'trophy_counts': trophy_counts,
            'total_trophy_count': total_count,
            'user_awarded_trophies': user_awarded_trophies,
        }
        cache.set(cache_key, payload, POST_META_COUNT_CACHE_TIMEOUT)
        return Response(payload, status=status.HTTP_200_OK)


class PostTrophyCheckView(APIView):
    """
    Check if current user has awarded a specific trophy type to a post
    GET /api/posts/<post_id>/trophy/check/?trophy_type=<type>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, post_id):
        post = get_object_or_404(Post, post_id=post_id)
        trophy_type = request.query_params.get('trophy_type', None)

        if not trophy_type:
            return Response(
                {'error': 'trophy_type query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            trophy_type_obj = TrophyType.objects.get(trophy=trophy_type)
            has_awarded = PostTrophy.objects.filter(
                post_id=post,
                author=request.user,
                post_trophy_type=trophy_type_obj
            ).exists()

            return Response({
                'post_id': str(post_id),
                'trophy_type': trophy_type,
                'has_awarded': has_awarded
            }, status=status.HTTP_200_OK)
        except TrophyType.DoesNotExist:
            return Response(
                {'error': f'Trophy type "{trophy_type}" not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================================================
# COMMENT/CRITIQUE DETAIL WITH CONTEXT (for notification navigation)
# ============================================================================

class CommentDetailWithContextView(generics.RetrieveAPIView):
    """
    Fetch a specific comment with its replies for navigation from notifications.
    Used when navigating to a specific comment that may not be loaded yet.
    GET /api/comment/<comment_id>/detail/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CommentSerializer
    lookup_field = 'comment_id'

    def get_queryset(self):
        return Comment.objects.get_active_objects().select_related(
            'author', 'author__artist', 'post_id'
        ).prefetch_related('comment_reply')

    def retrieve(self, request, *args, **kwargs):
        comment = self.get_object()
        serializer = self.get_serializer(comment)

        # If it's a reply, fetch parent comment with all its replies
        if comment.replies_to:
            parent_comment = comment.replies_to
            parent_serializer = self.get_serializer(parent_comment)

            # Fetch all replies for the parent
            replies_qs = Comment.objects.get_active_objects().filter(
                replies_to=parent_comment
            ).select_related('author', 'author__artist').order_by('created_at')

            replies_data = CommentSerializer(replies_qs, many=True).data

            return Response({
                'comment': serializer.data,
                'post_id': str(comment.post_id.post_id),
                'is_reply': True,
                'parent_comment': parent_serializer.data,
                'all_replies': replies_data
            })
        else:
            # It's a top-level comment, fetch its replies
            replies_qs = Comment.objects.get_active_objects().filter(
                replies_to=comment
            ).select_related('author', 'author__artist').order_by('created_at')

            replies_data = CommentSerializer(replies_qs, many=True).data

            return Response({
                'comment': serializer.data,
                'post_id': str(comment.post_id.post_id),
                'is_reply': False,
                'replies': replies_data
            })


class CritiqueDetailWithContextView(generics.RetrieveAPIView):
    """
    Fetch a specific critique with its replies for navigation from notifications.
    GET /api/critique/<critique_id>/detail/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CritiqueSerializer
    lookup_field = 'critique_id'

    def get_queryset(self):
        return Critique.objects.filter(
            is_deleted=False
        ).select_related('author', 'author__artist', 'post_id')

    def retrieve(self, request, *args, **kwargs):
        critique = self.get_object()
        serializer = self.get_serializer(critique)

        # Fetch critique replies
        replies_qs = Comment.objects.get_active_objects().filter(
            critique_id=critique,
            is_critique_reply=True
        ).select_related('author', 'author__artist').order_by('created_at')

        replies_data = CommentSerializer(replies_qs, many=True).data

        return Response({
            'critique': serializer.data,
            'post_id': str(critique.post_id.post_id),
            'replies': replies_data
        })
