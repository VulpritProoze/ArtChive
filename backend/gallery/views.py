import os
import uuid

<<<<<<< HEAD
# Create your views here.
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.shortcuts import get_object_or_404

from .models import Gallery, GalleryItem, GalleryItemCategory, GalleryLayout
from .serializers import (
    GallerySerializer, GalleryDetailSerializer, GalleryItemSerializer,
    GalleryItemCategorySerializer, GalleryLayoutSerializer, BulkLayoutUpdateSerializer
)


class GalleryItemCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for gallery item categories (read-only)
    GET /api/gallery/categories/ - List all categories
    """
    queryset = GalleryItemCategory.objects.all()
    serializer_class = GalleryItemCategorySerializer
    permission_classes = [permissions.AllowAny]


class GalleryItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for gallery items (user uploads and achievements)
    GET /api/gallery/items/ - List user's items
    POST /api/gallery/items/ - Upload new item
    GET /api/gallery/items/{id}/ - Get item detail
    PUT/PATCH /api/gallery/items/{id}/ - Update item
    DELETE /api/gallery/items/{id}/ - Delete item
    """
    serializer_class = GalleryItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        """Return items owned by the current user"""
        user = self.request.user
        
        # If viewing another user's items (via query param)
        username = self.request.query_params.get('username')
        if username:
            return GalleryItem.objects.filter(
                owner__username=username,
                visibility='public'  # Only show public items of other users
            )
        
        # Return current user's items (all visibilities)
        return GalleryItem.objects.filter(owner=user)
    
    def perform_create(self, serializer):
        """Set the owner when creating an item"""
        serializer.save(owner=self.request.user)
    
    @action(detail=False, methods=['get'])
    def achievements(self, request):
        """
        GET /api/gallery/items/achievements/
        Get only achievement items for current user
        """
        achievements = GalleryItem.objects.filter(
            owner=request.user,
            is_achievement=True
        )
        serializer = self.get_serializer(achievements, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def artworks(self, request):
        """
        GET /api/gallery/items/artworks/
        Get only artwork items (non-achievements) for current user
        """
        artworks = GalleryItem.objects.filter(
            owner=request.user,
            is_achievement=False
        )
        serializer = self.get_serializer(artworks, many=True)
        return Response(serializer.data)


class GalleryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for galleries
    GET /api/gallery/ - List galleries
    POST /api/gallery/ - Create gallery
    GET /api/gallery/{id}/ - Get gallery detail
    PUT/PATCH /api/gallery/{id}/ - Update gallery
    DELETE /api/gallery/{id}/ - Delete gallery (soft delete)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GalleryDetailSerializer
        return GallerySerializer
    
    def get_queryset(self):
        """Return galleries based on permissions"""
        user = self.request.user
        
        # If viewing another user's gallery
        username = self.request.query_params.get('username')
        if username:
            return Gallery.objects.filter(
                creator__username=username,
                status='public',
                is_deleted=False
            )
        
        # Return current user's galleries (including private)
        return Gallery.objects.filter(
            creator=user,
            is_deleted=False
        )
    
    def perform_create(self, serializer):
        """Set the creator when creating a gallery"""
        serializer.save(creator=self.request.user)
    
    def perform_destroy(self, instance):
        """Soft delete gallery"""
        instance.delete()  # This calls the model's delete method (soft delete)
    
    @action(detail=True, methods=['get'])
    def public_view(self, request, pk=None):
        """
        GET /api/gallery/{id}/public_view/
        Public view of gallery (respects item visibility settings)
        """
        gallery = self.get_object()
        
        # Check if user can view this gallery
        if gallery.status != 'public' and gallery.creator != request.user:
            return Response(
                {'detail': 'This gallery is not public.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = GalleryDetailSerializer(gallery)
        data = serializer.data
        
        # Filter out private items if viewer is not the owner
        if gallery.creator != request.user:
            data['layout_items'] = [
                item for item in data['layout_items']
                if item.get('item_visibility') == 'public'
            ]
        
        return Response(data)


class GalleryLayoutViewSet(viewsets.ModelViewSet):
    """
    ViewSet for gallery layout/positioning
    GET /api/gallery/layout/?gallery={gallery_id} - List layouts for a gallery
    POST /api/gallery/layout/ - Add item to gallery
    PUT/PATCH /api/gallery/layout/{id}/ - Update item position
    DELETE /api/gallery/layout/{id}/ - Remove item from gallery
    """
    serializer_class = GalleryLayoutSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return layouts for galleries owned by current user"""
        user = self.request.user
        gallery_id = self.request.query_params.get('gallery')
        
        queryset = GalleryLayout.objects.filter(gallery__creator=user)
        
        if gallery_id:
            queryset = queryset.filter(gallery__gallery_id=gallery_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """Validate user owns the gallery before adding item"""
        gallery = serializer.validated_data['gallery']
        if gallery.creator != self.request.user:
            raise permissions.PermissionDenied("You don't own this gallery")
        
        item = serializer.validated_data['item']
        if item.owner != self.request.user:
            raise permissions.PermissionDenied("You don't own this item")
        
        serializer.save()
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """
        POST /api/gallery/layout/bulk_update/
        Update multiple layout positions at once (for drag-and-drop)
        Body: {
            "updates": [
                {"layout_id": "...", "position_x": 100, "position_y": 200, ...},
                ...
            ]
        }
        """
        serializer = BulkLayoutUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        updates = serializer.validated_data['updates']
        updated_layouts = []
        
        for update_data in updates:
            layout_id = update_data.pop('layout_id')
            try:
                layout = GalleryLayout.objects.get(
                    layout_id=layout_id,
                    gallery__creator=request.user
                )
                
                # Update fields
                for field, value in update_data.items():
                    setattr(layout, field, value)
                
                layout.save()
                updated_layouts.append(layout)
                
            except GalleryLayout.DoesNotExist:
                return Response(
                    {'detail': f'Layout {layout_id} not found or not owned by you'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Return updated layouts
        result_serializer = GalleryLayoutSerializer(updated_layouts, many=True)
        return Response(result_serializer.data)
    
    @action(detail=False, methods=['post'])
    def reorder_slots(self, request):
        """
        POST /api/gallery/layout/reorder_slots/
        Reorder slot-based items
        Body: {
            "gallery_id": "...",
            "slot_mapping": {
                "layout_id_1": 1,
                "layout_id_2": 2,
                ...
            }
        }
        """
        gallery_id = request.data.get('gallery_id')
        slot_mapping = request.data.get('slot_mapping', {})
        
        if not gallery_id or not slot_mapping:
            return Response(
                {'detail': 'gallery_id and slot_mapping are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            gallery = Gallery.objects.get(
                gallery_id=gallery_id,
                creator=request.user
            )
        except Gallery.DoesNotExist:
            return Response(
                {'detail': 'Gallery not found or not owned by you'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update slot numbers
        for layout_id, slot_number in slot_mapping.items():
            try:
                layout = GalleryLayout.objects.get(
                    layout_id=layout_id,
                    gallery=gallery
                )
                layout.slot_number = slot_number
                layout.save()
            except GalleryLayout.DoesNotExist:
                continue
        
        # Return updated gallery
        serializer = GalleryDetailSerializer(gallery)
        return Response(serializer.data)
=======
import cloudinary.uploader
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.utils import choices
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
>>>>>>> 9b57c94341f0e091accd798e04e37453060f4891
