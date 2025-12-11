import random
import uuid
from collections import deque
from datetime import timedelta

from django.contrib import admin
from django.contrib.auth.mixins import UserPassesTestMixin
from django.core.cache import cache
from django.db import transaction
from django.db.models import (
    Avg,
    Count,
    Prefetch,
    Q,
)
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.generic import TemplateView
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import generics, permissions, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import (
    DestroyAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from collective.models import CollectiveMember
from common.utils.choices import TROPHY_BRUSH_DRIP_COSTS
from common.utils.profiling import silk_profile
from core.cache_utils import get_dashboard_cache_key
from core.models import BrushDripTransaction, BrushDripWallet, User
from core.permissions import HasAPIKey, IsAdminUser, IsAuthorOrSuperUser
from notification.utils import (
    create_comment_notification,
    create_comment_reply_notification,
    create_critique_notification,
    create_critique_reply_notification,
    create_praise_notification,
    create_trophy_notification,
)

from .cache_utils import (
    get_post_heart_count_cache_key,
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
    CritiqueSearchSerializer,
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
    PostSearchSerializer,
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
    """
    Paginated list of all posts with personalized ranking and caching.

    For authenticated users: Posts are ranked by personalized score (recency,
    social connections, engagement, etc.)

    For anonymous users: Posts are shown chronologically (newest first).

    Example URLs:
    - /posts/ (first 10 posts)
    - /posts/?page=2 (next 10 posts)
    - /posts/?page_size=20 (20 posts per page)
    """

    serializer_class = PostListViewSerializer
    pagination_class = PostPagination

    def list(self, request, *args, **kwargs):
        page = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)
        user_id = request.user.id if request.user.is_authenticated else "anon"

        # Check for cache invalidation flag from client (optional manual refresh)
        invalidate_cache = request.query_params.get("invalidate_cache", "false").lower() == "true"

        # Get calculation version for authenticated users (Facebook-style cache invalidation)
        # Version increments when calculations change, automatically invalidating post cache
        if request.user.is_authenticated:
            from .ranking import invalidate_user_calculations
            version_key = f"calc_version:{user_id}"
            calc_version = cache.get(version_key, 1)

            # If invalidate_cache flag is true, increment version to force refresh
            if invalidate_cache:
                invalidate_user_calculations(user_id)
                calc_version = cache.get(version_key, 1)  # Get updated version

            # Include calculation version in cache key
            cache_key = f"post_list:{user_id}:calc_v{calc_version}:{page}:{page_size}"
        else:
            # Anonymous users: no calculation version needed (chronological only)
            cache_key = f"post_list:{user_id}:{page}:{page_size}"

        cached_data = cache.get(cache_key)
        if cached_data:
            # Smart filtering: Filter out deleted posts from cache (don't invalidate)
            # This keeps cache valid even when posts are deleted
            if isinstance(cached_data, dict) and 'results' in cached_data:
                # Paginated response format
                filtered_results = [
                    post for post in cached_data['results']
                    if not post.get('is_deleted', False)
                ]

                # Reshuffle posts every time user fetches (shuffle cache)
                random.shuffle(filtered_results)

                # Update the cached data with filtered and shuffled results
                cached_data['results'] = filtered_results
                # Update count if present
                if 'count' in cached_data:
                    cached_data['count'] = len(filtered_results)
            elif isinstance(cached_data, list):
                # Non-paginated list format
                filtered_results = [
                    post for post in cached_data
                    if not post.get('is_deleted', False)
                ]
                # Reshuffle
                random.shuffle(filtered_results)
                cached_data = filtered_results

            # Check if user created a new post recently (within last 5 minutes)
            # If so, fetch it separately and prepend it (don't add to cache)
            if request.user.is_authenticated:
                recent_post = Post.objects.filter(
                    author=request.user,
                    created_at__gte=timezone.now() - timedelta(minutes=5),
                    is_deleted=False
                ).order_by('-created_at').first()

                if recent_post:
                    # Serialize the new post
                    from .serializers import PostListViewSerializer
                    serializer = PostListViewSerializer(recent_post, context={'request': request})
                    new_post_data = serializer.data

                    # Prepend to results (only if not already in results)
                    if isinstance(cached_data, dict) and 'results' in cached_data:
                        existing_ids = {post.get('post_id') for post in cached_data['results']}
                        if new_post_data.get('post_id') not in existing_ids:
                            # Remove from list if it exists elsewhere, then prepend
                            cached_data['results'] = [p for p in cached_data['results'] if p.get('post_id') != new_post_data.get('post_id')]
                            cached_data['results'].insert(0, new_post_data)
                            if 'count' in cached_data:
                                cached_data['count'] = len(cached_data['results'])
                    elif isinstance(cached_data, list):
                        existing_ids = {post.get('post_id') for post in cached_data}
                        if new_post_data.get('post_id') not in existing_ids:
                            # Remove from list if it exists elsewhere, then prepend
                            cached_data = [p for p in cached_data if p.get('post_id') != new_post_data.get('post_id')]
                            cached_data.insert(0, new_post_data)

            return Response(cached_data)

        response = super().list(request, *args, **kwargs)

        # Check if user created a new post recently (within last 5 minutes)
        # If so, prepend it to results (don't add to cache)
        recent_post = None
        recent_post_id = None
        if request.user.is_authenticated:
            recent_post = Post.objects.filter(
                author=request.user,
                created_at__gte=timezone.now() - timedelta(minutes=5),
                is_deleted=False
            ).order_by('-created_at').first()

            if recent_post:
                recent_post_id = str(recent_post.post_id)
                # Serialize the new post
                from .serializers import PostListViewSerializer
                serializer = PostListViewSerializer(recent_post, context={'request': request})
                new_post_data = serializer.data

                # Prepend to results (remove from list if it exists elsewhere, then prepend)
                if isinstance(response.data, dict) and 'results' in response.data:
                    # Remove from list if it exists elsewhere
                    response.data['results'] = [p for p in response.data['results'] if str(p.get('post_id')) != recent_post_id]
                    # Prepend as first item
                    response.data['results'].insert(0, new_post_data)
                    if 'count' in response.data:
                        response.data['count'] = len(response.data['results'])
                elif isinstance(response.data, list):
                    # Remove from list if it exists elsewhere
                    response.data = [p for p in response.data if str(p.get('post_id')) != recent_post_id]
                    # Prepend as first item
                    response.data.insert(0, new_post_data)

        # Reshuffle results before caching (but keep recent post first if it exists)

        if isinstance(response.data, dict) and 'results' in response.data:
            if recent_post_id:
                # Remove recent post, shuffle the rest, then prepend it back
                recent_post_data = None
                for i, post in enumerate(response.data['results']):
                    if str(post.get('post_id')) == recent_post_id:
                        recent_post_data = response.data['results'].pop(i)
                        break
                random.shuffle(response.data['results'])
                if recent_post_data:
                    response.data['results'].insert(0, recent_post_data)
            else:
                random.shuffle(response.data['results'])
        elif isinstance(response.data, list):
            if recent_post_id:
                # Remove recent post, shuffle the rest, then prepend it back
                recent_post_data = None
                for i, post in enumerate(response.data):
                    if str(post.get('post_id')) == recent_post_id:
                        recent_post_data = response.data.pop(i)
                        break
                random.shuffle(response.data)
                if recent_post_data:
                    response.data.insert(0, recent_post_data)
            else:
                random.shuffle(response.data)

        cache.set(cache_key, response.data, 300)  # 5 minutes
        return response

    def get_queryset(self):
        """
        Fetch core post data with personalized ranking for authenticated users.
        Counts and user interactions are fetched separately via PostBulkMetaView.

        Performance optimizations:
        - Database-level scoring (no Python loops)
        - Multi-level caching (fellows, collectives, interaction stats)
        - Efficient prefetching and select_related
        """
        from .ranking import build_personalized_queryset

        user = self.request.user
        public_channel_id = "00000000-0000-0000-0000-000000000001"

        # Build base queryset - only core post data, no annotations yet
        with silk_profile(name="PostListView - Build Base Queryset"):
            queryset = (
                Post.objects.get_active_objects()
                .prefetch_related(
                    "novel_post",  # Keep - needed for novel posts
                )
                .select_related(
                    "author",
                    "author__artist",  # Fetch artist info for post author
                    "channel",
                    "channel__collective",  # Fetch collective info for collective indicator
                )
                .only(
                    # Only fetch fields used by PostListViewSerializer
                    "post_id",
                    "description",
                    "image_url",
                    "video_url",
                    "is_deleted",
                    "post_type",
                    "author_id",
                    "channel_id",
                    "created_at",
                    "updated_at",
                )
            )

        # Filter based on authentication
        if user.is_authenticated:
            with silk_profile(name="PostListView - Filter Authenticated User"):
                # Cache joined_collectives per user (cache for 5 minutes)
                cache_key = f"user_joined_collectives:{user.id}"
                joined_collectives = cache.get(cache_key)

                if joined_collectives is None:
                    # Get collective IDs ONCE (materialized list, not subquery)
                    joined_collectives = list(
                        CollectiveMember.objects.filter(
                            member=user
                        ).values_list("collective_id", flat=True)
                    )
                    # Cache for 5 minutes
                    cache.set(cache_key, joined_collectives, 300)

                # Optimization: If user has no collectives, only show public posts
                if not joined_collectives:
                    queryset = queryset.filter(channel=public_channel_id)
                else:
                    # Posts from joined collectives OR public posts
                    joined_posts = Q(channel__collective__in=joined_collectives)
                    public_posts = Q(channel=public_channel_id)
                    queryset = queryset.filter(public_posts | joined_posts)

                # Apply personalized ranking (database-level scoring)
                with silk_profile(name="PostListView - Apply Personalized Ranking"):
                    queryset = build_personalized_queryset(queryset, user)

                return queryset
        else:
            # Anonymous users: chronological ordering only
            with silk_profile(name="PostListView - Filter Public Posts"):
                return queryset.filter(channel=public_channel_id).order_by("-created_at")


class PostBulkMetaView(APIView):
    """
    Fetch all counts/interactions for multiple posts in ONE request.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        post_ids = request.data.get("post_ids", [])

        if not post_ids or len(post_ids) > 50:
            return Response(
                {"error": "Invalid post_ids or too many IDs (max 50)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        # 1. Try to get counts from cache
        cache_keys = {pid: f"post_meta_counts:{pid}" for pid in post_ids}
        cached_counts = cache.get_many(cache_keys.values())

        cached_counts_by_pid = {}
        for pid, key in cache_keys.items():
            if key in cached_counts:
                cached_counts_by_pid[str(pid)] = cached_counts[key]

        missing_ids = [pid for pid in post_ids if str(pid) not in cached_counts_by_pid]

        fetched_counts = {}
        if missing_ids:
            with silk_profile(name="PostBulkMeta - Fetch Missing Counts"):
                # Hearts
                hearts_counts = dict(
                    PostHeart.objects.filter(post_id__in=missing_ids)
                    .values("post_id")
                    .annotate(count=Count("pk"))
                    .values_list("post_id", "count")
                )

                # Praise
                praise_counts = dict(
                    PostPraise.objects.filter(post_id__in=missing_ids)
                    .values("post_id")
                    .annotate(count=Count("pk"))
                    .values_list("post_id", "count")
                )

                # Trophies
                trophy_counts = dict(
                    PostTrophy.objects.filter(post_id__in=missing_ids)
                    .values("post_id")
                    .annotate(count=Count("pk"))
                    .values_list("post_id", "count")
                )

                # Comments
                comment_counts = dict(
                    Comment.objects.filter(
                        post_id__in=missing_ids,
                        is_deleted=False,
                        is_critique_reply=False,
                    )
                    .values("post_id")
                    .annotate(count=Count("comment_id"))
                    .values_list("post_id", "count")
                )

                # Trophy Breakdown
                trophy_breakdown_map = {}
                trophy_breakdown_qs = (
                    PostTrophy.objects.filter(post_id__in=missing_ids)
                    .values("post_id", "post_trophy_type__trophy")
                    .annotate(count=Count("pk"))
                )
                for item in trophy_breakdown_qs:
                    pid = str(item["post_id"])
                    trophy_type = item["post_trophy_type__trophy"]
                    count = item["count"]
                    if pid not in trophy_breakdown_map:
                        trophy_breakdown_map[pid] = {}
                    trophy_breakdown_map[pid][trophy_type] = count

                # Assemble fetched counts
                to_cache = {}
                for pid in missing_ids:
                    pid_str = str(pid)
                    data = {
                        "hearts_count": hearts_counts.get(uuid.UUID(pid_str), 0),
                        "praise_count": praise_counts.get(uuid.UUID(pid_str), 0),
                        "trophy_count": trophy_counts.get(uuid.UUID(pid_str), 0),
                        "comment_count": comment_counts.get(uuid.UUID(pid_str), 0),
                        "trophy_breakdown": trophy_breakdown_map.get(pid_str, {}),
                    }
                    fetched_counts[pid_str] = data
                    to_cache[cache_keys[pid]] = data

                # Cache them (1 minute TTL)
                if to_cache:
                    cache.set_many(to_cache, 60)

        # 5. User Trophies & Interactions (Always fetch fresh)
        user_trophies_map = {}
        user_hearted_map = {}
        user_praised_map = {}

        if user.is_authenticated:
            with silk_profile(name="PostBulkMeta - Fetch User Interactions"):
                # Trophies
                user_trophies_qs = PostTrophy.objects.filter(
                    post_id__in=post_ids, author=user
                ).values("post_id", "post_trophy_type__trophy")

                for item in user_trophies_qs:
                    pid = str(item["post_id"])
                    if pid not in user_trophies_map:
                        user_trophies_map[pid] = []
                    user_trophies_map[pid].append(item["post_trophy_type__trophy"])

                # Hearts - Convert UUIDs to strings for comparison
                user_hearted_ids = {
                    str(pid) for pid in PostHeart.objects.filter(
                        post_id__in=post_ids, author=user
                    ).values_list("post_id", flat=True)
                }

                # Praises - Convert UUIDs to strings for comparison
                user_praised_ids = {
                    str(pid) for pid in PostPraise.objects.filter(
                        post_id__in=post_ids, author=user
                    ).values_list("post_id", flat=True)
                }

                for pid in post_ids:
                    pid_str = str(pid)
                    user_hearted_map[pid_str] = pid_str in user_hearted_ids
                    user_praised_map[pid_str] = pid_str in user_praised_ids

        # Build response
        with silk_profile(name="PostBulkMeta - Build Response"):
            result = {}
            for post_id in post_ids:
                pid_str = str(post_id)

                # Get counts (from cache or fetch)
                counts = (
                    cached_counts_by_pid.get(pid_str)
                    or fetched_counts.get(pid_str)
                    or {
                        "hearts_count": 0,
                        "praise_count": 0,
                        "trophy_count": 0,
                        "comment_count": 0,
                        "trophy_breakdown": {},
                    }
                )

                result[pid_str] = {
                    **counts,
                    "user_trophies": user_trophies_map.get(pid_str, []),
                    "is_hearted": user_hearted_map.get(pid_str, False),
                    "is_praised": user_praised_map.get(pid_str, False),
                }

        return Response(result)


class OwnPostsListView(generics.ListAPIView):
    """
    Fetch user's list of posts by user ID.
    Optimized queryset matching PostDetailView pattern.
    Lightweight - no count annotations (use PostBulkMetaView for counts).
    Example URLs:
    - /posts/me/1/ (first 10 posts)
    - /posts/me/1/?page=2 (next 10 posts)
    - /posts/me/1/?page_size=20 (20 posts per page)
    """

    serializer_class = PostListViewSerializer
    pagination_class = PostPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs["id"]
        user = get_object_or_404(User, id=user_id)

        # Optimized queryset matching PostDetailView pattern
        return (
            Post.objects.get_active_objects()
            .filter(author=user)
            .prefetch_related(
                "novel_post",  # Keep - needed for novel posts
                "channel",
                "channel__collective",  # For consistency with PostListView
            )
            .select_related(
                "author",
                "author__artist",  # Fetch artist info for post author
            )
            .order_by("-created_at")
        )


class UserPostsByUsernameListView(generics.ListAPIView):
    """
    Fetch user's posts by username.
    Optimized queryset matching PostDetailView pattern.
    Lightweight - no count annotations (use PostBulkMetaView for counts).
    Public endpoint - anyone can view any user's posts.
    Example URLs:
    - /posts/by-username/johndoe/ (first 10 posts)
    - /posts/by-username/johndoe/?page=2 (next 10 posts)
    - /posts/by-username/johndoe/?page_size=20 (20 posts per page)
    """
    serializer_class = PostListViewSerializer
    pagination_class = PostPagination
    permission_classes = [AllowAny]  # Public endpoint

    def get_queryset(self):
        username = self.kwargs["username"]
        user = get_object_or_404(User, username=username)

        # Optimized queryset matching PostDetailView pattern
        return (
            Post.objects.get_active_objects()
            .filter(author=user)
            .prefetch_related(
                "novel_post",  # Keep - needed for novel posts
                "channel",
                "channel__collective",  # For consistency with PostListView
            )
            .select_related(
                "author",
                "author__artist",  # Fetch artist info for post author
            )
            .order_by("-created_at")
        )


class PostCommentsView(generics.ListAPIView):
    """
    Fetch all top-level comments with their replies (with context)
    """

    serializer_class = TopLevelCommentsViewSerializer
    pagination_class = CommentPagination

    def get_queryset(self):
        post_id = self.kwargs["post_id"]

        # Prefetch replies for each comment
        replies_prefetch = Prefetch(
            "comment_reply",
            queryset=Comment.objects.get_active_objects()
            .filter(is_critique_reply=False)
            .select_related("author", "author__artist")
            .order_by("created_at"),
            to_attr="prefetched_replies",
        )

        return (
            Comment.objects.get_active_objects()
            .filter(post_id=post_id, replies_to__isnull=True, critique_id__isnull=True)
            .annotate(
                reply_count=Count(
                    "comment_reply",
                    filter=Q(
                        comment_reply__is_deleted=False,
                        comment_reply__is_critique_reply=False,
                    ),
                )
            )
            .select_related("author", "author__artist")
            .prefetch_related(replies_prefetch)
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        # Get the full queryset (before pagination)
        queryset = self.filter_queryset(self.get_queryset())
        post_id = self.kwargs["post_id"]

        # Count total comments excluding critique replies
        total_comments = (
            Comment.objects.get_active_objects()
            .filter(post_id=post_id, is_critique_reply=False)
            .count()
        )

        # Let DRF handle pagination and serialization
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Inject extra data into paginator
            self.paginator.extra_data = {"total_comments": total_comments}
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({"results": serializer.data, "total_comments": total_comments})


class PostCommentsReplyView(ListAPIView):
    """
    Fetch all reply comments
    """

    serializer_class = CommentReplyViewSerializer
    pagination_class = CommentPagination

    def get_queryset(self):
        return (
            Comment.objects.get_active_objects()
            .filter(replies_to__isnull=False, critique_id__isnull=True)
            .select_related(
                "author",
            )
            .order_by("-created_at")
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
    lookup_field = "comment_id"


class PostCommentsReplyDetailView(ListAPIView):
    serializer_class = CommentReplyViewSerializer
    pagination_class = CommentPagination
    lookup_field = "comment_id"

    def get_queryset(self):
        comment_id = self.kwargs["comment_id"]
        # Safely get the parent comment (returns 404 if not found)
        parent_comment = get_object_or_404(Comment, comment_id=comment_id)

        return (
            Comment.objects.get_active_objects()
            .filter(
                replies_to=parent_comment,  # ← replies TO this comment
                critique_id__isnull=True,
            )
            .select_related("author")
            .order_by("-created_at")
        )


class PostDetailView(generics.RetrieveAPIView):
    """
    Retrieve a single post - lightweight, matches PostListView pattern.
    Counts and user interactions are fetched separately via PostBulkMetaView.
    """
    serializer_class = PostDetailViewSerializer
    lookup_field = "post_id"

    def get_queryset(self):
        """
        Reuse the same queryset pattern as PostListView.
        Only core post data, no count annotations.
        """
        # Build base queryset - same as PostListView (lightweight)
        queryset = (
            Post.objects.get_active_objects()
            .prefetch_related(
                "novel_post",  # Keep - needed for novel posts
                "channel",
                "channel__collective",  # For consistency with PostListView
            )
            .select_related(
                "author",
                "author__artist",  # Fetch artist info for post author
            )
        )

        return queryset


class PostUpdateView(generics.UpdateAPIView):
    # Use get_active_objects() to filter out soft-deleted posts
    queryset = (
        Post.objects.get_active_objects()
        .prefetch_related(
            "novel_post",
        )
        .select_related(
            "author",
        )
    )
    serializer_class = PostUpdateSerializer
    lookup_field = "post_id"
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]


class PostDeleteView(generics.DestroyAPIView):
    # Use get_active_objects() to filter out soft-deleted posts
    queryset = (
        Post.objects.get_active_objects()
        .prefetch_related(
            "novel_post",
        )
        .select_related(
            "author",
        )
    )
    serializer_class = PostDeleteSerializer
    lookup_field = "post_id"
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
    queryset = Comment.objects.get_active_objects().select_related("author", "post_id")
    serializer_class = CommentSerializer
    pagination_class = CommentPagination


class CommentDetailView(generics.RetrieveAPIView):
    """
    View for retrieving a single comment.
    No authentication required if comments are public.
    """

    queryset = Comment.objects.get_active_objects().select_related("author", "post_id")
    serializer_class = CommentSerializer
    lookup_field = "comment_id"


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

    queryset = Comment.objects.get_active_objects().select_related("author", "post_id")
    serializer_class = CommentUpdateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = "comment_id"


class CommentDeleteView(APIView):
    """
    Soft-delete a comment and all its replies (descendants).
    Requires confirmation and ownership/admin rights.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request, comment_id):
        # Fetch the comment (only non-deleted)
        instance = get_object_or_404(
            Comment.objects.get_active_objects(), comment_id=comment_id
        )

        # Manual permission check (since we're not using generic view permissions)
        user = request.user
        if not (user == instance.author or user.is_staff):
            return Response(
                {"detail": "You can only delete your own comments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validate confirmation using serializer
        serializer = CommentDeleteSerializer(
            instance, data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        # Perform soft deletion of comment + all descendants
        self.soft_delete_with_replies(instance)

        return Response(
            {"detail": "Comment and all replies deleted successfully."},
            status=status.HTTP_200_OK,
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
        # Invalidate user calculations to refresh personalized ranking
        from .ranking import invalidate_user_calculations
        invalidate_user_calculations(self.request.user.id)


class PostHeartDestroyView(generics.DestroyAPIView):
    """Remove a heart from a post"""

    serializer_class = PostHeartSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]

    def get_queryset(self):
        return PostHeart.objects.filter(author=self.request.user)

    def get_object(self):
        post_id = self.kwargs.get("post_id")
        return get_object_or_404(PostHeart, post_id=post_id, author=self.request.user)

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        instance.delete()
        # Invalidate user calculations to refresh personalized ranking
        from .ranking import invalidate_user_calculations
        invalidate_user_calculations(user_id)


class UserHeartedPostsListView(generics.ListAPIView):
    """List all posts hearted by the current user"""

    serializer_class = PostHeartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            PostHeart.objects.filter(author=self.request.user)
            .select_related("post_id", "author")
            .order_by("-hearted_at")
        )


class PostHeartsListView(ListAPIView):
    """List all hearts for a specific post (paginated)"""

    serializer_class = PostHeartSerializer
    pagination_class = PostListPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        post_id = self.kwargs.get("post_id")
        return (
            PostHeart.objects.filter(post_id=post_id)
            .select_related("author")
            .order_by("-hearted_at")
        )


class CritiqueListView(ListAPIView):
    """
    List all critiques for a specific post or gallery
    Supports both:
    - GET /api/post/<post_id>/critiques/ (for posts)
    - GET /api/post/critique/list/?gallery_id=<gallery_id> (for galleries, via query param)
    """

    serializer_class = CritiqueSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CritiquePagination

    def get_queryset(self):
        # Check if post_id is in URL kwargs (for post critiques)
        post_id = self.kwargs.get("post_id")
        # Check if gallery_id is in query params (for gallery critiques)
        gallery_id = self.request.query_params.get("gallery_id")

        queryset = Critique.objects.get_active_objects()

        if post_id:
            # Filter by post_id
            queryset = queryset.filter(post_id=post_id)
        elif gallery_id:
            # Filter by gallery_id
            queryset = queryset.filter(gallery_id=gallery_id)
        else:
            # No filter provided, return empty queryset
            return Critique.objects.none()

        return (
            queryset
            .annotate(
                reply_count=Count(
                    "critique_reply", filter=Q(critique_reply__is_deleted=False)
                )
            )
            .select_related("author", "post_id", "gallery_id")
            .order_by("-created_at")
        )


class CritiqueCreateView(APIView):
    """
    Create a new critique for a post or gallery (costs 3 Brush Drips)
    POST /api/posts/critique/create/

    Body: {
        "text": "<text>",
        "impression": "positive" | "negative" | "neutral",
        "post_id": "<uuid>" (optional, if critiquing a post)
        "gallery_id": "<uuid>" (optional, if critiquing a gallery)
    }

    Note: Either post_id OR gallery_id must be provided, but not both.

    This endpoint:
    1. Validates user has 3 Brush Drips
    2. Creates Critique record
    3. Deducts 3 Brush Drips from user (no refund on deletion)
    4. Creates transaction record
    5. Sends notification to post author or gallery creator

    All operations are atomic (either all succeed or all fail)
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Validate request data
        serializer = CritiqueCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        post = serializer.validated_data.get("post_id")
        gallery = serializer.validated_data.get("gallery_id")
        text = serializer.validated_data["text"]
        impression = serializer.validated_data["impression"]

        try:
            with transaction.atomic():
                # Lock wallet to prevent race conditions
                user_wallet = BrushDripWallet.objects.select_for_update().get(
                    user=user
                )

                # Final balance check
                if user_wallet.balance < 3:
                    return Response(
                        {"error": "Insufficient Brush Drips"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Deduct 3 Brush Drips from user (no transfer to recipient)
                user_wallet.balance -= 3
                user_wallet.save()

                # Create Critique
                critique = Critique.objects.create(
                    post_id=post,
                    gallery_id=gallery,
                    author=user,
                    text=text,
                    impression=impression,
                )

                # Determine recipient for notification and transaction
                recipient = None
                transaction_type = "critique"
                if post:
                    recipient = post.author
                elif gallery:
                    recipient = gallery.creator
                    transaction_type = "gallery_critique"

                # Create transaction record (transacted_to is recipient for reputation)
                BrushDripTransaction.objects.create(
                    amount=3,
                    transaction_object_type=transaction_type,
                    transaction_object_id=str(critique.critique_id),
                    transacted_by=user,
                    transacted_to=recipient,  # Recipient gets reputation, not BD
                )

                # Send notification to recipient
                if recipient:
                    create_critique_notification(critique, recipient)

            # Return serialized response
            response_serializer = CritiqueSerializer(
                critique, context={"request": request}
            )
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Failed to create critique: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CritiqueDetailView(RetrieveAPIView):
    """
    Retrieve a specific critique
    """

    serializer_class = CritiqueSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "critique_id"

    def get_queryset(self):
        return Critique.objects.get_active_objects().select_related("author", "post_id")


class CritiqueUpdateView(UpdateAPIView):
    """
    Update a specific critique (text only, impression cannot be changed)
    """

    serializer_class = CritiqueUpdateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = "critique_id"

    def get_queryset(self):
        return Critique.objects.get_active_objects()


class CritiqueDeleteView(DestroyAPIView):
    """
    Delete a specific critique (soft delete)
    """

    serializer_class = CritiqueDeleteSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = "critique_id"

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
        return (
            Critique.objects.get_active_objects()
            .filter(author=self.request.user)
            .select_related("author", "post_id")
        )


class CritiqueReplyListView(generics.ListAPIView):
    """
    List all replies for a specific critique
    GET /api/critiques/<critique_id>/replies/
    """

    serializer_class = CritiqueReplySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        critique_id = self.kwargs["critique_id"]
        return (
            Comment.objects.get_active_objects()
            .filter(critique_id=critique_id, is_critique_reply=True)
            .select_related("author", "post_id", "critique_id")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        reply_count = queryset.count()  # Efficient count
        serializer = self.get_serializer(queryset, many=True)

        return Response({"results": serializer.data, "reply_count": reply_count})


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
    lookup_field = "comment_id"

    def get_queryset(self):
        return (
            Comment.objects.get_active_objects()
            .filter(is_critique_reply=True)
            .select_related("author", "post_id", "critique_id")
        )


class CritiqueReplyUpdateView(generics.UpdateAPIView):
    """
    Update a critique reply (text only)
    PUT/PATCH /api/critiques/replies/<comment_id>/update/
    """

    serializer_class = CritiqueReplyUpdateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = "comment_id"

    def get_queryset(self):
        return Comment.objects.get_active_objects().filter(is_critique_reply=True)


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
        serializer = PostPraiseCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        post = serializer.validated_data["post_id"]
        post_author = post.author

        try:
            with transaction.atomic():
                # Lock wallets to prevent race conditions
                sender_wallet = BrushDripWallet.objects.select_for_update().get(
                    user=user
                )
                receiver_wallet = BrushDripWallet.objects.select_for_update().get(
                    user=post_author
                )

                # Final balance check
                if sender_wallet.balance < 1:
                    return Response(
                        {"error": "Insufficient Brush Drips"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Update balances
                sender_wallet.balance -= 1
                receiver_wallet.balance += 1

                sender_wallet.save()
                receiver_wallet.save()

                # Create PostPraise
                post_praise = PostPraise.objects.create(post_id=post, author=user)

                # Create transaction record
                BrushDripTransaction.objects.create(
                    amount=1,
                    transaction_object_type="praise",
                    transaction_object_id=str(post_praise.id),
                    transacted_by=user,
                    transacted_to=post_author,
                )

                # Send notification to post author
                create_praise_notification(post_praise, post_author)

            # Invalidate user calculations to refresh personalized ranking
            from .ranking import invalidate_user_calculations
            invalidate_user_calculations(user.id)

            # Return serialized response
            response_serializer = PostPraiseSerializer(
                post_praise, context={"request": request}
            )
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Failed to create praise: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
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
        post_id = self.kwargs["post_id"]
        return (
            PostPraise.objects.filter(post_id=post_id)
            .select_related("author", "post_id")
            .order_by("-praised_at")
        )


class UserPraisedPostsListView(generics.ListAPIView):
    """
    List all posts praised by the current user
    GET /api/posts/praise/list/me/
    """

    serializer_class = PostPraiseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            PostPraise.objects.filter(author=self.request.user)
            .select_related("author", "post_id")
            .order_by("-praised_at")
        )


class BulkPostPraiseCountView(APIView):
    """
    Get praise counts for multiple posts in a single request
    POST /api/posts/bulk/praises/count/
    Body: {"post_ids": ["uuid1", "uuid2", ...]}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        post_ids = request.data.get("post_ids")
        if not isinstance(post_ids, list) or not post_ids or len(post_ids) > 50:
            return Response(
                {"error": "Provide between 1 and 50 post IDs"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_ids = []
        normalized_uuid = []
        seen = set()
        for pid in post_ids:
            try:
                post_uuid = uuid.UUID(str(pid))
            except (ValueError, TypeError):
                return Response(
                    {"error": f"Invalid post ID: {pid}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
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
            praise_queryset = (
                PostPraise.objects.filter(post_id__in=missing_uuid)
                .values("post_id")
                .annotate(
                    total_count=Count("id"),
                    user_count=Count("id", filter=Q(author=request.user)),
                )
            )
            praise_map = {str(row["post_id"]): row for row in praise_queryset}

            for post_id in missing_ids:
                aggregate = praise_map.get(post_id, {"total_count": 0, "user_count": 0})
                payload = {
                    "post_id": post_id,
                    "praise_count": aggregate["total_count"] or 0,
                    "is_praised_by_user": bool(aggregate["user_count"]),
                }
                results[post_id] = payload
                cache_key = get_post_praise_count_cache_key(post_id, user_id)
                cache.set(cache_key, payload, POST_META_COUNT_CACHE_TIMEOUT)

        return Response(results, status=status.HTTP_200_OK)


class PostHeartCountView(APIView):
    """
    Get heart count for a specific post
    GET /api/posts/<post_id>/hearts/count/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, post_id):
        post = get_object_or_404(Post, post_id=post_id)
        user_id = request.user.id if request.user.is_authenticated else None
        cache_key = get_post_heart_count_cache_key(post_id, user_id)
        cached_payload = cache.get(cache_key)
        if cached_payload:
            return Response(cached_payload, status=status.HTTP_200_OK)

        aggregate_result = PostHeart.objects.filter(post_id=post).aggregate(
            total_count=Count("id"),
            user_count=Count("id", filter=Q(author=request.user)),
        )

        payload = {
            "post_id": str(post_id),
            "hearts_count": aggregate_result["total_count"] or 0,
            "is_hearted_by_user": bool(aggregate_result["user_count"]),
        }
        cache.set(cache_key, payload, POST_META_COUNT_CACHE_TIMEOUT)
        return Response(payload, status=status.HTTP_200_OK)


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
            total_count=Count("id"),
            user_count=Count("id", filter=Q(author=request.user)),
        )

        payload = {
            "post_id": str(post_id),
            "praise_count": aggregate_result["total_count"] or 0,
            "is_praised_by_user": bool(aggregate_result["user_count"]),
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
            post_id=post, author=request.user
        ).exists()

        return Response(
            {"post_id": str(post_id), "is_praised_by_user": is_praised},
            status=status.HTTP_200_OK,
        )


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
        serializer = PostTrophyCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        post = serializer.validated_data["post_id"]
        post_author = post.author
        trophy_type_name = serializer.validated_data["trophy_type"]
        required_amount = TROPHY_BRUSH_DRIP_COSTS[trophy_type_name]

        try:
            with transaction.atomic():
                # Get the TrophyType object
                trophy_type_obj = TrophyType.objects.get(trophy=trophy_type_name)

                # Lock wallets to prevent race conditions
                sender_wallet = BrushDripWallet.objects.select_for_update().get(
                    user=user
                )
                receiver_wallet = BrushDripWallet.objects.select_for_update().get(
                    user=post_author
                )

                # Final balance check
                if sender_wallet.balance < required_amount:
                    return Response(
                        {"error": "Insufficient Brush Drips"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Update balances
                sender_wallet.balance -= required_amount
                receiver_wallet.balance += required_amount

                sender_wallet.save()
                receiver_wallet.save()

                # Create PostTrophy
                post_trophy = PostTrophy.objects.create(
                    post_id=post, author=user, post_trophy_type=trophy_type_obj
                )

                # Create transaction record
                BrushDripTransaction.objects.create(
                    amount=required_amount,
                    transaction_object_type="trophy",
                    transaction_object_id=str(post_trophy.id),
                    transacted_by=user,
                    transacted_to=post_author,
                )

                # Send notification to post author
                create_trophy_notification(post_trophy, post_author)

            # Invalidate user calculations to refresh personalized ranking
            from .ranking import invalidate_user_calculations
            invalidate_user_calculations(user.id)

            # Return serialized response
            response_serializer = PostTrophySerializer(
                post_trophy, context={"request": request}
            )
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Failed to award trophy: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
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
        post_id = self.kwargs["post_id"]
        return (
            PostTrophy.objects.filter(post_id=post_id)
            .select_related("author", "post_id", "post_trophy_type")
            .order_by("-awarded_at")
        )


class UserAwardedTrophiesListView(generics.ListAPIView):
    """
    List all trophies awarded by the current user
    GET /api/posts/trophy/list/me/
    """

    serializer_class = PostTrophySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            PostTrophy.objects.filter(author=self.request.user)
            .select_related("author", "post_id", "post_trophy_type")
            .order_by("-awarded_at")
        )


class BulkPostTrophyCountView(APIView):
    """
    Get trophy counts (per type) for multiple posts in a single request
    POST /api/posts/bulk/trophies/count/
    Body: {"post_ids": ["uuid1", "uuid2", ...]}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        post_ids = request.data.get("post_ids")
        if not isinstance(post_ids, list) or not post_ids or len(post_ids) > 50:
            return Response(
                {"error": "Provide between 1 and 50 post IDs"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_ids = []
        normalized_uuid = []
        seen = set()
        for pid in post_ids:
            try:
                post_uuid = uuid.UUID(str(pid))
            except (ValueError, TypeError):
                return Response(
                    {"error": f"Invalid post ID: {pid}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
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
            trophies = (
                PostTrophy.objects.filter(post_id__in=missing_uuid)
                .values("post_id", "post_trophy_type__trophy")
                .annotate(count=Count("id"))
            )

            user_trophies = PostTrophy.objects.filter(
                post_id__in=missing_uuid, author=request.user
            ).values("post_id", "post_trophy_type__trophy")

            trophy_map = {}
            for row in trophies:
                str_id = str(row["post_id"])
                trophy_map.setdefault(str_id, {})
                trophy_map[str_id][row["post_trophy_type__trophy"]] = row["count"]

            user_trophy_map = {}
            for row in user_trophies:
                str_id = str(row["post_id"])
                user_trophy_map.setdefault(str_id, [])
                user_trophy_map[str_id].append(row["post_trophy_type__trophy"])

            all_trophy_types = list(TrophyType.objects.values_list("trophy", flat=True))

            for post_id in missing_ids:
                counts = trophy_map.get(post_id, {}).copy()
                for trophy_type in all_trophy_types:
                    counts.setdefault(trophy_type, 0)
                total = sum(counts.values())
                payload = {
                    "post_id": post_id,
                    "trophy_counts": counts,
                    "total_trophy_count": total,
                    "user_awarded_trophies": user_trophy_map.get(post_id, []),
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
            row["post_trophy_type__trophy"]: row["count"]
            for row in trophies_qs.values("post_trophy_type__trophy").annotate(
                count=Count("id")
            )
        }

        trophy_counts = {}
        total_count = 0
        for trophy_type in TrophyType.objects.all():
            count = counts_by_type.get(trophy_type.trophy, 0)
            trophy_counts[trophy_type.trophy] = count
            total_count += count

        user_awarded_trophies = list(
            trophies_qs.filter(author=request.user).values_list(
                "post_trophy_type__trophy", flat=True
            )
        )

        payload = {
            "post_id": str(post_id),
            "trophy_counts": trophy_counts,
            "total_trophy_count": total_count,
            "user_awarded_trophies": user_awarded_trophies,
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
        trophy_type = request.query_params.get("trophy_type", None)

        if not trophy_type:
            return Response(
                {"error": "trophy_type query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            trophy_type_obj = TrophyType.objects.get(trophy=trophy_type)
            has_awarded = PostTrophy.objects.filter(
                post_id=post, author=request.user, post_trophy_type=trophy_type_obj
            ).exists()

            return Response(
                {
                    "post_id": str(post_id),
                    "trophy_type": trophy_type,
                    "has_awarded": has_awarded,
                },
                status=status.HTTP_200_OK,
            )
        except TrophyType.DoesNotExist:
            return Response(
                {"error": f'Trophy type "{trophy_type}" not found'},
                status=status.HTTP_404_NOT_FOUND,
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
    lookup_field = "comment_id"

    def get_queryset(self):
        return (
            Comment.objects.get_active_objects()
            .select_related("author", "author__artist", "post_id")
            .prefetch_related("comment_reply")
        )

    def retrieve(self, request, *args, **kwargs):
        comment = self.get_object()
        serializer = self.get_serializer(comment)

        # If it's a reply, fetch parent comment with all its replies
        if comment.replies_to:
            parent_comment = comment.replies_to
            parent_serializer = self.get_serializer(parent_comment)

            # Fetch all replies for the parent
            replies_qs = (
                Comment.objects.get_active_objects()
                .filter(replies_to=parent_comment)
                .select_related("author", "author__artist")
                .order_by("created_at")
            )

            replies_data = CommentSerializer(replies_qs, many=True).data

            return Response(
                {
                    "comment": serializer.data,
                    "post_id": str(comment.post_id.post_id),
                    "is_reply": True,
                    "parent_comment": parent_serializer.data,
                    "all_replies": replies_data,
                }
            )
        else:
            # It's a top-level comment, fetch its replies
            replies_qs = (
                Comment.objects.get_active_objects()
                .filter(replies_to=comment)
                .select_related("author", "author__artist")
                .order_by("created_at")
            )

            replies_data = CommentSerializer(replies_qs, many=True).data

            return Response(
                {
                    "comment": serializer.data,
                    "post_id": str(comment.post_id.post_id),
                    "is_reply": False,
                    "replies": replies_data,
                }
            )


class CritiqueDetailWithContextView(generics.RetrieveAPIView):
    """
    Fetch a specific critique with its replies for navigation from notifications.
    GET /api/critique/<critique_id>/detail/
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = CritiqueSerializer
    lookup_field = "critique_id"

    def get_queryset(self):
        return Critique.objects.filter(is_deleted=False).select_related(
            "author", "author__artist", "post_id"
        )

    def retrieve(self, request, *args, **kwargs):
        critique = self.get_object()
        serializer = self.get_serializer(critique)

        # Fetch critique replies
        replies_qs = (
            Comment.objects.get_active_objects()
            .filter(critique_id=critique, is_critique_reply=True)
            .select_related("author", "author__artist")
            .order_by("created_at")
        )

        replies_data = CommentSerializer(replies_qs, many=True).data

        return Response(
            {
                "critique": serializer.data,
                "post_id": str(critique.post_id.post_id),
                "replies": replies_data,
            }
        )


@extend_schema(
    tags=["Posts"],
    description="Search posts by description or author (case-insensitive, partial matches)",
    parameters=[
        OpenApiParameter(
            name="q",
            description="Search query for post description, author username, author email, or post ID",
            type=str,
            required=True,
        ),
    ],
    responses={
        200: "PostSearchSerializer(many=True)",
        400: OpenApiResponse(description="Bad Request"),
    },
)
class PostSearchView(ListAPIView):
    """
    Search posts by description or author.
    Admin-only endpoint for use in Django admin filters.
    Returns paginated results (max 50).
    Uses Django session authentication (for admin users).
    """
    serializer_class = PostSearchSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        query = self.request.query_params.get('q', '').strip()

        if not query:
            return Post.objects.none()

        # Build Q objects for case-insensitive partial matches
        q_objects = Q(description__icontains=query) | \
                   Q(author__username__icontains=query) | \
                   Q(author__email__icontains=query)

        # If query is a valid UUID, also try exact ID match
        try:
            post_id = uuid.UUID(query)
            q_objects |= Q(post_id=post_id)
        except (ValueError, TypeError):
            pass  # Not a valid UUID, skip ID search

        return Post.objects.filter(q_objects).select_related('author').order_by('-created_at')[:50]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        })


@extend_schema(
    tags=["Critiques"],
    description="Search critiques by text, impression, or author (case-insensitive, partial matches)",
    parameters=[
        OpenApiParameter(
            name="q",
            description="Search query for critique text, impression, author username, author email, or critique ID",
            type=str,
            required=True,
        ),
    ],
    responses={
        200: "CritiqueSearchSerializer(many=True)",
        400: OpenApiResponse(description="Bad Request"),
    },
)
class CritiqueSearchView(ListAPIView):
    """
    Search critiques by text, impression, or author.
    Admin-only endpoint for use in Django admin filters.
    Returns paginated results (max 50).
    Uses Django session authentication (for admin users).
    """
    serializer_class = CritiqueSearchSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        query = self.request.query_params.get('q', '').strip()

        if not query:
            return Critique.objects.none()

        # Build Q objects for case-insensitive partial matches
        q_objects = Q(text__icontains=query) | \
                   Q(impression__icontains=query) | \
                   Q(author__username__icontains=query) | \
                   Q(author__email__icontains=query)

        # If query is a valid UUID, also try exact ID match
        try:
            critique_id = uuid.UUID(query)
            q_objects |= Q(critique_id=critique_id)
        except (ValueError, TypeError):
            pass  # Not a valid UUID, skip ID search

        return Critique.objects.filter(q_objects).select_related('author').order_by('-created_at')[:50]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        })


# ============================================================================
# Admin Dashboard Views
# ============================================================================

class PostDashboardView(UserPassesTestMixin, TemplateView):
    """Post app dashboard with post, engagement, comment, critique, and novel post statistics"""
    template_name = 'post/admin-dashboard/view.html'

    def test_func(self):
        return self.request.user.is_authenticated and self.request.user.is_superuser

    def get_time_range(self):
        range_param = self.request.GET.get('range', '1m')
        now = timezone.now()
        if range_param == '24h':
            return now - timedelta(hours=24)
        elif range_param == '1w':
            return now - timedelta(weeks=1)
        elif range_param == '1m':
            return now - timedelta(days=30)
        elif range_param == '1y':
            return now - timedelta(days=365)
        else:
            return now - timedelta(days=30)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Only return minimal context - statistics will be loaded via API
        context.update({
            'current_range': self.request.GET.get('range', '1m'),
        })
        # Get Unfold's colors and border_radius from AdminSite's each_context
        admin_context = admin.site.each_context(self.request)
        context.update({
            'colors': admin_context.get('colors'),
            'border_radius': admin_context.get('border_radius'),
        })
        return context


# ============================================================================
# Admin Dashboard Statistics API Views
# ============================================================================


@extend_schema(
    tags=["Dashboard"],
    description="Get post counts statistics (lightweight)",
    responses={200: OpenApiResponse(description="Post counts data")},
)
class PostCountsAPIView(APIView):
    """API endpoint for post counts statistics (lightweight)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('post', 'posts', 'counts')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate statistics
        now = timezone.now()
        data = {
            'total': Post.objects.count(),
            'active': Post.objects.filter(is_deleted=False).count(),
            'deleted': Post.objects.filter(is_deleted=True).count(),
            '24h': Post.objects.filter(created_at__gte=now - timedelta(hours=24)).count(),
            '1w': Post.objects.filter(created_at__gte=now - timedelta(weeks=1)).count(),
            '1m': Post.objects.filter(created_at__gte=now - timedelta(days=30)).count(),
            '1y': Post.objects.filter(created_at__gte=now - timedelta(days=365)).count(),
        }

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get post growth data over time (heavy computation)",
    parameters=[
        OpenApiParameter(name='range', description='Time range: 24h, 1w, 1m, 1y', required=False, type=str),
    ],
    responses={200: OpenApiResponse(description="Post growth data")},
)
class PostGrowthAPIView(APIView):
    """API endpoint for post growth data (heavy computation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        range_param = request.query_params.get('range', '1m')
        cache_key = get_dashboard_cache_key('post', 'posts', f'growth:{range_param}')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate time range
        now = timezone.now()
        if range_param == '24h':
            time_range_start = now - timedelta(hours=24)
        elif range_param == '1w':
            time_range_start = now - timedelta(weeks=1)
        elif range_param == '1m':
            time_range_start = now - timedelta(days=30)
        elif range_param == '1y':
            time_range_start = now - timedelta(days=365)
        else:
            time_range_start = now - timedelta(days=30)

        # Calculate growth data
        growth_data = []
        current_date = time_range_start
        while current_date <= now:
            next_date = current_date + timedelta(days=1)
            count = Post.objects.filter(created_at__gte=current_date, created_at__lt=next_date).count()
            growth_data.append({'x': current_date.strftime('%Y-%m-%d'), 'y': count})
            current_date = next_date

        data = {'growth_data': growth_data}

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get posts by type (heavy aggregation)",
    responses={200: OpenApiResponse(description="Posts by type data")},
)
class PostTypesAPIView(APIView):
    """API endpoint for posts by type (heavy aggregation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('post', 'posts', 'types')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate posts by type
        posts_by_type = Post.objects.values('post_type').annotate(count=Count('post_type')).order_by('-count')
        data = {'data': [{'x': item['post_type'], 'y': item['count']} for item in posts_by_type]}

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get posts per channel (heavy aggregation)",
    responses={200: OpenApiResponse(description="Posts per channel data")},
)
class PostChannelsAPIView(APIView):
    """API endpoint for posts per channel (heavy aggregation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('post', 'posts', 'channels')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate posts per channel (top 10)
        posts_per_channel = Post.objects.values('channel__title').annotate(count=Count('channel__title')).order_by('-count')[:10]
        data = {'data': [{'x': item['channel__title'] or 'No Channel', 'y': item['count']} for item in posts_per_channel]}

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get engagement counts statistics (lightweight)",
    responses={200: OpenApiResponse(description="Engagement counts data")},
)
class EngagementCountsAPIView(APIView):
    """API endpoint for engagement counts statistics (lightweight)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('post', 'engagement', 'counts')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate statistics
        data = {
            'total_hearts': PostHeart.objects.count(),
            'total_praises': PostPraise.objects.count(),
            'total_trophies': PostTrophy.objects.count(),
        }

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get comment counts statistics (lightweight)",
    responses={200: OpenApiResponse(description="Comment counts data")},
)
class CommentCountsAPIView(APIView):
    """API endpoint for comment counts statistics (lightweight)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('post', 'comments', 'counts')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate statistics
        now = timezone.now()
        data = {
            'total': Comment.objects.count(),
            'active': Comment.objects.filter(is_deleted=False).count(),
            'deleted': Comment.objects.filter(is_deleted=True).count(),
            '24h': Comment.objects.filter(created_at__gte=now - timedelta(hours=24)).count(),
            '1w': Comment.objects.filter(created_at__gte=now - timedelta(weeks=1)).count(),
            '1m': Comment.objects.filter(created_at__gte=now - timedelta(days=30)).count(),
            '1y': Comment.objects.filter(created_at__gte=now - timedelta(days=365)).count(),
        }

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get comment growth data over time (heavy computation)",
    parameters=[
        OpenApiParameter(name='range', description='Time range: 24h, 1w, 1m, 1y', required=False, type=str),
    ],
    responses={200: OpenApiResponse(description="Comment growth data")},
)
class CommentGrowthAPIView(APIView):
    """API endpoint for comment growth data (heavy computation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        range_param = request.query_params.get('range', '1m')
        cache_key = get_dashboard_cache_key('post', 'comments', f'growth:{range_param}')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate time range
        now = timezone.now()
        if range_param == '24h':
            time_range_start = now - timedelta(hours=24)
        elif range_param == '1w':
            time_range_start = now - timedelta(weeks=1)
        elif range_param == '1m':
            time_range_start = now - timedelta(days=30)
        elif range_param == '1y':
            time_range_start = now - timedelta(days=365)
        else:
            time_range_start = now - timedelta(days=30)

        # Calculate growth data
        growth_data = []
        current_date = time_range_start
        while current_date <= now:
            next_date = current_date + timedelta(days=1)
            count = Comment.objects.filter(created_at__gte=current_date, created_at__lt=next_date).count()
            growth_data.append({'x': current_date.strftime('%Y-%m-%d'), 'y': count})
            current_date = next_date

        data = {'growth_data': growth_data}

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get comments by type (heavy aggregation)",
    responses={200: OpenApiResponse(description="Comments by type data")},
)
class CommentTypesAPIView(APIView):
    """API endpoint for comments by type (heavy aggregation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('post', 'comments', 'types')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate comments by type
        comments_by_type = Comment.objects.values('is_critique_reply').annotate(count=Count('is_critique_reply')).order_by('-count')
        data = {'data': [{'x': 'Critique Reply' if item['is_critique_reply'] else 'Regular Comment', 'y': item['count']} for item in comments_by_type]}

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get critique counts statistics (lightweight)",
    responses={200: OpenApiResponse(description="Critique counts data")},
)
class CritiqueCountsAPIView(APIView):
    """API endpoint for critique counts statistics (lightweight)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('post', 'critiques', 'counts')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate statistics
        now = timezone.now()
        data = {
            'total': Critique.objects.count(),
            '24h': Critique.objects.filter(created_at__gte=now - timedelta(hours=24)).count(),
            '1w': Critique.objects.filter(created_at__gte=now - timedelta(weeks=1)).count(),
            '1m': Critique.objects.filter(created_at__gte=now - timedelta(days=30)).count(),
            '1y': Critique.objects.filter(created_at__gte=now - timedelta(days=365)).count(),
        }

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get critique growth data over time (heavy computation)",
    parameters=[
        OpenApiParameter(name='range', description='Time range: 24h, 1w, 1m, 1y', required=False, type=str),
    ],
    responses={200: OpenApiResponse(description="Critique growth data")},
)
class CritiqueGrowthAPIView(APIView):
    """API endpoint for critique growth data (heavy computation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        range_param = request.query_params.get('range', '1m')
        cache_key = get_dashboard_cache_key('post', 'critiques', f'growth:{range_param}')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate time range
        now = timezone.now()
        if range_param == '24h':
            time_range_start = now - timedelta(hours=24)
        elif range_param == '1w':
            time_range_start = now - timedelta(weeks=1)
        elif range_param == '1m':
            time_range_start = now - timedelta(days=30)
        elif range_param == '1y':
            time_range_start = now - timedelta(days=365)
        else:
            time_range_start = now - timedelta(days=30)

        # Calculate growth data
        growth_data = []
        current_date = time_range_start
        while current_date <= now:
            next_date = current_date + timedelta(days=1)
            count = Critique.objects.filter(created_at__gte=current_date, created_at__lt=next_date).count()
            growth_data.append({'x': current_date.strftime('%Y-%m-%d'), 'y': count})
            current_date = next_date

        data = {'growth_data': growth_data}

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get critiques by impression (heavy aggregation)",
    responses={200: OpenApiResponse(description="Critiques by impression data")},
)
class CritiqueImpressionsAPIView(APIView):
    """API endpoint for critiques by impression (heavy aggregation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('post', 'critiques', 'impressions')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate critiques by impression
        critiques_by_impression = Critique.objects.values('impression').annotate(count=Count('impression')).order_by('-count')
        data = {'data': [{'x': item['impression'], 'y': item['count']} for item in critiques_by_impression]}

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get novel post counts statistics (lightweight)",
    responses={200: OpenApiResponse(description="Novel post counts data")},
)
class NovelCountsAPIView(APIView):
    """API endpoint for novel post counts statistics (lightweight)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('post', 'novels', 'counts')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate statistics
        total_novel_posts = NovelPost.objects.count()
        average_chapters_per_novel = NovelPost.objects.values('post_id').annotate(count=Count('post_id')).aggregate(avg=Avg('count'))['avg'] or 0

        data = {
            'total': total_novel_posts,
            'average_chapters': round(average_chapters_per_novel, 2),
        }

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


class GlobalTopPostsView(APIView):
    """
    Fetch cached global top posts.
    GET /api/posts/top/?limit=25&post_type=image
    
    Query Parameters:
        limit: Number of posts to return (5, 10, 25, 50, 100). Default: 25
        post_type: Optional filter by post type (default, novel, image, video)
    
    Returns:
        List of top posts in ranked order
    """
    permission_classes = [AllowAny]  # Public endpoint

    def get(self, request):
        # Get limit from query params, default to 25
        limit = request.query_params.get('limit', '25')
        post_type = request.query_params.get('post_type', None)

        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 25

        # Validate limit (only allow specific values)
        valid_limits = [5, 10, 25, 50, 100]
        if limit not in valid_limits:
            limit = 25  # Default to 25 if invalid

        # Validate post_type if provided
        if post_type:
            from common.utils.choices import POST_TYPE_CHOICES
            valid_types = [choice[0] for choice in POST_TYPE_CHOICES]
            if post_type not in valid_types:
                return Response(
                    {'error': f'Invalid post_type. Valid types: {", ".join(valid_types)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Try to get from cache
        from post.algorithm import get_cached_top_posts
        cached_posts = get_cached_top_posts(limit=limit, post_type=post_type)

        if cached_posts is None:
            # For testing: return 404 if cache is not available
            # In production, you might want to fallback to most hearted posts
            return Response(
                {
                    'error': 'Top posts cache not available. Please run: python manage.py generate_top_posts'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'results': cached_posts[:limit],
            'count': len(cached_posts[:limit]),
            'limit': limit,
            'post_type': post_type
        }, status=status.HTTP_200_OK)


class GenerateTopPostsView(APIView):
    """
    Manually trigger generation of top posts cache.
    POST /api/posts/top/generate/?limit=100&post_type=image

    Query Parameters:
        limit: Number of posts to generate (default: 100, max: 100)
        post_type: Optional filter by post type (default, novel, image, video)

    Note: This endpoint can be called to refresh the cache manually.
    """
    permission_classes = [IsAuthenticated]  # Require authentication

    def post(self, request):
        # Get limit from query params
        limit = request.query_params.get('limit', '100')
        post_type = request.query_params.get('post_type', None)

        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 100

        # Cap at 100
        limit = min(limit, 100)

        # Validate post_type if provided
        if post_type:
            from common.utils.choices import POST_TYPE_CHOICES
            valid_types = [choice[0] for choice in POST_TYPE_CHOICES]
            if post_type not in valid_types:
                return Response(
                    {'error': f'Invalid post_type. Valid types: {", ".join(valid_types)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            from post.algorithm import generate_top_posts_cache
            posts_data = generate_top_posts_cache(limit=limit, post_type=post_type)

            return Response({
                'message': f'Successfully generated {len(posts_data)} top posts',
                'count': len(posts_data),
                'limit': limit,
                'post_type': post_type
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Failed to generate top posts: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GenerateTopPostsViaApiKeyView(APIView):
    """
    Manually trigger generation of top posts cache.
    Requires API key in header.
    POST /api/posts/top/generate/?limit=100&post_type=image

    Query Parameters:
        limit: Number of posts to generate (default: 100, max: 100)
        post_type: Optional filter by post type (default, novel, image, video)

    Note: This endpoint can be called to refresh the cache manually.
    """
    permission_classes = [HasAPIKey]  # Require authentication

    def post(self, request):
        # Get limit from query params
        limit = request.query_params.get('limit', '100')
        post_type = request.query_params.get('post_type', None)

        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 100

        # Cap at 100
        limit = min(limit, 100)

        # Validate post_type if provided
        if post_type:
            from common.utils.choices import POST_TYPE_CHOICES
            valid_types = [choice[0] for choice in POST_TYPE_CHOICES]
            if post_type not in valid_types:
                return Response(
                    {'error': f'Invalid post_type. Valid types: {", ".join(valid_types)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            from post.algorithm import generate_top_posts_cache
            posts_data = generate_top_posts_cache(limit=limit, post_type=post_type)

            return Response({
                'message': f'Successfully generated {len(posts_data)} top posts',
                'count': len(posts_data),
                'limit': limit,
                'post_type': post_type
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Failed to generate top posts: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
