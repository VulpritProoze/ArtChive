import json
import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from avatar.models import Avatar
from avatar.serializers import (
    AvatarCreateSerializer,
    AvatarDetailSerializer,
    AvatarListSerializer,
    AvatarUpdateSerializer,
)

logger = logging.getLogger(__name__)

# ============================================================================
# User Avatar Views
# ============================================================================

class AvatarListCreateView(APIView):
    """
    GET /api/avatar/
    List all active avatars for the current user.
    
    POST /api/avatar/
    Create new avatar with thumbnail snapshot from client (via form data).
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        """List all active avatars for the current user"""
        queryset = Avatar.objects.filter(
            user=request.user,
            is_deleted=False
        ).select_related('user').order_by('-is_primary', '-updated_at')

        serializer = AvatarListSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        """
        Create new avatar.
        Accepts form data with thumbnail image file and canvas_json.
        """
        # Get thumbnail file from form data (client-side snapshot)
        thumbnail_file = request.FILES.get('thumbnail', None)

        # Prepare data for serializer - QueryDict stores values as lists, extract first element
        data = {}
        for key, value in request.data.items():
            # Skip thumbnail (it's a file, should only be in FILES)
            if key == 'thumbnail':
                continue

            # QueryDict returns lists, extract first element if it's a list
            if isinstance(value, list):
                if len(value) > 0:
                    data[key] = value[0]
                else:
                    data[key] = None
            else:
                data[key] = value

        # Get canvas_json from form data (may be string or dict)
        canvas_json_data = data.get('canvas_json')
        if canvas_json_data is not None:
            if isinstance(canvas_json_data, str):
                # Parse JSON string to dict
                try:
                    parsed_json = json.loads(canvas_json_data)
                    data['canvas_json'] = parsed_json
                except (json.JSONDecodeError, TypeError) as e:
                    return Response(
                        {'canvas_json': [f'Invalid JSON format: {str(e)}']},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            # If it's already a dict, keep it as is (no conversion needed)

        # Create serializer
        serializer = AvatarCreateSerializer(data=data)

        if serializer.is_valid():
            # Save avatar with current user
            avatar = serializer.save(user=request.user)

            # Save thumbnail if provided
            if thumbnail_file:
                avatar.thumbnail = thumbnail_file
                avatar.save(update_fields=['thumbnail'])

            # If this is the user's first avatar, make it primary
            user_avatars_count = Avatar.objects.filter(
                user=request.user,
                is_deleted=False
            ).count()

            if user_avatars_count == 1:
                avatar.is_primary = True
                avatar.save()

            # Return full avatar details
            response_serializer = AvatarDetailSerializer(avatar)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AvatarDetailView(APIView):
    """
    GET /api/avatar/{avatar_id}/
    Retrieve single avatar with full canvas data.
    
    PATCH /api/avatar/{avatar_id}/
    Update avatar (including canvas data and thumbnail snapshot via form data).
    
    DELETE /api/avatar/{avatar_id}/
    Soft delete avatar.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        """Only return avatars owned by current user"""
        return Avatar.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).select_related('user')

    def get(self, request, avatar_id):
        """Retrieve single avatar with full canvas data"""
        avatar = get_object_or_404(
            self.get_queryset(),
            avatar_id=avatar_id
        )

        serializer = AvatarDetailSerializer(avatar)
        return Response(serializer.data)

    def patch(self, request, avatar_id):
        """
        Update avatar with thumbnail snapshot support.
        Handles both JSON data and form data with file uploads.
        """
        logger.info(f"PATCH /api/avatar/{avatar_id}/ - Starting update request")
        logger.info(f"Request content type: {request.content_type}")
        logger.info(f"Request method: {request.method}")
        logger.info(f"Request data type: {type(request.data)}")
        logger.info(f"Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
        logger.info(f"Request FILES keys: {list(request.FILES.keys())}")

        # Get avatar and verify ownership
        avatar = get_object_or_404(
            self.get_queryset(),
            avatar_id=avatar_id
        )
        logger.info(f"Found avatar: {avatar.avatar_id}, name: {avatar.name}")

        # Get thumbnail file from form data (client-side snapshot)
        thumbnail_file = request.FILES.get('thumbnail', None)
        logger.info(f"Thumbnail file received: {thumbnail_file is not None}")
        if thumbnail_file:
            logger.info(f"Thumbnail file name: {thumbnail_file.name}, size: {thumbnail_file.size}")

        # Prepare data for serializer - create a proper mutable dict from QueryDict
        # QueryDict stores values as lists, so we need to extract first element for each
        data = {}
        for key, value in request.data.items():
            # Skip thumbnail (it's a file, should only be in FILES)
            if key == 'thumbnail':
                logger.info(f"Skipping '{key}' from data (it's a file)")
                continue

            # QueryDict returns lists, extract first element if it's a list
            if isinstance(value, list):
                if len(value) > 0:
                    data[key] = value[0]
                    logger.info(f"Extracted first element from list for '{key}': {type(value[0])}")
                else:
                    data[key] = None
            else:
                data[key] = value

        logger.info(f"Data dict created. Data keys: {list(data.keys())}")
        logger.info(f"Data type: {type(data)}")
        logger.info(f"Sample data values - name: {data.get('name')} (type: {type(data.get('name'))}), status: {data.get('status')} (type: {type(data.get('status'))})")

        # Get canvas_json from form data (may be string or dict)
        canvas_json_data = data.get('canvas_json')

        logger.info(f"canvas_json_data type: {type(canvas_json_data)}")
        logger.info(f"canvas_json_data value (first 200 chars): {str(canvas_json_data)[:200] if canvas_json_data else 'None'}")

        if canvas_json_data is not None:
            if isinstance(canvas_json_data, str):
                logger.info("canvas_json_data is a string, attempting to parse...")
                # Parse JSON string to dict
                try:
                    parsed_json = json.loads(canvas_json_data)
                    logger.info(f"Successfully parsed JSON. Parsed type: {type(parsed_json)}")
                    logger.info(f"Parsed JSON keys: {list(parsed_json.keys()) if isinstance(parsed_json, dict) else 'Not a dict'}")
                    # Ensure we're setting it as a dict, not a string
                    data['canvas_json'] = parsed_json
                    logger.info(f"Updated data['canvas_json'] with parsed dict. Type after update: {type(data['canvas_json'])}")
                except (json.JSONDecodeError, TypeError) as e:
                    logger.error(f"Failed to parse canvas_json JSON string: {str(e)}")
                    logger.error(f"Problematic JSON string: {canvas_json_data[:500]}")
                    return Response(
                        {'canvas_json': [f'Invalid JSON format: {str(e)}']},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif isinstance(canvas_json_data, dict):
                logger.info("canvas_json_data is already a dict, no parsing needed")
                data['canvas_json'] = canvas_json_data
            elif isinstance(canvas_json_data, list):
                logger.warning(f"canvas_json_data is still a list after extraction: {canvas_json_data}")
            else:
                logger.warning(f"canvas_json_data is unexpected type: {type(canvas_json_data)}")
        else:
            logger.info("canvas_json_data is None")

        logger.info(f"Final data['canvas_json'] type before serializer: {type(data.get('canvas_json'))}")
        logger.info(f"Final data['canvas_json'] value type check: {isinstance(data.get('canvas_json'), dict)}")
        logger.info(f"Final data keys: {list(data.keys())}")

        # Verify the canvas_json is actually a dict and JSON-serializable
        if 'canvas_json' in data:
            canvas_json_value = data['canvas_json']
            if not isinstance(canvas_json_value, dict):
                logger.error(f"ERROR: canvas_json is not a dict! Type: {type(canvas_json_value)}, Value: {str(canvas_json_value)[:200]}")
            else:
                # Test if it's JSON-serializable
                try:
                    json.dumps(canvas_json_value)
                    logger.info("canvas_json is JSON-serializable ✓")
                except (TypeError, ValueError) as e:
                    logger.error(f"ERROR: canvas_json is NOT JSON-serializable! Error: {str(e)}")
                logger.info(f"canvas_json structure: width={canvas_json_value.get('width')}, height={canvas_json_value.get('height')}, has avatarOptions={bool(canvas_json_value.get('avatarOptions'))}")

        # Create serializer with partial update
        logger.info(f"Creating serializer with data type: {type(data)}")
        logger.info(f"Data being passed to serializer: {list(data.keys())}")
        serializer = AvatarUpdateSerializer(avatar, data=data, partial=True)
        logger.info("Serializer created, checking validity...")
        logger.info(f"Serializer initial data: {serializer.initial_data if hasattr(serializer, 'initial_data') else 'N/A'}")

        if serializer.is_valid():
            logger.info("Serializer is valid, saving avatar...")
            # Save the avatar with serializer data
            avatar = serializer.save()
            logger.info("Avatar saved successfully")

            # Update thumbnail if provided
            if thumbnail_file:
                logger.info("Saving thumbnail file...")
                avatar.thumbnail = thumbnail_file
                avatar.save(update_fields=['thumbnail'])
                logger.info(f"Thumbnail saved: {avatar.thumbnail.name if avatar.thumbnail else 'None'}")

            # Return updated avatar details
            response_serializer = AvatarDetailSerializer(avatar)
            logger.info("Update successful, returning response")
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        logger.error("Serializer validation failed")
        logger.error(f"Serializer errors: {serializer.errors}")
        logger.error(f"Serializer data: {serializer.validated_data if hasattr(serializer, 'validated_data') else 'N/A'}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, avatar_id):
        """
        Soft delete avatar.
        If deleting primary avatar, assign primary to another avatar.
        """
        # Get avatar and verify ownership
        avatar = get_object_or_404(
            self.get_queryset(),
            avatar_id=avatar_id
        )

        was_primary = avatar.is_primary

        # Soft delete
        avatar.is_deleted = True
        avatar.is_primary = False
        avatar.save()

        # If this was primary, assign primary to another avatar
        if was_primary:
            next_avatar = Avatar.objects.filter(
                user=request.user,
                is_deleted=False
            ).first()

            if next_avatar:
                next_avatar.is_primary = True
                next_avatar.save()

        return Response(status=status.HTTP_204_NO_CONTENT)


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
