from rest_framework import serializers
from django.core.validators import FileExtensionValidator
from common.utils.constants import ALLOWED_EXTENSIONS_FOR_IMAGES, MAX_FILE_SIZE_FOR_IMAGES
from core.models import User
from .models import (
    Gallery, GalleryItem, GalleryItemAssignment, 
    ItemHeart, ItemFeedback, GalleryComment, GalleryAward, AwardType
)
from PIL import Image

# ============================================================================
# GALLERY SERIALIZERS
# ============================================================================

class GalleryListSerializer(serializers.ModelSerializer):
    """For listing galleries (compact view)"""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    owner_picture = serializers.ImageField(source='owner.profile_picture', read_only=True)
    item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Gallery
        fields = [
            'gallery_id', 'title', 'description', 'picture', 'status',
            'layout_template', 'owner', 'owner_username', 'owner_picture',
            'item_count', 'view_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['gallery_id', 'owner', 'view_count', 'created_at', 'updated_at']
    
    def get_item_count(self, obj):
        return obj.item_assignments.count()


class GalleryCreateSerializer(serializers.ModelSerializer):
    """For creating a new gallery"""
    picture = serializers.ImageField(
        required=False,
        validators=[FileExtensionValidator(allowed_extensions=ALLOWED_EXTENSIONS_FOR_IMAGES)]
    )
    
    class Meta:
        model = Gallery
        fields = ['title', 'description', 'status', 'picture', 'layout_template']
    
    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value.strip()
    
    def validate_picture(self, value):
        if not value:
            return value
        
        if value.size > MAX_FILE_SIZE_FOR_IMAGES:
            raise serializers.ValidationError(
                f"Image file too large. Maximum size is {MAX_FILE_SIZE_FOR_IMAGES // (1024 * 1024)} MB."
            )
        
        try:
            img = Image.open(value)
            img.verify()
            value.seek(0)
        except Exception:
            raise serializers.ValidationError("Invalid or corrupted image file.")
        
        return value
    
    def create(self, validated_data):
        return Gallery.objects.create(**validated_data)


class GalleryUpdateSerializer(serializers.ModelSerializer):
    """For updating gallery details"""
    picture = serializers.ImageField(
        required=False,
        validators=[FileExtensionValidator(allowed_extensions=ALLOWED_EXTENSIONS_FOR_IMAGES)]
    )
    
    class Meta:
        model = Gallery
        fields = ['title', 'description', 'status', 'picture', 'layout_template']
    
    def validate_picture(self, value):
        if not value:
            return value
        
        if value.size > MAX_FILE_SIZE_FOR_IMAGES:
            raise serializers.ValidationError(
                f"Image file too large. Maximum size is {MAX_FILE_SIZE_FOR_IMAGES // (1024 * 1024)} MB."
            )
        
        try:
            img = Image.open(value)
            img.verify()
            value.seek(0)
        except Exception:
            raise serializers.ValidationError("Invalid or corrupted image file.")
        
        return value


# ============================================================================
# GALLERY ITEM SERIALIZERS
# ============================================================================

class GalleryItemSerializer(serializers.ModelSerializer):
    """Basic gallery item info"""
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    creator_picture = serializers.ImageField(source='creator.profile_picture', read_only=True)
    heart_count = serializers.SerializerMethodField()
    is_hearted_by_user = serializers.SerializerMethodField()
    
    class Meta:
        model = GalleryItem
        fields = [
            'item_id', 'title', 'image_url', 'description',
            'creator', 'creator_username', 'creator_picture',
            'heart_count', 'is_hearted_by_user',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['item_id', 'creator', 'created_at', 'updated_at']
    
    def get_heart_count(self, obj):
        return obj.hearts.count()
    
    def get_is_hearted_by_user(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.hearts.filter(author=request.user).exists()
        return False


class GalleryItemCreateSerializer(serializers.ModelSerializer):
    """For creating/uploading a new gallery item"""
    image_url = serializers.ImageField(
        required=True,
        validators=[FileExtensionValidator(allowed_extensions=ALLOWED_EXTENSIONS_FOR_IMAGES)]
    )
    
    class Meta:
        model = GalleryItem
        fields = ['title', 'image_url', 'description']
    
    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value.strip()
    
    def validate_image_url(self, value):
        if value.size > MAX_FILE_SIZE_FOR_IMAGES:
            raise serializers.ValidationError(
                f"Image file too large. Maximum size is {MAX_FILE_SIZE_FOR_IMAGES // (1024 * 1024)} MB."
            )
        
        try:
            img = Image.open(value)
            img.verify()
            value.seek(0)
        except Exception:
            raise serializers.ValidationError("Invalid or corrupted image file.")
        
        return value
    
    def create(self, validated_data):
        return GalleryItem.objects.create(**validated_data)


class GalleryItemAssignmentSerializer(serializers.ModelSerializer):
    """Item within a gallery context (includes position)"""
    item = GalleryItemSerializer(source='gallery_item', read_only=True)
    
    class Meta:
        model = GalleryItemAssignment
        fields = ['gallery_item', 'item', 'position', 'added_at']
        read_only_fields = ['added_at']


class GalleryDetailSerializer(serializers.ModelSerializer):
    """Full gallery details with all items"""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    owner_picture = serializers.ImageField(source='owner.profile_picture', read_only=True)
    owner_id = serializers.IntegerField(source='owner.id', read_only=True)
    items = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    award_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Gallery
        fields = [
            'gallery_id', 'title', 'description', 'picture', 'status',
            'layout_template', 'owner', 'owner_id', 'owner_username', 'owner_picture',
            'items', 'item_count', 'comment_count', 'award_count',
            'view_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['gallery_id', 'owner', 'view_count', 'created_at', 'updated_at']
    
    def get_items(self, obj):
        assignments = obj.item_assignments.select_related('gallery_item__creator').all()
        return GalleryItemAssignmentSerializer(assignments, many=True, context=self.context).data
    
    def get_item_count(self, obj):
        return obj.item_assignments.count()
    
    def get_comment_count(self, obj):
        return obj.comments.filter(is_deleted=False).count()
    
    def get_award_count(self, obj):
        return obj.awards.count()


# ============================================================================
# GALLERY ITEM ASSIGNMENT SERIALIZERS
# ============================================================================

class AddItemToGallerySerializer(serializers.Serializer):
    """Add an existing item to a gallery"""
    item_id = serializers.UUIDField(required=True)
    position = serializers.IntegerField(required=False, min_value=0)
    
    def validate_item_id(self, value):
        try:
            item = GalleryItem.objects.get(item_id=value)
            request = self.context.get('request')
            if request and item.creator != request.user:
                raise serializers.ValidationError("You can only add your own items to galleries.")
            return value
        except GalleryItem.DoesNotExist:
            raise serializers.ValidationError("Gallery item not found.")
    
    def validate(self, data):
        gallery_id = self.context.get('gallery_id')
        item_id = data.get('item_id')
        
        if GalleryItemAssignment.objects.filter(gallery_id=gallery_id, gallery_item_id=item_id).exists():
            raise serializers.ValidationError("This item is already in the gallery.")
        
        return data


class ReorderItemsSerializer(serializers.Serializer):
    """Reorder items in a gallery"""
    item_positions = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        required=True,
        help_text="List of {item_id: uuid, position: int}"
    )
    
    def validate_item_positions(self, value):
        if not value:
            raise serializers.ValidationError("Item positions cannot be empty.")
        
        for entry in value:
            if 'item_id' not in entry or 'position' not in entry:
                raise serializers.ValidationError("Each entry must have 'item_id' and 'position'.")
            
            try:
                position = int(entry['position'])
                if position < 0:
                    raise serializers.ValidationError("Position must be non-negative.")
            except (ValueError, TypeError):
                raise serializers.ValidationError("Position must be a valid integer.")
        
        return value


# ============================================================================
# SOCIAL FEATURES SERIALIZERS
# ============================================================================

class ItemHeartSerializer(serializers.ModelSerializer):
    """For hearting gallery items"""
    author_username = serializers.CharField(source='author.username', read_only=True)
    
    class Meta:
        model = ItemHeart
        fields = ['id', 'item', 'author', 'author_username', 'hearted_at']
        read_only_fields = ['id', 'author', 'hearted_at']


class ItemFeedbackSerializer(serializers.ModelSerializer):
    """For leaving feedback on items"""
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_picture = serializers.ImageField(source='author.profile_picture', read_only=True)
    
    class Meta:
        model = ItemFeedback
        fields = ['id', 'item', 'feedback', 'author', 'author_username', 'author_picture', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']


class GalleryCommentSerializer(serializers.ModelSerializer):
    """For gallery comments"""
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_picture = serializers.ImageField(source='author.profile_picture', read_only=True)
    reply_count = serializers.SerializerMethodField()
    
    class Meta:
        model = GalleryComment
        fields = [
            'comment_id', 'gallery', 'text', 'author', 'author_username',
            'author_picture', 'is_deleted', 'replies_to', 'reply_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['comment_id', 'author', 'is_deleted', 'created_at', 'updated_at']
    
    def get_reply_count(self, obj):
        return obj.replies.filter(is_deleted=False).count()


class GalleryAwardSerializer(serializers.ModelSerializer):
    """For awarding galleries"""
    author_username = serializers.CharField(source='author.username', read_only=True)
    award_name = serializers.CharField(source='gallery_award_type.award', read_only=True)
    brush_drip_value = serializers.IntegerField(source='gallery_award_type.brush_drip_value', read_only=True)
    
    class Meta:
        model = GalleryAward
        fields = [
            'id', 'gallery', 'author', 'author_username',
            'gallery_award_type', 'award_name', 'brush_drip_value',
            'awarded_at'
        ]
        read_only_fields = ['id', 'author', 'awarded_at']