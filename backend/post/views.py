from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .serializers import PostViewSerializer, PostCreateUpdateSerializer, PostDeleteSerializer
from .models import Post
from core.permissions import IsOwnerOrSuperAdmin

class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]
    
class PostView(generics.ListAPIView):
    queryset = Post.objects.prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostViewSerializer
    
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