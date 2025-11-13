import os
import uuid

import cloudinary.uploader
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Gallery
from .serializers import GallerySerializer


class GalleryListCreateView(APIView):
    """
    GET  /api/gallery/ - List all galleries for current user
    POST /api/gallery/ - Create a new gallery
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        """List all galleries for the current user"""
        galleries = Gallery.objects.get_active_objects().filter(
            creator=request.user,
        ).order_by('-created_at')
        serializer = GallerySerializer(galleries, many=True)
        return Response(serializer.data)

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
        serializer = GallerySerializer(data=data)
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
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Gallery.objects.get_active_objects().filter(
            creator=self.request.user,
        )

    def get_object(self, gallery_id):
        """Get gallery object ensuring user owns it"""
        try:
            return self.get_queryset().get(gallery_id=gallery_id)
        except Gallery.DoesNotExist:
            return None

    def get(self, request, gallery_id):
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
            ext = os.path.splitext(picture_file.name)[1].lower()
            short_name = f"g_{str(uuid.uuid4())[:8]}{ext}"
            picture_file.name = short_name

        serializer = GallerySerializer(gallery, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, gallery_id):
        """Soft delete a gallery"""
        gallery = self.get_object(gallery_id)
        if not gallery:
            return Response(
                {'error': 'Gallery not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        gallery.delete()  # Uses model's soft delete
        return Response(status=status.HTTP_204_NO_CONTENT)


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
