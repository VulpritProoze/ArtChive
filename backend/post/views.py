from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .serializers import *
from .models import *

class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostCreateSerializer
    permission_classes = [IsAuthenticated]
    
class PostView(generics.ListAPIView):
    queryset = Post.objects.prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostViewSerializer
    permission_classes = [IsAuthenticated]
    
class PostDetailView(generics.RetrieveAPIView):
    queryset = Post.objects.prefetch_related(
            'novel_post',
        ).select_related(
            'author',
            )
    serializer_class = PostViewSerializer
    lookup_field = 'post_id'
    permission_classes = [IsAuthenticated]