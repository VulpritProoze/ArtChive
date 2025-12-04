"""
Gallery Award Views
Separate file to avoid conflicts with existing views.py
"""

from django.db import transaction
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.utils.choices import GALLERY_AWARD_BRUSH_DRIP_COSTS
from core.models import BrushDripTransaction, BrushDripWallet
from notification.utils import create_gallery_award_notification

from .models import AwardType, GalleryAward
from .pagination import GalleryPagination
from .award_serializers import (
    GalleryAwardCreateSerializer,
    GalleryAwardDeleteSerializer,
    GalleryAwardSerializer,
)


class GalleryAwardCreateView(APIView):
    """
    Create a gallery award (costs 5/10/20 Brush Drips based on award type)
    POST /api/gallery/award/create/

    Body: {
        "gallery_id": "<uuid>",
        "award_type": "bronze_stroke" | "golden_bristle" | "diamond_canvas"
    }

    Award costs:
    - bronze_stroke: 5 Brush Drips
    - golden_bristle: 10 Brush Drips
    - diamond_canvas: 20 Brush Drips

    This endpoint:
    1. Validates user has sufficient Brush Drips
    2. Creates GalleryAward record
    3. Deducts Brush Drips from user
    4. Adds Brush Drips to gallery creator
    5. Creates transaction record

    All operations are atomic (either all succeed or all fail)
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Validate request data
        serializer = GalleryAwardCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        gallery = serializer.validated_data["gallery_id"]
        gallery_creator = gallery.creator
        award_type_name = serializer.validated_data["award_type"]
        required_amount = GALLERY_AWARD_BRUSH_DRIP_COSTS[award_type_name]

        try:
            with transaction.atomic():
                # Get the AwardType object
                award_type_obj = AwardType.objects.get(award=award_type_name)

                # Lock wallets to prevent race conditions
                sender_wallet = BrushDripWallet.objects.select_for_update().get(
                    user=user
                )
                receiver_wallet = BrushDripWallet.objects.select_for_update().get(
                    user=gallery_creator
                )

                # Final balance check
                if sender_wallet.balance < required_amount:
                    return Response(
                        {"error": "Insufficient Brush Drips"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Update balances
                sender_wallet.balance -= required_amount
                receiver_wallet.balance += required_amount

                sender_wallet.save()
                receiver_wallet.save()

                # Create GalleryAward
                gallery_award = GalleryAward.objects.create(
                    gallery_id=gallery,
                    author=user,
                    gallery_award_type=award_type_obj,
                )

                # Create transaction record
                BrushDripTransaction.objects.create(
                    amount=required_amount,
                    transaction_object_type="gallery_award",
                    transaction_object_id=str(gallery_award.id),
                    transacted_by=user,
                    transacted_to=gallery_creator,
                )

                # Send notification to gallery creator
                create_gallery_award_notification(gallery_award, gallery_creator)

            # Return serialized response
            response_serializer = GalleryAwardSerializer(
                gallery_award, context={"request": request}
            )
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Failed to award gallery: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class GalleryAwardDeleteView(APIView):
    """
    Delete (soft delete) a gallery award
    DELETE /api/gallery/award/<award_id>/delete/

    Body: {
        "confirm": true
    }

    This endpoint:
    1. Soft deletes the GalleryAward
    2. Reverses Brush Drip transaction (if needed)
    3. Updates reputation (via signals)
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request, award_id):
        try:
            gallery_award = GalleryAward.objects.get(id=award_id, is_deleted=False)
        except GalleryAward.DoesNotExist:
            return Response(
                {"error": "Award not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate deletion
        serializer = GalleryAwardDeleteSerializer(
            gallery_award,
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                # Soft delete the award
                gallery_award.delete()  # Uses model's soft delete method

            return Response(
                {"message": "Award deleted successfully"},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to delete award: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class GalleryAwardListView(generics.ListAPIView):
    """
    List all awards for a specific gallery (paginated)
    GET /api/gallery/<gallery_id>/awards/
    """

    serializer_class = GalleryAwardSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = GalleryPagination

    def get_queryset(self):
        gallery_id = self.kwargs["gallery_id"]
        return (
            GalleryAward.objects.filter(gallery_id=gallery_id, is_deleted=False)
            .select_related("author", "gallery_id", "gallery_award_type")
            .order_by("-awarded_at")
        )


class GalleryAwardsBulkView(APIView):
    """
    Get awards for multiple galleries in bulk
    POST /api/gallery/awards/bulk/
    
    Body: {
        "gallery_ids": ["<uuid1>", "<uuid2>", ...]
    }
    
    Returns: {
        "<gallery_id>": {
            "bronze_stroke": 2,
            "golden_bristle": 1,
            "diamond_canvas": 0
        },
        ...
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        gallery_ids = request.data.get('gallery_ids', [])
        
        if not gallery_ids or not isinstance(gallery_ids, list):
            return Response(
                {'error': 'gallery_ids must be a non-empty list'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Fetch all awards for the given galleries
        awards = GalleryAward.objects.filter(
            gallery_id__in=gallery_ids,
            is_deleted=False
        ).select_related('gallery_award_type')
        
        # Group by gallery_id and award_type
        result = {}
        for award in awards:
            gallery_id_str = str(award.gallery_id.gallery_id)
            award_type = award.gallery_award_type.award
            
            if gallery_id_str not in result:
                result[gallery_id_str] = {}
            
            if award_type not in result[gallery_id_str]:
                result[gallery_id_str][award_type] = 0
            
            result[gallery_id_str][award_type] += 1
        
        # Ensure all requested gallery IDs are in the response (even if they have no awards)
        for gallery_id in gallery_ids:
            gallery_id_str = str(gallery_id)
            if gallery_id_str not in result:
                result[gallery_id_str] = {}
        
        return Response(result, status=status.HTTP_200_OK)

