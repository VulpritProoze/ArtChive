from collections import deque

from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
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
from core.models import User
from core.permissions import IsAuthorOrSuperUser

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
from .pagination import CommentPagination, CritiquePagination, PostPagination
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


class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostCreateSerializer
    permission_classes = [IsAuthenticated]

    # Allow only the authenticated user to post
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class PostListView(generics.ListAPIView):
    '''
    Paginated list of all posts
    Example URLs:
    - /posts/ (first 10 posts)
    - /posts/?page=2 (next 10 posts)
    - /posts/?page_size=20 (20 posts per page)
    '''
    serializer_class = PostListViewSerializer
    pagination_class = PostPagination

    def get_queryset(self):
        '''
        Fetch public posts, and also posts from collectives the user has joined.
        '''
        user = self.request.user
        queryset = Post.objects.prefetch_related(
            'novel_post',
            'channel',
            'channel__collective'  # needed for collective filtering
        ).select_related(
            'author',
        ).order_by('-created_at')

        # Always include public posts (from the known public channel)
        public_channel_id = '00000000-0000-0000-0000-000000000001'
        public_posts = Q(channel=public_channel_id)

        if user.is_authenticated:
            joined_collectives = CollectiveMember.objects.filter(
                member=user
            ).values_list('collective_id', flat=True)

            # Posts from joined collectives
            joined_posts = Q(channel__collective__in=joined_collectives)

            # Combine: public posts OR posts fromoined collectives
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

        return Post.objects.filter(author=user).prefetch_related(
            'novel_post',
        ).select_related(
            'author',
        ).order_by('-created_at')

class PostCommentsView(generics.ListAPIView):
    '''
    Fetch all top-level comments
    '''
    serializer_class = TopLevelCommentsViewSerializer
    pagination_class = CommentPagination

    def get_queryset(self):
        post_id = self.kwargs['post_id']

        return Comment.objects.filter(
            post_id=post_id,
            replies_to__isnull=True,
            critique_id__isnull=True,
            is_deleted=False    # Fetch only non soft-deleted comments
            ).annotate(
                reply_count=Count('comment_reply',
                    filter=Q(
                        comment_reply__is_deleted=False
                    ))
            ).select_related(
                'author',
            ).order_by(
                '-created_at'
            )

    def list(self, request, *args, **kwargs):
        # Get the full queryset (before pagination)
        queryset = self.filter_queryset(self.get_queryset())
        post_id = self.kwargs['post_id']

        total_comments = Comment.objects.filter(
            post_id=post_id,
            is_deleted=False
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
        return Comment.objects.filter(
            replies_to__isnull=False,
            critique_id__isnull=True,
            is_deleted=False    # Fetch only non soft-deleted comments
            ).select_related(
                'author',
            ).order_by(
                '-created_at'
            )

class CommentReplyCreateView(generics.CreateAPIView):
    serializer_class = CommentReplyCreateSerializer
    permission_classes = [IsAuthenticated]

class CommentReplyUpdateView(generics.UpdateAPIView):
    queryset = Comment.objects.filter(replies_to__isnull=False, is_deleted=False)
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

        return Comment.objects.filter(
            replies_to=parent_comment,      # ← replies TO this comment
            critique_id__isnull=True,
            is_deleted=False
        ).select_related(
            'author'
        ).order_by('-created_at')

class PostDetailView(generics.RetrieveAPIView):
    queryset = Post.objects.prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostDetailViewSerializer
    lookup_field = 'post_id'

class PostUpdateView(generics.UpdateAPIView):
    queryset = Post.objects.prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostUpdateSerializer
    lookup_field = 'post_id'
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]

