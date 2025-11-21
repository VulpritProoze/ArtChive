from django.core.cache import cache
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.utils.defaults import DEFAULT_COLLECTIVE_CHANNELS
from core.permissions import IsCollectiveAdmin, IsCollectiveMember
from post.models import Post

from .cache_utils import get_collective_memberships_cache_key
from .models import AdminRequest, Channel, Collective, CollectiveMember
from .pagination import CollectiveDetailsPagination, CollectivePostsPagination
from .serializers import (
    AcceptAdminRequestSerializer,
    AdminRequestCreateSerializer,
    AdminRequestSerializer,
    BecomeCollectiveAdminSerializer,
    ChannelCreateSerializer,
    ChannelSerializer,
    ChannelUpdateSerializer,
    CollectiveCreateSerializer,
    CollectiveDetailsSerializer,
    CollectiveMemberDetailSerializer,
    CollectiveMemberSerializer,
    DemoteAdminSerializer,
    InsideCollectivePostsViewSerializer,
    InsideCollectiveViewSerializer,
    JoinCollectiveSerializer,
    KickMemberSerializer,
    LeaveCollectiveSerializer,
    PromoteMemberSerializer,
)


class CollectiveDetailsView(ListAPIView):
    serializer_class = CollectiveDetailsSerializer
    pagination_class = CollectiveDetailsPagination

    def get_queryset(self):
        return Collective.objects.prefetch_related(
            'collective_channel',
            'collective_member',
            'collective_member__member__user_wallet',
        ).all()

    def get_serializer_context(self):
        """Pass request to serializer for user membership info."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class CollectiveCreateView(APIView):
    """
    Create a new Collective along with default channels.

    Example usage (multipart/form-data):
    - title: 'Digital Artists United'
    - description: 'A collaborative space...'
    - rules: ['Rule 1', 'Rule 2']  (send as multiple rules[]=Rule1&rules[]=Rule2 or JSON array)
    - artist_types: ['digital arts', 'illustration']
    - picture: <uploaded image file>
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]  # Required for file uploads

    def post(self, request, *args, **kwargs):
        # Step 1: Deserialize and validate input
        serializer = CollectiveCreateSerializer(
            data=request.data,
            context={'request': request}  # Optional: helps with absolute URLs in representation
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Step 2: Create collective + channels + membership in atomic transaction
        try:
            with transaction.atomic():
                # Use serializer.save() — handles picture field correctly
                collective = serializer.save()

                # Create default channels
                for channel_config in DEFAULT_COLLECTIVE_CHANNELS:
                    Channel.objects.create(
                        collective=collective,
                        title=channel_config["title"],
                        channel_type=channel_config["channel_type"],
                        description=channel_config["description"]
                    )

                # Automatically join the creator as an admin member
                CollectiveMember.objects.create(
                    collective_id=collective,
                    member=request.user,
                    collective_role='admin'
                )

                output_serializer = CollectiveCreateSerializer(
                    collective,
                    context={'request': request}
                )
                return Response(output_serializer.data, status=status.HTTP_201_CREATED)

        except Exception:
            return Response(
                {"detail": "Failed to create collective and channels."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ChannelListView(ListAPIView):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [IsAuthenticated]

class ChannelCreateView(CreateAPIView):
    queryset = Channel.objects.all()
    serializer_class = ChannelCreateSerializer
    lookup_field = 'collective_id'
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]

class ChannelUpdateView(UpdateAPIView):
    """
    Update a channel's title or description.
    Only admins of the channel's collective can update it.
    """
    queryset = Channel.objects.all()
    serializer_class = ChannelUpdateSerializer
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]
    lookup_field = 'collective_id'

    # Modify object fetch after serialization
    def get_object(self):
        collective_id = self.kwargs['collective_id']
        channel_id = self.request.data.get('channel_id')
        return get_object_or_404(Channel,
            channel_id=channel_id,
            collective__collective_id=collective_id
        )


class ChannelDeleteView(DestroyAPIView):
    """
    Delete a channel.
    Only admins of the channel's collective can delete it.
    """
    queryset = Channel.objects.all()
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]
    lookup_field = 'collective_id'

    # Modify object fetch after serialization
    def get_object(self):
        collective_id = self.kwargs['collective_id']
        channel_id = self.request.data.get('channel_id')
        return get_object_or_404(Channel,
            channel_id=channel_id,
            collective__collective_id=collective_id
        )

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

    # Filter out posts by channel and collective, only show active (non-deleted) posts
    def get_queryset(self):
        channel_id = self.kwargs['channel_id']
        channel = get_object_or_404(Channel, channel_id=channel_id)
        # Use get_active_objects() to filter out soft-deleted posts
        return Post.objects.get_active_objects().filter(channel=channel).select_related('author').order_by('-created_at')

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

