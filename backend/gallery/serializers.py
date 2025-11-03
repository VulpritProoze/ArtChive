from rest_framework import serializers
from .models import Gallery, GalleryItem, GalleryItemCategory, GalleryLayout
from core.models import User


class GalleryItemCategorySerializer(serializers.ModelSerializer):
    """Serializer for item categories"""
    class Meta:
        model = GalleryItemCategory
        fields = ['category_id', 'name', 'icon', 'description']


class GalleryItemSerializer(serializers.ModelSerializer):
    """Serializer for gallery items (artworks and achievements)"""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    owner_profile_picture = serializers.ImageField(source='owner.profile_picture', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    
    class Meta:
        model = GalleryItem
        fields = [
            'item_id', 'owner', 'owner_username', 'owner_profile_picture',
            'category', 'category_name', 'category_icon',
            'title', 'image_url', 'description', 'visibility',
            'is_achievement', 'achievement_type', 'achievement_date', 'achievement_metadata',
            'related_post', 'related_trophy',
            'created_at', 'is_featured'
        ]
        read_only_fields = ['item_id', 'owner', 'created_at', 'is_achievement', 
                           'achievement_type', 'achievement_date', 'achievement_metadata',
                           'related_post', 'related_trophy']
    
    def create(self, validated_data):
        # Set owner from request context
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class GalleryLayoutSerializer(serializers.ModelSerializer):
    """Serializer for gallery layout/positioning"""
    item_title = serializers.CharField(source='item.title', read_only=True)
    item_image = serializers.ImageField(source='item.image_url', read_only=True)
    item_is_achievement = serializers.BooleanField(source='item.is_achievement', read_only=True)
    
    class Meta:
        model = GalleryLayout
        fields = [
            'layout_id', 'gallery', 'item', 'item_title', 'item_image', 'item_is_achievement',
            'slot_number', 'position_x', 'position_y', 'width', 'height',
            'z_index', 'rotation', 'scale', 'opacity',
            'border_color', 'border_width',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['layout_id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate that slot_number doesn't exceed max_slots if used"""
        gallery = data.get('gallery')
        slot_number = data.get('slot_number')
        
        if slot_number and gallery and slot_number > gallery.max_slots:
            raise serializers.ValidationError(
                f"Slot number {slot_number} exceeds maximum slots ({gallery.max_slots})"
            )
        
        return data


class GallerySerializer(serializers.ModelSerializer):
    """Serializer for gallery"""
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    creator_profile_picture = serializers.ImageField(source='creator.profile_picture', read_only=True)
    layout_items = GalleryLayoutSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Gallery
        fields = [
            'gallery_id', 'title', 'description', 'status', 'picture',
            'creator', 'creator_username', 'creator_profile_picture',
            'max_slots', 'allow_free_positioning',
            'layout_items', 'item_count',
            'created_at', 'updated_at', 'is_deleted'
        ]
        read_only_fields = ['gallery_id', 'creator', 'created_at', 'updated_at', 'is_deleted']
    
    def get_item_count(self, obj):
        """Get count of items in this gallery"""
        return obj.layout_items.count()
    
    def create(self, validated_data):
        # Set creator from request context
        validated_data['creator'] = self.context['request'].user
        return super().create(validated_data)


class GalleryDetailSerializer(GallerySerializer):
    """Detailed gallery serializer with full item information"""
    layout_items = GalleryLayoutSerializer(many=True, read_only=True)
    
    class Meta(GallerySerializer.Meta):
        fields = GallerySerializer.Meta.fields


class BulkLayoutUpdateSerializer(serializers.Serializer):
    """Serializer for bulk updating multiple layout positions at once"""
    updates = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of layout updates with layout_id and updated fields"
    )
    
    def validate_updates(self, value):
        """Validate that each update has required fields"""
        for update in value:
            if 'layout_id' not in update:
                raise serializers.ValidationError("Each update must have a layout_id")
        return value