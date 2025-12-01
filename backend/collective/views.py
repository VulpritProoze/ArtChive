import uuid
from datetime import timedelta

from django.contrib.auth.mixins import UserPassesTestMixin
from django.core.cache import cache
from django.db import transaction
from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from django.contrib import admin
from django.utils import timezone
from django.views.generic import TemplateView
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.utils.defaults import DEFAULT_COLLECTIVE_CHANNELS
from common.utils.file_utils import rename_image_file
from core.permissions import IsAdminUser, IsCollectiveAdmin, IsCollectiveMember
from core.cache_utils import get_dashboard_cache_key
from post.models import Post

from .cache_utils import get_collective_memberships_cache_key
from .models import AdminRequest, Channel, Collective, CollectiveMember
from .pagination import CollectiveDetailsPagination, CollectivePostsPagination
from .serializers import (
    AcceptAdminRequestSerializer,
    AdminRequestCreateSerializer,
    AdminRequestSerializer,
    BecomeCollectiveAdminSerializer,
    ChangeMemberToAdminSerializer,
    ChannelCreateSerializer,
    ChannelDeleteSerializer,
    ChannelSerializer,
    ChannelUpdateSerializer,
    CollectiveCreateSerializer,
    CollectiveDetailsSerializer,
    CollectiveMemberDetailSerializer,
    CollectiveMemberSerializer,
    CollectiveSearchSerializer,
    CollectiveUpdateSerializer,
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
            Prefetch(
                'collective_channel',
                queryset=Channel.objects.annotate(
                    posts_count=Count('post', distinct=True)
                )
            ),
            'collective_member',
            'collective_member__member__user_wallet',
        ).all()

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
        # Step 1: Rename picture file if provided
        picture_file = request.FILES.get('picture')
        if picture_file:
            rename_image_file(picture_file, prefix="c")

        # Step 2: Deserialize and validate input
        serializer = CollectiveCreateSerializer(
            data=request.data,
            context={'request': request}  # Optional: helps with absolute URLs in representation
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Step 3: Create collective + channels + membership in atomic transaction
        try:
            with transaction.atomic():
                # Use serializer.save() — handles picture field correctly
                collective = serializer.save()

                # Create default channels
                # Should use bulk_create
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


class CollectiveUpdateView(UpdateAPIView):
    """
    Update collective details (admin only).
    PATCH /api/collective/<collective_id>/update/
    Fields that can be updated: description, rules, artist_types, picture
    """
    queryset = Collective.objects.all()
    serializer_class = CollectiveUpdateSerializer
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # Support both multipart and JSON
    lookup_field = 'collective_id'

    def get_object(self):
        """Get the collective and verify admin permission."""
        collective_id = self.kwargs['collective_id']
        collective = get_object_or_404(Collective, collective_id=collective_id)
        return collective

    def update(self, request, *args, **kwargs):
        """Override update to rename picture file before processing."""
        # Rename picture file if provided
        picture_file = request.FILES.get('picture')
        if picture_file:
            rename_image_file(picture_file, prefix="c")

        return super().update(request, *args, **kwargs)


class ChannelListView(ListAPIView):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [IsAuthenticated]

class ChannelCreateView(CreateAPIView):
    queryset = Channel.objects.all()
    serializer_class = ChannelCreateSerializer
    lookup_field = 'collective_id'
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]