'''
 Simple implementation (will have to change to sending request, and then admin on other side will accept)
 '''
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

    Cache is automatically invalidated when user joins/leaves a collective or role changes.
    Cache TTL: 10 minutes (600 seconds)
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CollectiveMemberSerializer

    def list(self, request, *args, **kwargs):
        """Override list to add caching support."""
        user_id = request.user.id
        cache_key = get_collective_memberships_cache_key(user_id)

        # Try to get from cache
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # If not in cache, get from database
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        # Cache the response data for 10 minutes (600 seconds)
        cache.set(cache_key, serializer.data, 600)

        return Response(serializer.data)

    def get_queryset(self):
        return CollectiveMember.objects.filter(
            member=self.request.user
        ).select_related('collective_id').all()

# ============================================================================
# COLLECTIVE MEMBER MANAGEMENT VIEWS
# ============================================================================

class CollectiveMembersListView(ListAPIView):
    """
    List all members of a collective.
    GET /api/collective/<collective_id>/members/
    """
    serializer_class = CollectiveMemberDetailSerializer
    permission_classes = [IsAuthenticated, IsCollectiveMember]

    def get_queryset(self):
        collective_id = self.kwargs['collective_id']
        return CollectiveMember.objects.filter(
            collective_id=collective_id
        ).select_related('member').order_by('-collective_role', 'member__username')

class KickMemberView(APIView):
    """
    Kick a member from a collective (admin only).
    DELETE /api/collective/<collective_id>/members/kick/
    Body: { "member_id": <user_id> }
    """
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]

    def delete(self, request, collective_id):
        data = {
            'member_id': request.data.get('member_id'),
            'collective_id': collective_id
        }

        serializer = KickMemberSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        # Delete the member
        member_to_kick = serializer._member_to_kick
        kicked_username = member_to_kick.member.username
        member_to_kick.delete()

        return Response({
            'message': f'{kicked_username} has been removed from the collective.'
        }, status=status.HTTP_200_OK)

class PromoteMemberView(APIView):
    """
    Promote a member to admin role (admin only).
    POST /api/collective/<collective_id>/members/promote/
    Body: { "member_id": <user_id> }
    """
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]

    def post(self, request, collective_id):
        data = {
            'member_id': request.data.get('member_id'),
            'collective_id': collective_id
        }

        serializer = PromoteMemberSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        promoted_member = serializer.save()

        return Response({
            'message': f'{promoted_member.member.username} has been promoted to admin.',
            'member_id': promoted_member.member.id,
            'role': promoted_member.collective_role
        }, status=status.HTTP_200_OK)

class DemoteAdminView(APIView):
    """
    Demote an admin to member role (admin only).
    POST /api/collective/<collective_id>/members/demote/
    Body: { "member_id": <user_id> }
    """
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]

    def post(self, request, collective_id):
        data = {
            'member_id': request.data.get('member_id'),
            'collective_id': collective_id
        }

        serializer = DemoteAdminSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        demoted_member = serializer.save()

        return Response({
            'message': f'{demoted_member.member.username} has been demoted to member.',
            'member_id': demoted_member.member.id,
            'role': demoted_member.collective_role
        }, status=status.HTTP_200_OK)

# ============================================================================
# ADMIN REQUEST VIEWS
# ============================================================================

class AdminRequestCreateView(APIView):
    """
    Request to become an admin of a collective.
    POST /api/collective/<collective_id>/admin/request/
    Body: { "message": "optional message" }
    """
    permission_classes = [IsAuthenticated, IsCollectiveMember]

    def post(self, request, collective_id):
        data = {
            'collective_id': collective_id,
            'message': request.data.get('message', '')
        }

        serializer = AdminRequestCreateSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        admin_request = serializer.save()

        # Return the created request
        response_serializer = AdminRequestSerializer(admin_request)

        return Response({
            'message': 'Admin request submitted successfully.',
            'request': response_serializer.data
        }, status=status.HTTP_201_CREATED)

class AdminRequestListView(ListAPIView):
    """
    List all pending admin requests for a collective (admin only).
    GET /api/collective/<collective_id>/admin/requests/
    """
    serializer_class = AdminRequestSerializer
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]

    def get_queryset(self):
        collective_id = self.kwargs['collective_id']
        status_filter = self.request.query_params.get('status', 'pending')

        queryset = AdminRequest.objects.filter(
            collective_id=collective_id
        ).select_related('requester', 'collective', 'reviewed_by')

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('-created_at')

class AcceptAdminRequestView(APIView):
    """
    Accept or reject an admin request (admin only).
    POST /api/collective/admin/requests/<request_id>/process/
    Body: { "action": "approve" | "reject" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        data = {
            'request_id': request_id,
            'action': request.data.get('action')
        }

        serializer = AcceptAdminRequestSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        admin_request = serializer.save()

        response_serializer = AdminRequestSerializer(admin_request)

        action = data['action']
        message = f'Admin request has been {action}d successfully.'

        return Response({
            'message': message,
            'request': response_serializer.data
        }, status=status.HTTP_200_OK)
