from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import (
    PostViewSerializer, PostCreateUpdateSerializer, PostDeleteSerializer,
    CommentSerializer, CommentCreateUpdateSerializer, CommentDeleteSerializer,
)
from core.models import User
from collective.models import CollectiveMember
from .models import Post, Comment, NovelPost
from .pagination import PostPagination, CommentPagination


class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostCreateUpdateSerializer
    permission_classes = [IsAuthenticated]

    # Allow only the authenticated user to post
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class PostListView(generics.ListAPIView):
    """
    Paginated list of all posts
    Example URLs:
    - /posts/ (first 10 posts)
    - /posts/?page=2 (next 10 posts)
    - /posts/?page_size=20 (20 posts per page)
    """
    serializer_class = PostViewSerializer
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
    serializer_class = PostViewSerializer
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
    serializer_class = CommentSerializer
    pagination_class = CommentPagination
    
    def get_queryset(self):
        post_id = self.kwargs['post_id']
        # Verify post exists and get comments
        post = get_object_or_404(Post, post_id=post_id)
        return Comment.objects.filter(post_id=post_id).order_by('-created_at')

class PostDetailView(generics.RetrieveAPIView):
    queryset = Post.objects.prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostViewSerializer
    lookup_field = 'post_id'

class PostUpdateView(generics.UpdateAPIView):
    queryset = Post.objects.prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostCreateUpdateSerializer
    lookup_field = 'post_id'
    permission_classes = [IsAuthenticated]

class PostDeleteView(generics.DestroyAPIView):
    queryset = Post.objects.prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostDeleteSerializer
    lookup_field = 'post_id'
    permission_classes = [IsAuthenticated]

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
    queryset = Comment.objects.select_related('author', 'post_id')
    serializer_class = CommentSerializer
    pagination_class = CommentPagination  


class CommentDetailView(generics.RetrieveAPIView):
    """
    View for retrieving a single comment.
    No authentication required if comments are public.
    """
    queryset = Comment.objects.select_related('author', 'post_id')
    serializer_class = CommentSerializer
    lookup_field = 'comment_id'



class CommentCreateView(generics.CreateAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentCreateUpdateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class CommentUpdateView(generics.UpdateAPIView):
    """
    View for updating a comment.
    Requires authentication and ownership/admin rights.
    """
    queryset = Comment.objects.select_related('author', 'post_id')
    serializer_class = CommentCreateUpdateSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'comment_id'

class CommentDeleteView(generics.DestroyAPIView):
    """
    View for deleting a comment.
    Requires authentication and ownership/admin rights + confirmation.
    """
    queryset = Comment.objects.select_related('author', 'post_id')
    serializer_class = CommentDeleteSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'comment_id'