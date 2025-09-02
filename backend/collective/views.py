from rest_framework.generics import ListAPIView, CreateAPIView
from rest_framework.permissions import IsAuthenticated
from .serializers import CollectiveDetailsSerializer, CollectiveCreateSerializer, ChannelCreateSerializer, ChannelSerializer
from .pagination import CollectiveDetailsPagination
from .models import Collective, Channel

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