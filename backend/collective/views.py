from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView, CreateAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsCollectiveMember
from post.models import Post
from .serializers import CollectiveDetailsSerializer, CollectiveCreateSerializer, ChannelCreateSerializer, ChannelSerializer, InsideCollectiveViewSerializer, InsideCollectivePostsViewSerializer, InsideCollectivePostsCreateUpdateSerializer
from .pagination import CollectiveDetailsPagination, CollectivePostsPagination
from .models import Collective, Channel, CollectiveMember

class CollectiveDetailsView(ListAPIView):
    serializer_class = CollectiveDetailsSerializer
    pagination_class = CollectiveDetailsPagination

    def get_queryset(self):
        return Collective.objects.prefetch_related('collective_channel').all()

class CollectiveCreateView(CreateAPIView):
    """
    Example usage:
    {
        "title": "Digital Artists United",
        "description": "A collaborative space for digital painters, illustrators, and animators.",
        "status": "active",
        "rules": [
            "No spam or self-promotion",
            "Respect copyright and attribution",
            "Be respectful in discussions",
            "Follow community guidelines"
        ],
        "artist_types": [
            "digital arts",
            "illustration",
            "animation",
            "graphic design"
        ]
    }
    -> Feature addition required:
    1. On create, also create the ff. channels:
    a. general, post type: post_channel
    b. audio, post type: media_channel
    c. video, post type: media_channel
    """
    queryset = Collective.objects.all()
    serializer_class = CollectiveCreateSerializer
    permission_classes = [IsAuthenticated]

class ChannelListView(ListAPIView):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [IsAuthenticated]

class ChannelCreateView(CreateAPIView):
    """
    I have to add later:
    - collective admin member role
    - only the admins of the collective can add a channel
    + better yet, make it customizable. only certain admins are allowed certain actions
    """
    queryset = Channel.objects.all()
    serializer_class = ChannelCreateSerializer
    permission_classes = [IsAuthenticated]

class InsideCollectiveView(RetrieveAPIView):
    """
    Fetch needed details to display for a collective.
    Used for 'collective/<id>/ sidebar and other information 
    """
    serializer_class = InsideCollectiveViewSerializer
    permission_classes = [IsAuthenticated, IsCollectiveMember]
    lookup_field = 'collective_id'

    def get_queryset(self):
        return Collective.objects.prefetch_related(
            'collective_member',
            'collective_member__member'
        ).all()

class InsideCollectivePostsView(ListAPIView):
    """
    Need a permissions check: If user is joined in related collective
    """
    serializer_class = InsideCollectivePostsViewSerializer
    pagination_class = CollectivePostsPagination
    permission_classes = [IsAuthenticated, IsCollectiveMember]

    # Filter out posts by channel and collective
    def get_queryset(self):
        channel_id = self.kwargs['channel_id']
        channel = get_object_or_404(Channel, channel_id=channel_id)
        return Post.objects.filter(channel=channel).select_related('author').order_by('-created_at')

class InsideCollectivePostsCreateView(CreateAPIView):
    """
    Need a permissions check: If user is joined in related collective
    """
    queryset = Post.objects.all()
    serializer_class = InsideCollectivePostsCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsCollectiveMember]
    
    def perform_create(self, serializer):
        channel_id = self.kwargs['channel_id']
        channel = get_object_or_404(Channel, channel_id=channel_id)
        serializer.save(author=self.request.user, channel=channel)