class ChannelUpdateView(APIView):
    """
    Update a channel's title or description.
    Only admins of the channel's collective can update it.
    Default channels (General, Audio, Video, General Event) cannot be updated.
    PATCH /api/collective/<collective_id>/channel/update/
    Body: { "channel_id": "<uuid>", "title": "...", "description": "..." }
    """
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]

    def patch(self, request, collective_id):
        channel_id = request.data.get('channel_id')

        if not channel_id:
            return Response(
                {"detail": "channel_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        channel = get_object_or_404(
            Channel,
            channel_id=channel_id,
            collective__collective_id=collective_id
        )

        # Use serializer for validation (includes default channel check)
        serializer = ChannelUpdateSerializer(channel, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)


class ChannelDeleteView(APIView):
    """
    Delete a channel.
    Only admins of the channel's collective can delete it.
    Default channels (General, Audio, Video, General Event) cannot be deleted.
    DELETE /api/collective/<collective_id>/channel/delete/
    Body: { "channel_id": "<uuid>" }
    """
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]

    def delete(self, request, collective_id):
        channel_id = request.data.get('channel_id')

        if not channel_id:
            return Response(
                {"detail": "channel_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create queryset to fetch the channel
        queryset = Channel.objects.filter(
            channel_id=channel_id,
            collective__collective_id=collective_id
        )

        # Get the channel from queryset
        channel = get_object_or_404(queryset)

        # Pass the channel instance to serializer for validation
        # The serializer will use the channel's title from the database for validation
        serializer = ChannelDeleteSerializer(channel, data={'channel_id': channel_id})
        serializer.is_valid(raise_exception=True)
        channel.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

class InsideCollectiveView(RetrieveAPIView):
    serializer_class = InsideCollectiveViewSerializer
    permission_classes = [IsAuthenticated, IsCollectiveMember]
    lookup_field = 'collective_id'

    def get_queryset(self):
        return Collective.objects.prefetch_related(
            Prefetch(
                'collective_channel',
                queryset=Channel.objects.annotate(
                    posts_count=Count('post', distinct=True)
                )
            ),
            'collective_member',
            'collective_member__member'
        ).all()

class InsideCollectivePostsView(ListAPIView):
    """
    Paginated list of posts inside a collective channel.
    Lightweight - matches PostListView pattern. Counts fetched via PostBulkMetaView.
    """
    serializer_class = InsideCollectivePostsViewSerializer
    pagination_class = CollectivePostsPagination
    permission_classes = [IsAuthenticated, IsCollectiveMember]

    def get_queryset(self):
        """
        Fetch core post data only - same lightweight pattern as PostListView.
        Counts and user interactions are fetched separately via PostBulkMetaView.
        """
        channel_id = self.kwargs['channel_id']
        channel = get_object_or_404(Channel, channel_id=channel_id)

        # Build base queryset - only core post data, no annotations
        # Matches PostListView pattern exactly
        queryset = (
            Post.objects.get_active_objects()
            .filter(channel=channel)
            .prefetch_related(
                'novel_post',  # Keep - needed for novel posts
                'channel',
                'channel__collective',  # For consistency with PostListView
            )
            .select_related(
                'author',
                'author__artist',  # Fetch artist info for post author
            )
            .order_by('-created_at')
        )

        return queryset

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
            data = {'collective_id': collective_id}
        else:
            data = request.data

        # Fetch collective once - optimized query
        try:
            collective = Collective.objects.get(collective_id=data.get('collective_id'))
        except Collective.DoesNotExist:
            return Response(
                {'collective_id': ['Collective not found.']},
                status=status.HTTP_404_NOT_FOUND
            )
        except (ValueError, TypeError):
            return Response(
                {'collective_id': ['Invalid UUID format.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user is the only member - using the collective instance
        member_count = CollectiveMember.objects.filter(
            collective_id=collective.collective_id
        ).count()

        if member_count == 1:
            return Response(
                {
                    'non_field_errors': [
                        'You cannot leave the collective as you are the only member. '
                        'Please delete the collective or invite other members first.'
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user is the last admin - prevent leaving if they are
        user_membership = CollectiveMember.objects.filter(
            member=request.user,
            collective_id=collective.collective_id
        ).first()

        if user_membership and user_membership.collective_role == 'admin':
            admin_count = CollectiveMember.objects.filter(
                collective_id=collective.collective_id,
                collective_role='admin'
            ).count()

            if admin_count == 1:
                return Response(
                    {
                        'non_field_errors': [
                            'You cannot leave the collective as you are the last admin. '
                            'Please promote another member to admin or delete the collective first.'
                        ]
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Pass collective instance and existence flag to serializer via context
        serializer = LeaveCollectiveSerializer(
            data=data,
            context={
                'request': request,
                'collective': collective,
                'collective_exists': True
            }
        )
        serializer.is_valid(raise_exception=True)

        # Delete member relationship
        CollectiveMember.objects.filter(
            member=request.user,
            collective_id=collective.collective_id
        ).delete()

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
        """
        Optimized queryset to minimize queries and data transfer.

        Performance optimizations:
        - select_related('collective_id') fetches Collective in same query (avoids N+1)
        - only() limits fields fetched from database (reduces data transfer)
        - Since serializer uses fields="__all__", ForeignKeys serialize as IDs
        """
        return CollectiveMember.objects.filter(
            member=self.request.user
        ).select_related(
            'collective_id',  # Fetch collective data in same query (avoids separate query per membership)
        ).only(
            # CollectiveMember fields needed for serialization
            'id',
            'collective_role',
            'created_at',
            'updated_at',
            'collective_id',  # FK field (will serialize as UUID)
            'member',  # FK field (will serialize as user ID)
            # Collective fields - only fetch primary key (needed for FK serialization)
            'collective_id__collective_id',  # UUID primary key
        )

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

class ChangeMemberRoleView(APIView):
    """
    Change a member's collective role to admin (admin only).
    PATCH /api/collective/<collective_id>/members/<member_id>/role/
    """
    permission_classes = [IsAuthenticated, IsCollectiveAdmin]

    def patch(self, request, collective_id, member_id):
        """Change a member's role to admin"""
        # Create queryset with only the two members we need
        members_queryset = CollectiveMember.objects.filter(
            collective_id=collective_id,
            member_id__in=[request.user.id, member_id]
        ).select_related('member')

        # Use serializer with queryset in context - serializer will check member existence
        serializer = ChangeMemberToAdminSerializer(
            data={'member_id': member_id},
            context={'request': request, 'queryset': members_queryset}
        )
        serializer.is_valid(raise_exception=True)

        # Get target member from serializer and update role
        target_member = serializer._target_member
        target_member.collective_role = 'admin'
        target_member.save(update_fields=['collective_role'])

        # Invalidate cache
        cache_key = get_collective_memberships_cache_key(target_member.member.id)
        cache.delete(cache_key)

        return Response({
            'message': f'{target_member.member.username} has been promoted to admin.',
            'member_id': target_member.member.id,
            'username': target_member.member.username,
            'role': target_member.collective_role
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


@extend_schema(
    tags=["Collectives"],
    description="Search collectives by title or ID (case-insensitive, partial matches)",
    parameters=[
        OpenApiParameter(
            name="q",
            description="Search query for collective title or ID",
            type=str,
            required=True,
        ),
    ],
    responses={
        200: CollectiveSearchSerializer(many=True),
        400: OpenApiResponse(description="Bad Request"),
    },
)
class CollectiveSearchView(ListAPIView):
    """
    Search collectives by title or ID.
    Admin-only endpoint for use in Django admin filters.
    Returns paginated results (max 50).
    Uses Django session authentication (for admin users).
    """
    serializer_class = CollectiveSearchSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        query = self.request.query_params.get('q', '').strip()

        if not query:
            return Collective.objects.none()

        # Build Q objects for case-insensitive partial matches
        q_objects = Q(title__icontains=query)

        # If query is a valid UUID, also try exact ID match
        try:
            collective_id = uuid.UUID(query)
            q_objects |= Q(collective_id=collective_id)
        except (ValueError, TypeError):
            pass  # Not a valid UUID, skip ID search

        return Collective.objects.filter(q_objects).order_by('title')[:50]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        })


# ============================================================================
# Admin Dashboard Views
# ============================================================================

class CollectiveDashboardView(UserPassesTestMixin, TemplateView):
    """Collective app dashboard with collective and channel statistics"""
    template_name = 'collective/admin-dashboard/view.html'

    def test_func(self):
        return self.request.user.is_authenticated and self.request.user.is_superuser

    def get_time_range(self):
        range_param = self.request.GET.get('range', '1m')
        now = timezone.now()
        if range_param == '24h':
            return now - timedelta(hours=24)
        elif range_param == '1w':
            return now - timedelta(weeks=1)
        elif range_param == '1m':
            return now - timedelta(days=30)
        elif range_param == '1y':
            return now - timedelta(days=365)
        else:
            return now - timedelta(days=30)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Only return minimal context - statistics will be loaded via API
        context.update({
            'current_range': self.request.GET.get('range', '1m'),
        })
        # Get Unfold's colors and border_radius from AdminSite's each_context
        admin_context = admin.site.each_context(self.request)
        context.update({
            'colors': admin_context.get('colors'),
            'border_radius': admin_context.get('border_radius'),
        })
        return context


# ============================================================================
# Admin Dashboard Statistics API Views
# ============================================================================

from django.db.models import Count
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)


@extend_schema(
    tags=["Dashboard"],
    description="Get collective counts statistics (lightweight)",
    responses={200: OpenApiResponse(description="Collective counts data")},
)
class CollectiveCountsAPIView(APIView):
    """API endpoint for collective counts statistics (lightweight)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('collective', 'collectives', 'counts')
        
        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)
        
        # Calculate statistics
        now = timezone.now()
        data = {
            'total': Collective.objects.count(),
            '24h': Collective.objects.filter(created_at__gte=now - timedelta(hours=24)).count(),
            '1w': Collective.objects.filter(created_at__gte=now - timedelta(weeks=1)).count(),
            '1m': Collective.objects.filter(created_at__gte=now - timedelta(days=30)).count(),
            '1y': Collective.objects.filter(created_at__gte=now - timedelta(days=365)).count(),
        }
        
        # Cache for 5 minutes
        cache.set(cache_key, data, 300)
        
        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get collective growth data over time (heavy computation)",
    parameters=[
        OpenApiParameter(name='range', description='Time range: 24h, 1w, 1m, 1y', required=False, type=str),
    ],
    responses={200: OpenApiResponse(description="Collective growth data")},
)
class CollectiveGrowthAPIView(APIView):
    """API endpoint for collective growth data (heavy computation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        range_param = request.query_params.get('range', '1m')
        cache_key = get_dashboard_cache_key('collective', 'collectives', f'growth:{range_param}')
        
        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)
        
        # Calculate time range
        now = timezone.now()
        if range_param == '24h':
            time_range_start = now - timedelta(hours=24)
        elif range_param == '1w':
            time_range_start = now - timedelta(weeks=1)
        elif range_param == '1m':
            time_range_start = now - timedelta(days=30)
        elif range_param == '1y':
            time_range_start = now - timedelta(days=365)
        else:
            time_range_start = now - timedelta(days=30)
        
        # Calculate growth data
        growth_data = []
        current_date = time_range_start
        while current_date <= now:
            next_date = current_date + timedelta(days=1)
            count = Collective.objects.filter(created_at__gte=current_date, created_at__lt=next_date).count()
            growth_data.append({'x': current_date.strftime('%Y-%m-%d'), 'y': count})
            current_date = next_date
        
        data = {'growth_data': growth_data}
        
        # Cache for 5 minutes
        cache.set(cache_key, data, 300)
        
        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get collectives by artist type (heavy computation)",
    responses={200: OpenApiResponse(description="Collectives by artist type data")},
)
class CollectiveTypesAPIView(APIView):
    """API endpoint for collectives by artist type (heavy computation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('collective', 'collectives', 'types')
        
        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)
        
        # Calculate collectives by artist type
        collective_artist_type_counts = {}
        collectives = Collective.objects.all()
        for collective in collectives:
            for artist_type in collective.artist_types:
                collective_artist_type_counts[artist_type] = collective_artist_type_counts.get(artist_type, 0) + 1
        
        data = {'data': [{'x': k, 'y': v} for k, v in collective_artist_type_counts.items()]}
        
        # Cache for 5 minutes
        cache.set(cache_key, data, 300)
        
        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get channel counts statistics (lightweight)",
    responses={200: OpenApiResponse(description="Channel counts data")},
)
class ChannelCountsAPIView(APIView):
    """API endpoint for channel counts statistics (lightweight)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('collective', 'channels', 'counts')
        
        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)
        
        # Calculate statistics
        now = timezone.now()
        data = {
            'total': Channel.objects.count(),
            '24h': Channel.objects.filter(created_at__gte=now - timedelta(hours=24)).count(),
            '1w': Channel.objects.filter(created_at__gte=now - timedelta(weeks=1)).count(),
            '1m': Channel.objects.filter(created_at__gte=now - timedelta(days=30)).count(),
            '1y': Channel.objects.filter(created_at__gte=now - timedelta(days=365)).count(),
        }
        
        # Cache for 5 minutes
        cache.set(cache_key, data, 300)
        
        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get channel growth data over time (heavy computation)",
    parameters=[
        OpenApiParameter(name='range', description='Time range: 24h, 1w, 1m, 1y', required=False, type=str),
    ],
    responses={200: OpenApiResponse(description="Channel growth data")},
)
class ChannelGrowthAPIView(APIView):
    """API endpoint for channel growth data (heavy computation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        range_param = request.query_params.get('range', '1m')
        cache_key = get_dashboard_cache_key('collective', 'channels', f'growth:{range_param}')
        
        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)
        
        # Calculate time range
        now = timezone.now()
        if range_param == '24h':
            time_range_start = now - timedelta(hours=24)
        elif range_param == '1w':
            time_range_start = now - timedelta(weeks=1)
        elif range_param == '1m':
            time_range_start = now - timedelta(days=30)
        elif range_param == '1y':
            time_range_start = now - timedelta(days=365)
        else:
            time_range_start = now - timedelta(days=30)
        
        # Calculate growth data
        growth_data = []
        current_date = time_range_start
        while current_date <= now:
            next_date = current_date + timedelta(days=1)
            count = Channel.objects.filter(created_at__gte=current_date, created_at__lt=next_date).count()
            growth_data.append({'x': current_date.strftime('%Y-%m-%d'), 'y': count})
            current_date = next_date
        
        data = {'growth_data': growth_data}
        
        # Cache for 5 minutes
        cache.set(cache_key, data, 300)
        
        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get channels per collective (heavy aggregation)",
    responses={200: OpenApiResponse(description="Channels per collective data")},
)
class ChannelsPerCollectiveAPIView(APIView):
    """API endpoint for channels per collective (heavy aggregation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('collective', 'channels', 'per-collective')
        
        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)
        
        # Calculate channels per collective
        channels_per_collective = Channel.objects.values('collective__title').annotate(count=Count('collective__title')).order_by('-count')
        data = {'data': [{'x': item['collective__title'] or 'No Collective', 'y': item['count']} for item in channels_per_collective]}
        
        # Cache for 5 minutes
        cache.set(cache_key, data, 300)
        
        return Response(data)


