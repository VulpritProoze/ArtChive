
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