import os
import uuid
from datetime import timedelta

import cloudinary.uploader
from django.contrib import admin
from django.contrib.auth.mixins import UserPassesTestMixin
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from django.views.generic import TemplateView
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.utils import choices
from core.cache_utils import get_dashboard_cache_key
from core.models import User

from .models import Gallery
from .pagination import GalleryPagination
from .serializers import GalleryListSerializer, GallerySerializer


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

    def get(self, _request, gallery_id):  # noqa: ARG002
        """Retrieve a single gallery"""
        gallery = self.get_object(gallery_id)
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


class GalleryListView(APIView):
    """
    GET /api/gallery/list/ - Get all galleries (paginated, public)

    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Number of galleries per page (default: 10, max: 50)

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
        """Get all active galleries (paginated)"""
        # Get all active (non-deleted) galleries with optimized queries
        # Using select_related for OneToOne relationships (user_wallet and artist)
        galleries = Gallery.objects.get_active_objects().select_related(
            'creator',
            'creator__user_wallet',
            'creator__artist'
        ).filter(
            status='active'
        ).order_by('-created_at')

        # Apply pagination
        paginator = self.pagination_class()
        paginated_galleries = paginator.paginate_queryset(galleries, request)

        # Serialize paginated results with creator details
        serializer = GalleryListSerializer(paginated_galleries, many=True)

        # Return paginated response
        return paginator.get_paginated_response(serializer.data)


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


