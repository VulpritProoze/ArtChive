import os
import uuid
from collections import deque
from datetime import timedelta

import cloudinary.uploader
from django.contrib import admin
from django.contrib.auth.mixins import UserPassesTestMixin
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.generic import TemplateView
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import generics, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import ListAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.utils import choices
from common.utils.choices import NOTIFICATION_TYPES, GALLERY_AWARD_BRUSH_DRIP_COSTS
from core.cache_utils import get_dashboard_cache_key
from core.models import User, BrushDripWallet, BrushDripTransaction
from core.permissions import IsAuthorOrSuperUser
from notification.utils import create_notification
from post.models import Comment
from post.pagination import CommentPagination

from .models import Gallery
from .pagination import GalleryPagination
from .serializers import (
    GalleryCommentCreateSerializer,
    GalleryCommentDeleteSerializer,
    GalleryCommentReplyCreateSerializer,
    GalleryCommentReplyViewSerializer,
    GalleryCommentSerializer,
    GalleryCommentUpdateSerializer,
    GalleryListSerializer,
    GallerySerializer,
    TopLevelGalleryCommentsViewSerializer,
)


class GalleryListCreateView(APIView):
    """
    POST /api/gallery/ - Create a new gallery
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        """Create a new gallery with automatic picture filename shortening"""
        # Handle picture file renaming BEFORE serialization to avoid filename length issues
        picture_file = request.FILES.get('picture')

        if picture_file:
            # Rename file to short hash to ensure it fits within 100 character limit
            ext = os.path.splitext(picture_file.name)[1].lower()
            short_name = f"g_{str(uuid.uuid4())[:8]}{ext}"
            picture_file.name = short_name

        # Create a mutable copy of request data
        data = request.data.copy()
        # Force status to always be 'draft' for new galleries, ignore client input
        data['status'] = 'draft'

        # Now pass to serializer with renamed file and forced draft status
        serializer = GallerySerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save(creator=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GalleryPublicDetailView(APIView):
    """
    GET /api/gallery/<gallery_id>/public/ - Retrieve a published gallery (public endpoint)
    Excludes canvas_json, includes creator details and reputation
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def get(self, _request, gallery_id):  # noqa: ARG002
        """Retrieve a published active gallery"""
        try:
            gallery = Gallery.objects.get_active_objects().select_related(
                'creator',
                'creator__artist',
                'creator__user_wallet'
            ).filter(
                gallery_id=gallery_id,
                status='active'
            ).first()
            
            if not gallery:
                return Response(
                    {'error': 'Gallery not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            from .serializers import GalleryPublicSerializer
            serializer = GalleryPublicSerializer(gallery)
            return Response(serializer.data)
        except (ObjectDoesNotExist, ValueError):
            return Response(
                {'error': 'Gallery not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class GalleryDetailView(APIView):
    """
    GET    /api/gallery/<gallery_id>/ - Retrieve a gallery
    PATCH  /api/gallery/<gallery_id>/ - Update a gallery (including canvas_json)
    DELETE /api/gallery/<gallery_id>/ - Delete a gallery (uses model's soft delete)
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return Gallery.objects.get_active_objects().filter(
            creator=self.request.user,
        )

    def get_object(self, gallery_id):
        """Get gallery object ensuring user owns it"""
        try:
            return self.get_queryset().get(gallery_id=gallery_id)
        except ObjectDoesNotExist:
            return None

    def get(self, request, gallery_id):
        """Retrieve a single gallery"""
        # First try to get user's own gallery
        gallery = self.get_object(gallery_id)
        
        # If not found, try to get any active published gallery (for viewing published galleries)
        if not gallery:
            try:
                gallery = Gallery.objects.get_active_objects().filter(
                    gallery_id=gallery_id,
                    status='active'
                ).first()
            except (ObjectDoesNotExist, ValueError):
                gallery = None
        
        # If still not found, return 404
        if not gallery:
            return Response(
                {'error': 'Gallery not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = GallerySerializer(gallery)
        return Response(serializer.data)

    def patch(self, request, gallery_id):
        """Update a gallery with automatic picture filename shortening"""
        gallery = self.get_object(gallery_id)
        if not gallery:
            return Response(
                {'error': 'Gallery not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Handle picture file renaming if a new picture is uploaded
        picture_file = request.FILES.get('picture')
        if picture_file:
            from common.utils.file_utils import rename_image_file
            rename_image_file(picture_file, prefix="g")

        serializer = GallerySerializer(gallery, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, _request, gallery_id):  # noqa: ARG002
        """Soft delete a gallery"""
        gallery = self.get_object(gallery_id)
        if not gallery:
            return Response(
                {'error': 'Gallery not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        if gallery.status == 'active':
            return Response(
                {'error': 'You cannot delete an active gallery'},
                status=status.HTTP_400_BAD_REQUEST
            )
        gallery.delete()  # Uses model's soft delete
        return Response(status=status.HTTP_204_NO_CONTENT)


class GalleryActiveView(APIView):
    """
    GET /api/gallery/user/<user_id>/active/ - Get the active gallery for a user
    (Will need to add proper permissions check later)
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def get(self, _request, user_id):  # noqa: ARG002
        """Get the active gallery for the specified user"""
        try:
            user = User.objects.get(pk=user_id)
        except ObjectDoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get all active galleries for this user
        active_galleries = Gallery.objects.get_active_objects().filter(
            creator=user,
            status='active'
        )

        # Validate: Check if user has multiple active galleries
        active_count = active_galleries.count()
        if active_count >= 2:
            return Response(
                {
                    'error': 'Multiple active galleries detected. Please contact ArtChive staff for assistance.',
                    'code': 'MULTIPLE_ACTIVE_GALLERIES'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # If no active gallery, return 404
        if active_count == 0:
            return Response(
                {'error': 'No active gallery found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Exactly one active gallery - return it
        gallery = active_galleries.first()
        serializer = GallerySerializer(gallery)
        return Response(serializer.data)


class GalleryHasActiveView(APIView):
    """
    GET /api/gallery/user/<user_id>/has-active/ - Check if a user has an active gallery
    Returns: {'has_active': True/False}
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def get(self, _request, user_id):  # noqa: ARG002
        """Check if the specified user has an active gallery"""
        try:
            user = User.objects.get(pk=user_id)
        except ObjectDoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user has any active galleries
        has_active = Gallery.objects.get_active_objects().filter(
            creator=user,
            status='active'
        ).exists()

        return Response({'has_active': has_active}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Galleries"],
    description="Get all galleries (paginated, public) with optional search",
    parameters=[
        OpenApiParameter(
            name="page",
            description="Page number (default: 1)",
            type=int,
            required=False,
        ),
        OpenApiParameter(
            name="page_size",
            description="Number of galleries per page (default: 10, max: 50)",
            type=int,
            required=False,
        ),
        OpenApiParameter(
            name="q",
            description="Search query string (searches title, description, creator username)",
            type=str,
            required=False,
        ),
    ],
)
class GalleryListView(APIView):
    """
    GET /api/gallery/list/ - Get all galleries (paginated, public)

    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Number of galleries per page (default: 10, max: 50)
    - q: Search query (optional) - searches title, description, creator username

    Returns paginated response with:
    - count: Total number of galleries
    - next: URL to next page (null if no next page)
    - previous: URL to previous page (null if no previous page)
    - results: Array of gallery objects
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    pagination_class = GalleryPagination

    def get(self, request):
        """Get all active galleries (paginated) with optional search"""
        query = request.query_params.get('q', '').strip()
        
        # Get all active (non-deleted) galleries with optimized queries
        # Using select_related for OneToOne relationships (user_wallet and artist)
        galleries = Gallery.objects.get_active_objects().select_related(
            'creator',
            'creator__user_wallet',
            'creator__artist'
        ).filter(
            status='active'
        )

        # Apply search filter if query provided
        if query and len(query) >= 2:
            galleries = galleries.filter(
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(creator__username__icontains=query) |
                Q(creator__first_name__icontains=query) |
                Q(creator__last_name__icontains=query)
            )

        galleries = galleries.order_by('-created_at')

        # Apply pagination
        paginator = self.pagination_class()
        paginated_galleries = paginator.paginate_queryset(galleries, request)

        # Serialize paginated results with creator details
        serializer = GalleryListSerializer(paginated_galleries, many=True)

        # Return paginated response
        return paginator.get_paginated_response(serializer.data)


@extend_schema(
    tags=["Galleries"],
    description="Get bulk gallery details by IDs",
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'gallery_ids': {
                    'type': 'array',
                    'items': {'type': 'string', 'format': 'uuid'},
                    'description': 'List of gallery IDs to fetch'
                }
            },
            'required': ['gallery_ids']
        }
    },
    responses={
        200: GalleryListSerializer(many=True),
        400: OpenApiResponse(description="Bad Request - Invalid input"),
    },
)
class BulkGalleryDetailsView(APIView):
    """Get bulk gallery details by list of IDs"""
    permission_classes = [AllowAny]

    def post(self, request):
        gallery_ids = request.data.get('gallery_ids', [])

        if not gallery_ids or not isinstance(gallery_ids, list):
            return Response(
                {'error': 'gallery_ids must be a non-empty list'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Limit to 100 galleries per request
        if len(gallery_ids) > 100:
            return Response(
                {'error': 'Maximum 100 gallery IDs allowed per request'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Convert string IDs to UUIDs and filter
        try:
            uuid_ids = [uuid.UUID(gid) for gid in gallery_ids]
        except (ValueError, TypeError) as e:
            return Response(
                {'error': f'Invalid UUID format: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch galleries with optimized queries
        galleries = Gallery.objects.get_active_objects().select_related(
            'creator',
            'creator__user_wallet',
            'creator__artist'
        ).filter(
            gallery_id__in=uuid_ids
        ).order_by('-created_at')

        serializer = GalleryListSerializer(galleries, many=True)

        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)


class GlobalTopGalleriesView(APIView):
    """
    Fetch cached global top galleries.
    GET /api/gallery/top/?limit=25
    
    Query Parameters:
        limit: Number of galleries to return (5, 10, 25, 50, 100). Default: 25
    
    Returns:
        List of top galleries in ranked order
    """
    permission_classes = [AllowAny]  # Public endpoint

    def get(self, request):
        # Get limit from query params, default to 25
        limit = request.query_params.get('limit', '25')

        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 25

        # Validate limit (only allow specific values)
        valid_limits = [5, 10, 25, 50, 100]
        if limit not in valid_limits:
            limit = 25  # Default to 25 if invalid

        # Try to get from cache
        from gallery.ranking import get_cached_top_galleries
        cached_galleries = get_cached_top_galleries(limit=limit)

        if cached_galleries is None:
            # For testing: return 404 if cache is not available
            # In production, you might want to fallback to most awarded galleries
            return Response(
                {
                    'error': 'Top galleries cache not available. Please run: python manage.py generate_top_galleries'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'results': cached_galleries[:limit],
            'count': len(cached_galleries[:limit]),
            'limit': limit,
        }, status=status.HTTP_200_OK)


class GalleryUserListView(APIView):
    """
    GET /api/gallery/user/ - Get all galleries owned by the current authenticated user
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get(self, request):
        """Get all galleries owned by the current authenticated user"""
        # Get all active (non-deleted) galleries for the current user
        galleries = Gallery.objects.get_active_objects().filter(
            creator=request.user
        ).order_by('-created_at')

        serializer = GallerySerializer(galleries, many=True)
        return Response(serializer.data)


class FellowsGalleriesView(APIView):
    """
    GET /api/gallery/fellows/ - Get active galleries from users the current user follows (fellows)
    Returns galleries without canvas_json (paginated)
    
    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Number of galleries per page (default: 10, max: 50)
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    pagination_class = GalleryPagination

    def get(self, request):
        """Get active galleries from fellows (accepted relationships)"""
        user = request.user
        
        # Get all accepted fellows for the current user
        from core.models import UserFellow
        fellows = UserFellow.objects.get_active_objects().filter(
            (Q(user=user, status='accepted') | Q(fellow_user=user, status='accepted')),
            is_deleted=False
        )
        
        # Extract fellow user IDs (the users that the current user follows)
        fellow_user_ids = []
        for fellow in fellows:
            if fellow.user == user:
                fellow_user_ids.append(fellow.fellow_user.id)
            else:
                fellow_user_ids.append(fellow.user.id)
        
        # If no fellows, return empty paginated response
        if not fellow_user_ids:
            paginator = self.pagination_class()
            # Initialize paginator with empty queryset to set up page attribute
            paginator.paginate_queryset([], request)
            return paginator.get_paginated_response([])
        
        # Get active galleries from fellows
        galleries = Gallery.objects.get_active_objects().select_related(
            'creator',
            'creator__user_wallet',
            'creator__artist'
        ).filter(
            creator_id__in=fellow_user_ids,
            status='active'
        ).order_by('-created_at')
        
        # Apply pagination
        paginator = self.pagination_class()
        paginated_galleries = paginator.paginate_queryset(galleries, request)
        
        # Serialize with GalleryListSerializer (excludes canvas_json)
        serializer = GalleryListSerializer(paginated_galleries, many=True)
        
        # Return paginated response
        return paginator.get_paginated_response(serializer.data)


class MediaUploadView(APIView):
    """
    POST /api/gallery/media/upload/ - Upload an image for gallery editor

    Body: multipart/form-data with 'image' field
    Returns: {'url': 'http://...', 'filename': '...'}
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if 'image' not in request.FILES:
            return Response(
                {'error': 'No image file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_file = request.FILES['image']

        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024
        if image_file.size > max_size:
            return Response(
                {'error': 'File size exceeds 10MB limit'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get user ID for folder organization
            user_id = request.user.id

            # Generate a unique public_id for Cloudinary
            unique_id = str(uuid.uuid4())
            public_id = f"gallery/editor/{user_id}/images/{unique_id}"

            # Upload directly to Cloudinary
            upload_result = cloudinary.uploader.upload(
                image_file,
                public_id=public_id,
                folder=f"gallery/editor/{user_id}/images",
                resource_type="image"
            )

            # Get the secure URL from Cloudinary (includes version hash)
            url = upload_result.get('secure_url')

            return Response({
                'url': url,
                'filename': f"{unique_id}{os.path.splitext(image_file.name)[1]}"
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Failed to upload file: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GalleryStatusUpdateView(APIView):
    """
    PATCH /api/gallery/<gallery_id>/status/ - Update only the status of a gallery
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get_queryset(self):
        return Gallery.objects.get_active_objects().filter(
            creator=self.request.user,
        )

    def get_object(self, gallery_id):
        """Get gallery object ensuring user owns it"""
        try:
            return self.get_queryset().get(gallery_id=gallery_id)
        except ObjectDoesNotExist:
            return None

    def patch(self, request, gallery_id):
        """Update only the status of a gallery"""
        gallery = self.get_object(gallery_id)
        if not gallery:
            return Response(
                {'error': 'Gallery not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Only accept status field
        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {'error': 'status field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate status value
        valid_statuses = [choice[0] for choice in choices.GALLERY_STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate that only one gallery can be active at a time
        if new_status == 'active':
            existing_active = Gallery.objects.get_active_objects().filter(
                creator=request.user,
                status='active'
            ).exclude(gallery_id=gallery_id)

            if existing_active.exists():
                return Response(
                    {
                        'error': 'You can only have one active gallery at a time. '
                                'Please archive or set another gallery to draft first.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Update status
        gallery.status = new_status
        gallery.save()

        serializer = GallerySerializer(gallery)
        return Response(serializer.data)


# ============================================================================
# Gallery Comment Views
# ============================================================================

class GalleryCommentsView(generics.ListAPIView):
    """
    Fetch all top-level comments with their replies for a gallery
    GET /api/gallery/<gallery_id>/comments/
    """

    serializer_class = TopLevelGalleryCommentsViewSerializer
    pagination_class = CommentPagination

    def get_queryset(self):
        gallery_id = self.kwargs["gallery_id"]

        # Prefetch replies for each comment
        replies_prefetch = Prefetch(
            "comment_reply",
            queryset=Comment.objects.get_active_objects()
            .filter(is_critique_reply=False)
            .select_related("author", "author__artist")
            .order_by("created_at"),
            to_attr="prefetched_replies",
        )

        return (
            Comment.objects.get_active_objects()
            .filter(gallery_id=gallery_id, replies_to__isnull=True, critique_id__isnull=True)
            .annotate(
                reply_count=Count(
                    "comment_reply",
                    filter=Q(
                        comment_reply__is_deleted=False,
                        comment_reply__is_critique_reply=False,
                    ),
                )
            )
            .select_related("author", "author__artist")
            .prefetch_related(replies_prefetch)
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        # Get the full queryset (before pagination)
        queryset = self.filter_queryset(self.get_queryset())
        gallery_id = self.kwargs["gallery_id"]

        # Count total comments excluding critique replies
        total_comments = (
            Comment.objects.get_active_objects()
            .filter(gallery_id=gallery_id, is_critique_reply=False)
            .count()
        )

        # Let DRF handle pagination and serialization
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Inject extra data into paginator
            self.paginator.extra_data = {"total_comments": total_comments}
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({"results": serializer.data, "total_comments": total_comments})


class GalleryCommentCreateView(generics.CreateAPIView):
    """
    Create a comment on a gallery
    POST /api/gallery/comment/create/
    """
    queryset = Comment.objects.get_active_objects()
    serializer_class = GalleryCommentCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Create the comment
        comment = serializer.save(author=self.request.user)

        # Send notification to gallery creator
        if comment.gallery:
            gallery_creator = comment.gallery.creator
            # Don't notify if the commenter is the gallery creator
            if comment.author.id != gallery_creator.id:
                message = f"{comment.author.username} commented on your gallery"
                # Use creator's user ID for navigation to /gallery/:userid
                notification_object_id = str(gallery_creator.id)
                create_notification(
                    message=message,
                    notification_object_type=NOTIFICATION_TYPES.gallery_comment,
                    notification_object_id=notification_object_id,
                    notified_to=gallery_creator,
                    notified_by=comment.author
                )


class GalleryCommentUpdateView(generics.UpdateAPIView):
    """
    Update a gallery comment
    PUT/PATCH /api/gallery/comment/<comment_id>/update/
    """
    queryset = Comment.objects.get_active_objects().select_related("author", "gallery")
    serializer_class = GalleryCommentUpdateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = "comment_id"


class GalleryCommentDeleteView(APIView):
    """
    Soft-delete a gallery comment and all its replies (descendants)
    DELETE /api/gallery/comment/<comment_id>/delete/
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, comment_id):
        # Fetch the comment (only non-deleted)
        instance = get_object_or_404(
            Comment.objects.get_active_objects(), comment_id=comment_id
        )

        # Manual permission check
        user = request.user
        if not (user == instance.author or user.is_staff):
            return Response(
                {"detail": "You can only delete your own comments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validate confirmation using serializer
        serializer = GalleryCommentDeleteSerializer(
            instance, data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        # Perform soft deletion of comment + all descendants
        self.soft_delete_with_replies(instance)

        return Response(
            {"detail": "Comment and all replies deleted successfully."},
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def soft_delete_with_replies(self, root_comment):
        """Recursively collect and soft-delete all replies."""
        comments_to_delete = []
        queue = deque([root_comment])

        while queue:
            current = queue.popleft()
            if not current.is_deleted:
                comments_to_delete.append(current)
                # Get direct replies that are not deleted
                replies = Comment.objects.get_active_objects().filter(
                    replies_to=current
                )
                queue.extend(replies)

        # Use the delete() method for each comment (soft deletion)
        for comment in comments_to_delete:
            comment.delete()


class GalleryCommentReplyCreateView(generics.CreateAPIView):
    """
    Create a reply to a gallery comment
    POST /api/gallery/comment/reply/create/
    """
    serializer_class = GalleryCommentReplyCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Create the reply
        reply = serializer.save(author=self.request.user)

        # Send notification to parent comment author
        if reply.replies_to:
            parent_author = reply.replies_to.author
            # Don't notify if replying to own comment
            if reply.author.id != parent_author.id:
                message = f"{reply.author.username} replied to your comment"
                # Use gallery creator's user ID for navigation to /gallery/:userid
                notification_object_id = str(reply.gallery.creator.id)
                create_notification(
                    message=message,
                    notification_object_type=NOTIFICATION_TYPES.gallery_comment,
                    notification_object_id=notification_object_id,
                    notified_to=parent_author,
                    notified_by=reply.author
                )


class GalleryCommentsReplyDetailView(ListAPIView):
    """
    Fetch all replies for a specific gallery comment
    GET /api/gallery/comment/<comment_id>/replies/
    """
    serializer_class = GalleryCommentReplyViewSerializer
    pagination_class = CommentPagination
    lookup_field = "comment_id"

    def get_queryset(self):
        comment_id = self.kwargs["comment_id"]
        # Safely get the parent comment (returns 404 if not found)
        parent_comment = get_object_or_404(Comment, comment_id=comment_id)

        return (
            Comment.objects.get_active_objects()
            .filter(
                replies_to=parent_comment,  # ← replies TO this comment
                critique_id__isnull=True,
            )
            .select_related("author")
            .order_by("-created_at")
        )


class GalleryCommentDetailView(generics.RetrieveAPIView):
    """
    Retrieve a single gallery comment
    GET /api/gallery/comment/<comment_id>/
    """
    queryset = Comment.objects.get_active_objects().select_related("author", "gallery")
    serializer_class = GalleryCommentSerializer
    lookup_field = "comment_id"


class GalleryCommentListView(generics.ListAPIView):
    """
    List all gallery comments (for admin or debugging)
    GET /api/gallery/comments/
    """
    queryset = Comment.objects.get_active_objects().filter(
        gallery__isnull=False
    ).select_related("author", "gallery")
    serializer_class = GalleryCommentSerializer
    pagination_class = CommentPagination
    permission_classes = [IsAuthenticated]


# ============================================================================
# Admin Dashboard Views
# ============================================================================

class GalleryDashboardView(UserPassesTestMixin, TemplateView):
    """Gallery app dashboard with gallery statistics"""
    template_name = 'gallery/admin-dashboard/view.html'

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

@extend_schema(
    tags=["Dashboard"],
    description="Get gallery counts statistics (lightweight)",
    responses={200: OpenApiResponse(description="Gallery counts data")},
)
class GalleryCountsAPIView(APIView):
    """API endpoint for gallery counts statistics (lightweight)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache_key = get_dashboard_cache_key('gallery', 'galleries', 'counts')

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # Calculate statistics
        now = timezone.now()
        data = {
            'total': Gallery.objects.count(),
            'published': Gallery.objects.filter(status=choices.GALLERY_STATUS.active).count(),
            'draft': Gallery.objects.filter(status=choices.GALLERY_STATUS.draft).count(),
            'archived': Gallery.objects.filter(status=choices.GALLERY_STATUS.archived).count(),
            '24h': Gallery.objects.filter(created_at__gte=now - timedelta(hours=24)).count(),
            '1w': Gallery.objects.filter(created_at__gte=now - timedelta(weeks=1)).count(),
            '1m': Gallery.objects.filter(created_at__gte=now - timedelta(days=30)).count(),
            '1y': Gallery.objects.filter(created_at__gte=now - timedelta(days=365)).count(),
        }

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


@extend_schema(
    tags=["Dashboard"],
    description="Get gallery growth data over time (heavy computation)",
    parameters=[
        OpenApiParameter(name='range', description='Time range: 24h, 1w, 1m, 1y', required=False, type=str),
    ],
    responses={200: OpenApiResponse(description="Gallery growth data")},
)
class GalleryGrowthAPIView(APIView):
    """API endpoint for gallery growth data (heavy computation)"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        range_param = request.query_params.get('range', '1m')
        cache_key = get_dashboard_cache_key('gallery', 'galleries', f'growth:{range_param}')

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
            count = Gallery.objects.filter(created_at__gte=current_date, created_at__lt=next_date).count()
            growth_data.append({'x': current_date.strftime('%Y-%m-%d'), 'y': count})
            current_date = next_date

        data = {'growth_data': growth_data}

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)

        return Response(data)


