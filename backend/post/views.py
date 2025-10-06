from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import CreateAPIView, ListAPIView, DestroyAPIView, UpdateAPIView, RetrieveAPIView
from .serializers import (
    PostCreateSerializer, PostDeleteSerializer,
    CommentSerializer, CommentDeleteSerializer,
    PostHeartCreateSerializer, PostHeartSerializer, PostUpdateSerializer,
    TopLevelCommentsViewSerializer, CommentReplyViewSerializer,
    CommentReplyCreateSerializer, ReplyUpdateSerializer,
    CommentCreateSerializer, CommentUpdateSerializer,
    CritiqueSerializer, CritiqueCreateSerializer, 
    CritiqueUpdateSerializer, CritiqueDeleteSerializer,
    CritiqueReplySerializer, CritiqueReplyCreateSerializer,
    PostListViewSerializer, PostDetailViewSerializer
)
from core.models import User
from core.permissions import IsAuthorOrSuperUser
from collective.models import CollectiveMember
from .models import Post, Comment, NovelPost, PostHeart, Critique
from .pagination import PostPagination, CommentPagination, CritiquePagination


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
        """
        Fetch public posts, and also posts from collectives the user has joined.
        """
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
    """
    Fetch user's list of posts
    Example URLs:
    - /posts/me/1/ (first 10 posts)
    - /posts/me/1/?page=2 (next 10 posts)
    - /posts/me/1/?page_size=20 (20 posts per page)
    """
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
        return Comment.objects.filter(
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

class CommentDeleteView(generics.DestroyAPIView):
    """
    View for deleting a comment.
    Requires authentication and ownership/admin rights + confirmation.
    """
    queryset = Comment.objects.filter(is_deleted=False).select_related('author', 'post_id')
    serializer_class = CommentDeleteSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = 'comment_id'

    def perform_destroy(self, instance):
        # Soft delete instead of actual deletion
        instance.is_deleted = True
        instance.save()

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