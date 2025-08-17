from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .serializers import (
    PostViewSerializer, PostCreateUpdateSerializer, PostDeleteSerializer,
    CommentSerializer, CommentCreateUpdateSerializer, CommentDeleteSerializer
)
from core.permissions import IsOwnerOrSuperAdmin
from .models import Post, Comment
from .pagination import PostPagination, CommentPagination


class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostCreateUpdateSerializer
    permission_classes = [IsAuthenticated]
    

class PostListView(generics.ListAPIView):
    """
    Paginated list of all posts
    Example URLs:
    - /posts/ (first 10 posts)
    - /posts/?page=2 (next 10 posts)
    - /posts/?page_size=20 (20 posts per page)
    """
    queryset = Post.objects.prefetch_related(
            'novel_post',
        ).select_related(
            'author',
        )
    serializer_class = PostViewSerializer
    pagination_class = PostPagination  
    

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
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]


class PostDeleteView(generics.DestroyAPIView):
    queryset = Post.objects.prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostDeleteSerializer
    lookup_field = 'post_id'
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]


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


class CommentUpdateView(generics.UpdateAPIView):
    """
    View for updating a comment.
    Requires authentication and ownership/admin rights.
    """
    queryset = Comment.objects.select_related('author', 'post_id')
    serializer_class = CommentCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]
    lookup_field = 'comment_id'

class CommentDeleteView(generics.DestroyAPIView):
    """
    View for deleting a comment.
    Requires authentication and ownership/admin rights + confirmation.
    """
    queryset = Comment.objects.select_related('author', 'post_id')
    serializer_class = CommentDeleteSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]
    lookup_field = 'comment_id'