from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, CreateAPIView, RetrieveAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.permissions import IsCollectiveMember
from post.models import Post
from .serializers import (
    CollectiveDetailsSerializer, CollectiveCreateSerializer, 
    ChannelCreateSerializer, ChannelSerializer, InsideCollectiveViewSerializer, 
    InsideCollectivePostsViewSerializer, InsideCollectivePostsCreateUpdateSerializer, 
    JoinCollectiveSerializer, CollectiveMemberSerializer,
    BecomeCollectiveAdminSerializer, LeaveCollectiveSerializer
)
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
    serializer_class = InsideCollectiveViewSerializer
    permission_classes = [IsAuthenticated, IsCollectiveMember]
    lookup_field = 'collective_id'

    def get_queryset(self):
        return Collective.objects.prefetch_related(
            'collective_member',
            'collective_member__member'
        ).all()

class InsideCollectivePostsView(ListAPIView):
    serializer_class = InsideCollectivePostsViewSerializer
    pagination_class = CollectivePostsPagination
    permission_classes = [IsAuthenticated, IsCollectiveMember]

    # Filter out posts by channel and collective
    def get_queryset(self):
        channel_id = self.kwargs['channel_id']
        channel = get_object_or_404(Channel, channel_id=channel_id)
        return Post.objects.filter(channel=channel).select_related('author').order_by('-created_at')

class InsideCollectivePostsCreateView(CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = InsideCollectivePostsCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsCollectiveMember]
    
    def perform_create(self, serializer):
        channel_id = self.kwargs['channel_id']
        channel = get_object_or_404(Channel, channel_id=channel_id)
        serializer.save(author=self.request.user, channel=channel)

class JoinCollectiveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinCollectiveSerializer(data=request.data, context={'request': request})

        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        username = request.user.username
        
        return Response({
            'message': f'{username} has successfully joined this collective',
            'collective_id': str(member.collective_id),
        }, status=status.HTTP_200_OK)

class BecomeCollectiveAdminView(APIView):
    permission_classes = [IsAuthenticated, IsCollectiveMember]
    
    def patch(self, request, collective_id=None):
        if collective_id:
            data = { 'collective_id': collective_id }
        else:
            data = request.data

        serializer = BecomeCollectiveAdminSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Successfully promoted to admin.'}, status=status.HTTP_200_OK)

class LeaveCollectiveView(APIView):
    permission_classes = [IsAuthenticated, IsCollectiveMember]

    def delete(self, request, collective_id=None):
        if collective_id:
            data = { 'collective_id': collective_id }
        else:
            data = request.data

        serializer = LeaveCollectiveSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        collective_id = serializer.validated_data['collective_id']

        CollectiveMember.objects.filter(member=request.user, collective_id=collective_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class IsCollectiveMemberView(RetrieveAPIView):
    """
    Check if authenticated user is a member of a given collective.
    (Possibly unused route)
    """
    queryset = CollectiveMember.objects.all()
    lookup_field = 'collective_id'
    permission_classes = [IsAuthenticated, IsCollectiveMember]
    serializer_class = CollectiveMemberSerializer

class CollectiveMembershipsView(ListAPIView):
    """
    Fetch the collectives that the authenticated user is a member of.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CollectiveMemberSerializer

    def get_queryset(self):
        return CollectiveMember.objects.filter(member=self.request.user).all()