from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.conf import settings
import os
import uuid

from .models import Gallery
from .serializers import GallerySerializer


class GalleryListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/gallery/ - List all galleries for current user
    POST /api/gallery/ - Create a new gallery
    """
    serializer_class = GallerySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Gallery.objects.filter(
            creator=self.request.user,
            is_deleted=False
        ).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class GalleryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/gallery/<gallery_id>/ - Retrieve a gallery
    PATCH  /api/gallery/<gallery_id>/ - Update a gallery (including canvas_json)
    DELETE /api/gallery/<gallery_id>/ - Delete a gallery (uses model's soft delete)
    """
    serializer_class = GallerySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'gallery_id'

    def get_queryset(self):
        return Gallery.objects.filter(
            creator=self.request.user,
            is_deleted=False
        )


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
            # Generate a unique filename
            ext = os.path.splitext(image_file.name)[1]
            filename = f"gallery_media/{uuid.uuid4()}{ext}"

            # Save the file
            path = default_storage.save(filename, image_file)

            # Build the full URL
            if settings.DEBUG:
                base_url = request.build_absolute_uri(settings.MEDIA_URL)
            else:
                base_url = settings.MEDIA_URL

            url = f"{base_url}{path}"

            return Response({
                'url': url,
                'filename': os.path.basename(path)
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Failed to upload file: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
