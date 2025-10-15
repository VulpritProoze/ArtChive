from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Count, Q
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from core.permissions import IsAuthorOrSuperUser
from core.models import User
from .models import (
    Gallery, GalleryItem, GalleryItemAssignment,
    ItemHeart, ItemFeedback, GalleryComment, GalleryAward
)
from .serializers import (
    GalleryListSerializer, GalleryCreateSerializer, GalleryUpdateSerializer,
    GalleryDetailSerializer, GalleryItemSerializer, GalleryItemCreateSerializer,
    AddItemToGallerySerializer, ReorderItemsSerializer, GalleryItemAssignmentSerializer,
    ItemHeartSerializer, ItemFeedbackSerializer, GalleryCommentSerializer, GalleryAwardSerializer
)
from .pagination import GalleryPagination, GalleryItemPagination

# ============================================================================
# GALLERY VIEWS
# ============================================================================

class GalleryListView(generics.ListAPIView):
    """
    List all galleries for authenticated user
    GET /api/gallery/list/me/
    """
    serializer_class = GalleryListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = GalleryPagination
    
    def get_queryset(self):
        return Gallery.objects.filter(owner=self.request.user).annotate(
            item_count=Count('item_assignments')
        ).select_related('owner').order_by('-created_at')


class GalleryCreateView(generics.CreateAPIView):
    """
    Create a new gallery
    POST /api/gallery/create/
    """
    serializer_class = GalleryCreateSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class GalleryDetailView(generics.RetrieveAPIView):
    """
    Get gallery details (owner or public view)
    GET /api/gallery/<gallery_id>/
    """
    serializer_class = GalleryDetailSerializer
    lookup_field = 'gallery_id'
    
    def get_permissions(self):
        return [AllowAny()]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            # Authenticated users can see their own galleries regardless of status
            return Gallery.objects.filter(
                Q(owner=user) | Q(status='public')
            ).select_related('owner')
        else:
            # Anonymous users can only see public galleries
            return Gallery.objects.filter(status='public').select_related('owner')
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        instance.view_count += 1
        instance.save(update_fields=['view_count'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class GalleryUpdateView(generics.UpdateAPIView):
    """
    Update gallery details
    PUT/PATCH /api/gallery/<gallery_id>/update/
    """
    serializer_class = GalleryUpdateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    parser_classes = [MultiPartParser, FormParser]
    lookup_field = 'gallery_id'
    
    def get_queryset(self):
        return Gallery.objects.filter(owner=self.request.user)


class GalleryDeleteView(generics.DestroyAPIView):
    """
    Delete a gallery
    DELETE /api/gallery/<gallery_id>/delete/
    """
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = 'gallery_id'
    
    def get_queryset(self):
        return Gallery.objects.filter(owner=self.request.user)
    
    def perform_destroy(self, instance):
        # Delete cover image if it exists
        if instance.picture and instance.picture.name != 'static/images/default_600x400.png':
            instance.picture.delete(save=False)
        instance.delete()


class PublicGalleriesListView(generics.ListAPIView):
    """
    List all public galleries by a specific user
    GET /api/gallery/public/<username>/
    """
    serializer_class = GalleryListSerializer
    permission_classes = [AllowAny]
    pagination_class = GalleryPagination
    
    def get_queryset(self):
        username = self.kwargs.get('username')
        user = get_object_or_404(User, username=username)
        return Gallery.objects.filter(
            owner=user,
            status='public'
        ).annotate(
            item_count=Count('item_assignments')
        ).select_related('owner').order_by('-created_at')


# ============================================================================
# GALLERY ITEM VIEWS
# ============================================================================

class GalleryItemCreateView(generics.CreateAPIView):
    """
    Create/upload a new gallery item
    POST /api/gallery/items/create/
    """
    serializer_class = GalleryItemCreateSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class GalleryItemListView(generics.ListAPIView):
    """
    List all gallery items created by authenticated user
    GET /api/gallery/items/me/
    """
    serializer_class = GalleryItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = GalleryItemPagination
    
    def get_queryset(self):
        return GalleryItem.objects.filter(
            creator=self.request.user
        ).order_by('-created_at')


class GalleryItemDetailView(generics.RetrieveAPIView):
    """
    Get gallery item details
    GET /api/gallery/items/<item_id>/
    """
    serializer_class = GalleryItemSerializer
    permission_classes = [AllowAny]
    lookup_field = 'item_id'
    queryset = GalleryItem.objects.select_related('creator').all()


class GalleryItemUpdateView(generics.UpdateAPIView):
    """
    Update gallery item
    PUT/PATCH /api/gallery/items/<item_id>/update/
    """
    serializer_class = GalleryItemCreateSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    parser_classes = [MultiPartParser, FormParser]
    lookup_field = 'item_id'
    
    def get_queryset(self):
        return GalleryItem.objects.filter(creator=self.request.user)


class GalleryItemDeleteView(generics.DestroyAPIView):
    """
    Delete gallery item
    DELETE /api/gallery/items/<item_id>/delete/
    """
    permission_classes = [IsAuthenticated, IsAuthorOrSuperUser]
    lookup_field = 'item_id'
    
    def get_queryset(self):
        return GalleryItem.objects.filter(creator=self.request.user)
    
    def perform_destroy(self, instance):
        # Delete image file
        if instance.image_url:
            instance.image_url.delete(save=False)
        instance.delete()


# ============================================================================
# GALLERY ITEM ASSIGNMENT VIEWS (Adding items to galleries)
# ============================================================================

class AddItemToGalleryView(APIView):
    """
    Add an existing item to a gallery
    POST /api/gallery/<gallery_id>/items/add/
    Body: { "item_id": "uuid", "position": 0 }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, gallery_id):
        gallery = get_object_or_404(Gallery, gallery_id=gallery_id, owner=request.user)
        
        serializer = AddItemToGallerySerializer(
            data=request.data,
            context={'request': request, 'gallery_id': gallery_id}
        )
        serializer.is_valid(raise_exception=True)
        
        item_id = serializer.validated_data['item_id']
        position = serializer.validated_data.get('position', 0)
        
        item = get_object_or_404(GalleryItem, item_id=item_id)
        
        # Create assignment
        assignment = GalleryItemAssignment.objects.create(
            gallery=gallery,
            gallery_item=item,
            position=position
        )
        
        return Response(
            GalleryItemAssignmentSerializer(assignment, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class RemoveItemFromGalleryView(APIView):
    """
    Remove an item from a gallery (doesn't delete the item)
    DELETE /api/gallery/<gallery_id>/items/<item_id>/remove/
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, gallery_id, item_id):
        gallery = get_object_or_404(Gallery, gallery_id=gallery_id, owner=request.user)
        
        assignment = get_object_or_404(
            GalleryItemAssignment,
            gallery=gallery,
            gallery_item_id=item_id
        )
        
        assignment.delete()
        
        return Response(
            {'message': 'Item removed from gallery successfully'},
            status=status.HTTP_200_OK
        )


class ReorderGalleryItemsView(APIView):
    """
    Reorder items in a gallery
    PUT /api/gallery/<gallery_id>/items/reorder/
    Body: {
        "item_positions": [
            {"item_id": "uuid", "position": 0},
            {"item_id": "uuid", "position": 1},
            ...
        ]
    }
    """
    permission_classes = [IsAuthenticated]
    
    def put(self, request, gallery_id):
        gallery = get_object_or_404(Gallery, gallery_id=gallery_id, owner=request.user)
        
        serializer = ReorderItemsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        item_positions = serializer.validated_data['item_positions']
        
        with transaction.atomic():
            for entry in item_positions:
                item_id = entry['item_id']
                position = int(entry['position'])
                
                try:
                    assignment = GalleryItemAssignment.objects.get(
                        gallery=gallery,
                        gallery_item_id=item_id
                    )
                    assignment.position = position
                    assignment.save(update_fields=['position'])
                except GalleryItemAssignment.DoesNotExist:
                    continue
        
        return Response(
            {'message': 'Items reordered successfully'},
            status=status.HTTP_200_OK
        )


class GalleryItemsInGalleryView(generics.ListAPIView):
    """
    List all items in a specific gallery
    GET /api/gallery/<gallery_id>/items/
    """
    serializer_class = GalleryItemAssignmentSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        gallery_id = self.kwargs['gallery_id']
        gallery = get_object_or_404(Gallery, gallery_id=gallery_id)
        
        # Check if user can view this gallery
        if gallery.status != 'public' and gallery.owner != self.request.user:
            return GalleryItemAssignment.objects.none()
        
        return GalleryItemAssignment.objects.filter(
            gallery=gallery
        ).select_related('gallery_item__creator').order_by('position')


# ============================================================================
# SOCIAL FEATURES VIEWS (Phase 4 - can build later)
# ============================================================================

# Item Hearts
class ItemHeartCreateView(generics.CreateAPIView):
    """Heart a gallery item"""
    serializer_class = ItemHeartSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class ItemHeartDeleteView(generics.DestroyAPIView):
    """Unheart a gallery item"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ItemHeart.objects.filter(author=self.request.user)
    
    def get_object(self):
        item_id = self.kwargs.get('item_id')
        return get_object_or_404(ItemHeart, item_id=item_id, author=self.request.user)


# Item Feedback
class ItemFeedbackCreateView(generics.CreateAPIView):
    """Leave feedback on a gallery item"""
    serializer_class = ItemFeedbackSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class ItemFeedbackListView(generics.ListAPIView):
    """List feedback for a gallery item"""
    serializer_class = ItemFeedbackSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        item_id = self.kwargs['item_id']
        return ItemFeedback.objects.filter(item_id=item_id).select_related('author').order_by('-created_at')


# Gallery Comments
class GalleryCommentCreateView(generics.CreateAPIView):
    """Comment on a gallery"""
    serializer_class = GalleryCommentSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class GalleryCommentListView(generics.ListAPIView):
    """List comments for a gallery"""
    serializer_class = GalleryCommentSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        gallery_id = self.kwargs['gallery_id']
        return GalleryComment.objects.filter(
            gallery_id=gallery_id,
            is_deleted=False,
            replies_to__isnull=True  # Top-level comments only
        ).select_related('author').order_by('-created_at')