class PostDeleteView(generics.DestroyAPIView):
    queryset = Post.objects.prefetch_related(
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
    queryset = Comment.objects.filter(is_deleted=False).select_related('author', 'post_id')
    serializer_class = CommentSerializer
    pagination_class = CommentPagination


class CommentDetailView(generics.RetrieveAPIView):
    """
    View for retrieving a single comment.
    No authentication required if comments are public.
    """
    queryset = Comment.objects.filter(is_deleted=False).select_related('author', 'post_id')
    serializer_class = CommentSerializer
    lookup_field = 'comment_id'



class CommentCreateView(generics.CreateAPIView):
    queryset = Comment.objects.filter(is_deleted=False)
    serializer_class = CommentCreateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class CommentUpdateView(generics.UpdateAPIView):
    """
    View for updating a comment.
    Requires authentication and ownership/admin rights.
    """
    queryset = Comment.objects.filter(is_deleted=False).select_related('author', 'post_id')
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
            Comment.objects.filter(is_deleted=False),
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
                replies = Comment.objects.filter(
                    replies_to=current,
                    is_deleted=False
                )
                queue.extend(replies)

        # Bulk update to soft-delete
        if comments_to_delete:
            comment_ids = [c.comment_id for c in comments_to_delete]
            Comment.objects.filter(comment_id__in=comment_ids).update(is_deleted=True)

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
    """List all hearts for a specific post"""
    serializer_class = PostHeartSerializer

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
        return Critique.objects.filter(
            post_id=post_id,
            is_deleted=False
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
        serializer.save()

class CritiqueDetailView(RetrieveAPIView):
    """
    Retrieve a specific critique
    """
    serializer_class = CritiqueSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'critique_id'

    def get_queryset(self):
        return Critique.objects.filter(is_deleted=False).select_related('author', 'post_id')

class CritiqueUpdateView(UpdateAPIView):
    """
    Update a specific critique
    """
    serializer_class = CritiqueUpdateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = 'critique_id'

    def get_queryset(self):
        return Critique.objects.filter(is_deleted=False)

    def perform_update(self, serializer):
        # Ensure the user owns the critique
        critique = self.get_object()
        if critique.author != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("You can only update your own critiques")
        serializer.save()

class CritiqueDeleteView(DestroyAPIView):
    """
    Delete a specific critique (soft delete)
    """
    serializer_class = CritiqueDeleteSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = 'critique_id'

    def get_queryset(self):
        return Critique.objects.filter(is_deleted=False)

    def delete(self, request, *args, **kwargs):
        critique = self.get_object()

        # Check ownership
        if critique.author != request.user and not request.user.is_staff:
            return Response(
                {"error": "You can only delete your own critiques"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Soft delete
        critique.is_deleted = True
        critique.save()

        return Response(
            {"message": "Critique deleted successfully"},
            status=status.HTTP_200_OK
        )

class UserCritiquesListView(ListAPIView):
    """
    List all critiques by the current user
    """
    serializer_class = CritiqueSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CritiquePagination

    def get_queryset(self):
        return Critique.objects.filter(
            author=self.request.user,
            is_deleted=False
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
        return Comment.objects.filter(
            critique_id=critique_id,
            is_critique_reply=True,
            is_deleted=False
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
        serializer.save()

class CritiqueReplyDetailView(generics.RetrieveAPIView):
    """
    Retrieve a specific critique reply
    GET /api/critiques/replies/<comment_id>/
    """
    serializer_class = CritiqueReplySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'comment_id'

    def get_queryset(self):
        return Comment.objects.filter(
            is_critique_reply=True,
            is_deleted=False
        ).select_related('author', 'post_id', 'critique_id')


# ============================================================================
# POST PRAISE VIEWS
# ============================================================================

class PostPraiseCreateView(generics.CreateAPIView):
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
    serializer_class = PostPraiseCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_create(serializer)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to create praise: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PostPraiseListView(generics.ListAPIView):
    """
    List all praises for a specific post
    GET /api/posts/<post_id>/praises/
    """
    serializer_class = PostPraiseSerializer
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


class PostPraiseCountView(APIView):
    """
    Get praise count for a specific post
    GET /api/posts/<post_id>/praises/count/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, post_id):
        post = get_object_or_404(Post, post_id=post_id)
        praise_count = PostPraise.objects.filter(post_id=post).count()

        # Check if current user has praised this post
        is_praised_by_user = PostPraise.objects.filter(
            post_id=post,
            author=request.user
        ).exists()

        return Response({
            'post_id': str(post_id),
            'praise_count': praise_count,
            'is_praised_by_user': is_praised_by_user
        }, status=status.HTTP_200_OK)


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

class PostTrophyCreateView(generics.CreateAPIView):
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
    serializer_class = PostTrophyCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_create(serializer)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to award trophy: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PostTrophyListView(generics.ListAPIView):
    """
    List all trophies for a specific post
    GET /api/posts/<post_id>/trophies/
    """
    serializer_class = PostTrophySerializer
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


class PostTrophyCountView(APIView):
    """
    Get trophy count for a specific post (grouped by trophy type)
    GET /api/posts/<post_id>/trophies/count/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, post_id):
        post = get_object_or_404(Post, post_id=post_id)

        # Count trophies by type
        trophy_counts = {}
        total_count = 0

        for trophy_type in TrophyType.objects.all():
            count = PostTrophy.objects.filter(
                post_id=post,
                post_trophy_type=trophy_type
            ).count()
            trophy_counts[trophy_type.trophy] = count
            total_count += count

        # Check which trophies current user has awarded to this post
        user_awarded_trophies = list(
            PostTrophy.objects.filter(
                post_id=post,
                author=request.user
            ).values_list('post_trophy_type__trophy', flat=True)
        )

        return Response({
            'post_id': str(post_id),
            'trophy_counts': trophy_counts,
            'total_trophy_count': total_count,
            'user_awarded_trophies': user_awarded_trophies
        }, status=status.HTTP_200_OK)


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
