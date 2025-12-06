from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from avatar.models import Avatar
from avatar.serializers import (
    AvatarListSerializer,
    AvatarDetailSerializer,
    AvatarCreateSerializer,
    AvatarUpdateSerializer,
)


# ============================================================================
# User Avatar Views
# ============================================================================

class AvatarListCreateView(generics.ListCreateAPIView):
    """
    GET /api/avatar/
    List all active avatars for the current user.
    
    POST /api/avatar/
    Create new avatar.
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Optimized queryset with select_related for user.
        Only returns active (non-deleted) avatars for the current user.
        """
        return Avatar.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).select_related('user').order_by('-is_primary', '-updated_at')
    
    def get_serializer_class(self):
        """Use list serializer for GET, detail for POST"""
        if self.request.method == 'GET':
            return AvatarListSerializer
        return AvatarCreateSerializer
    
    def perform_create(self, serializer):
        """
        Create new avatar.
        Business logic: Set user, handle defaults.
        """
        # Save avatar with current user
        avatar = serializer.save(user=self.request.user)
        
        # If this is the user's first avatar, make it primary
        user_avatars_count = Avatar.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).count()
        
        if user_avatars_count == 1:
            avatar.is_primary = True
            avatar.save()
    
    def list(self, request, *args, **kwargs):
        """List with detailed response"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class AvatarDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/avatar/{avatar_id}/
    Retrieve single avatar with full canvas data.
    
    PATCH /api/avatar/{avatar_id}/
    Update avatar (including canvas data).
    
    DELETE /api/avatar/{avatar_id}/
    Soft delete avatar.
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'avatar_id'
    
    def get_queryset(self):
        """Only return avatars owned by current user"""
        return Avatar.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).select_related('user')
    
    def get_serializer_class(self):
        """Use appropriate serializer based on method"""
        if self.request.method == 'PATCH':
            return AvatarUpdateSerializer
        return AvatarDetailSerializer
    
    def perform_destroy(self, instance):
        """
        Soft delete implementation.
        If deleting primary avatar, assign primary to another avatar.
        """
        was_primary = instance.is_primary
        
        # Soft delete
        instance.is_deleted = True
        instance.is_primary = False
        instance.save()
        
        # If this was primary, assign primary to another avatar
        if was_primary:
            next_avatar = Avatar.objects.filter(
                user=self.request.user,
                is_deleted=False
            ).first()
            
            if next_avatar:
                next_avatar.is_primary = True
                next_avatar.save()


class AvatarSetPrimaryView(APIView):
    """
    POST /api/avatar/{avatar_id}/set-primary/
    Set an avatar as the user's primary avatar.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, avatar_id):
        """
        Business logic:
        1. Verify avatar ownership
        2. Unset all other primary avatars for this user
        3. Set this avatar as primary
        """
        # Get avatar and verify ownership
        avatar = get_object_or_404(
            Avatar,
            avatar_id=avatar_id,
            user=request.user,
            is_deleted=False
        )
        
        # Unset all other primary avatars
        Avatar.objects.filter(
            user=request.user,
            is_primary=True,
            is_deleted=False
        ).exclude(avatar_id=avatar_id).update(is_primary=False)
        
        # Set this avatar as primary
        avatar.is_primary = True
        avatar.save()
        
        return Response({
            'message': 'Avatar set as primary',
            'avatar_id': str(avatar.avatar_id)
        }, status=status.HTTP_200_OK)


class AvatarDuplicateView(APIView):
    """
    POST /api/avatar/{avatar_id}/duplicate/
    Duplicate an existing avatar.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, avatar_id):
        """
        Business logic:
        1. Get original avatar
        2. Create copy with new name
        3. Copy canvas_json
        4. Set status to draft
        """
        # Get original avatar and verify ownership
        original = get_object_or_404(
            Avatar,
            avatar_id=avatar_id,
            user=request.user,
            is_deleted=False
        )
        
        # Get custom name or generate default
        new_name = request.data.get('name', f'Copy of {original.name}')
        
        # Create duplicate
        duplicate = Avatar.objects.create(
            user=request.user,
            name=new_name,
            description=original.description,
            status='draft',  # Always create as draft
            is_primary=False,  # Never primary by default
            canvas_json=original.canvas_json,
        )
        
        # Serialize and return
        serializer = AvatarDetailSerializer(duplicate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AvatarRenderView(APIView):
    """
    POST /api/avatar/{avatar_id}/render/
    Render avatar (generate rendered_image and thumbnail from canvas_json).
    
    Note: In a production system, this would trigger a background job
    to render the canvas to an image. For now, this is a placeholder.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, avatar_id):
        """
        Business logic:
        1. Get avatar
        2. Trigger rendering process (placeholder for now)
        3. Return updated URLs
        """
        # Get avatar and verify ownership
        avatar = get_object_or_404(
            Avatar,
            avatar_id=avatar_id,
            user=request.user,
            is_deleted=False
        )
        
        # TODO: Implement actual rendering logic
        # This would typically:
        # 1. Parse canvas_json
        # 2. Use a library like Pillow or headless browser to render
        # 3. Generate 512x512 rendered_image
        # 4. Generate 128x128 thumbnail
        # 5. Upload to storage (Cloudinary/S3)
        # 6. Update avatar with new URLs
        
        return Response({
            'message': 'Rendering queued (not yet implemented)',
            'avatar_id': str(avatar.avatar_id),
            'rendered_image': avatar.rendered_image.url if avatar.rendered_image else None,
            'thumbnail': avatar.thumbnail.url if avatar.thumbnail else None,
        }, status=status.HTTP_200_OK)
