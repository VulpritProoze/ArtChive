"""
Gallery Award Serializers
Separate file to avoid conflicts
"""

from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from core.models import Artist, BrushDripWallet

from .models import AwardType, GalleryAward


class GalleryAwardSerializer(ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_picture = serializers.ImageField(
        source="author.profile_picture", read_only=True
    )
    author_artist_types = serializers.SerializerMethodField()
    gallery_title = serializers.CharField(source="gallery_id.title", read_only=True)
    award_type = serializers.CharField(source="gallery_award_type.award", read_only=True)
    brush_drip_value = serializers.IntegerField(source="gallery_award_type.brush_drip_value", read_only=True)

    class Meta:
        model = GalleryAward
        fields = "__all__"

    def get_author_artist_types(self, obj):
        """Fetch author's artist types"""
        try:
            return obj.author.artist.artist_types
        except Artist.DoesNotExist:
            return []


class GalleryAwardCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GalleryAward
        fields = ["gallery_id", "award_type"]

    award_type = serializers.CharField(write_only=True)

    def validate_award_type(self, value):
        """Validate award type is valid"""
        from common.utils.choices import GALLERY_AWARD_CHOICES
        valid_choices = [choice[0] for choice in GALLERY_AWARD_CHOICES]
        if value not in valid_choices:
            raise serializers.ValidationError("Invalid award type")
        return value

    def validate(self, data):
        """Validate award creation"""
        request = self.context.get("request")
        if request and request.method == "POST":
            data["author"] = request.user

        user = data.get("author")
        gallery = data.get("gallery_id")
        award_type_name = data.get("award_type")

        # Prevent gallery creator from awarding their own gallery
        if gallery and gallery.creator == user:
            raise serializers.ValidationError(
                "You cannot award your own gallery"
            )

        # Check if user already awarded this gallery with the same award type
        if user and gallery and award_type_name:
            # Get the AwardType object for the award type name
            award_type_obj = AwardType.objects.filter(award=award_type_name).first()
            if not award_type_obj:
                raise serializers.ValidationError(
                    f"Award type '{award_type_name}' not found"
                )
            if GalleryAward.objects.filter(
                gallery_id=gallery,
                author=user,
                gallery_award_type=award_type_obj,
                is_deleted=False
            ).exists():
                raise serializers.ValidationError(
                    f"You have already awarded this gallery with {award_type_name}"
                )
        # Check if user has sufficient Brush Drips
        if user:
            from common.utils.choices import GALLERY_AWARD_BRUSH_DRIP_COSTS
            required_amount = GALLERY_AWARD_BRUSH_DRIP_COSTS.get(award_type_name, 0)
            try:
                wallet = BrushDripWallet.objects.get(user=user)
                if wallet.balance < required_amount:
                    raise serializers.ValidationError(
                        f"Insufficient Brush Drips. You need {required_amount} Brush Drips to award this gallery. "
                        f"Current balance: {wallet.balance}"
                    )
            except BrushDripWallet.DoesNotExist as e:
                raise serializers.ValidationError("Wallet not found for this user") from e

        return data

    def create(self, validated_data):
        """Create gallery award"""
        award_type_name = validated_data.pop("award_type")
        award_type_obj = AwardType.objects.filter(award=award_type_name).first()
        if not award_type_obj:
            raise serializers.ValidationError(
                f"Award type '{award_type_name}' not found"
            )
        validated_data["gallery_award_type"] = award_type_obj
        return super().create(validated_data)


class GalleryAwardDeleteSerializer(serializers.ModelSerializer):
    confirm = serializers.BooleanField(
        required=True, write_only=True, help_text="Must be True to confirm deletion"
    )

    class Meta:
        model = GalleryAward
        fields = ["confirm"]

    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("Must confirm deletion")
        return value

    def validate(self, data):
        if not self.instance:
            raise serializers.ValidationError("Award not found")

        # Ensure award is not already deleted
        if self.instance.is_deleted:
            raise serializers.ValidationError("Award is already deleted")

        # Ensure user owns the award or is admin
        user = self.context["request"].user
        if not (user == self.instance.author or user.is_staff):
            raise serializers.ValidationError("You can only delete your own awards")

        return data

