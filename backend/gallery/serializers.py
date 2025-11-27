from rest_framework import serializers
<<<<<<< HEAD
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
            'related_post_id', 'related_trophy_id',
            'created_at', 'is_featured'
        ]
        read_only_fields = ['item_id', 'owner', 'created_at', 'is_achievement', 
                           'achievement_type', 'achievement_date', 'achievement_metadata',
                           'related_post_id', 'related_trophy_id']
    
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
=======
from rest_framework.serializers import ModelSerializer

from .models import Gallery


class GallerySerializer(ModelSerializer):
    creator = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Gallery
        fields = [
            'gallery_id',
            'title',
            'description',
            'status',
            'picture',
            'canvas_json',
            'canvas_width',
            'canvas_height',
            'is_deleted',
            'created_at',
            'updated_at',
            'creator',
        ]
        read_only_fields = ['gallery_id', 'created_at', 'updated_at', 'creator']

    def validate_canvas_width(self, value):
        """Validate canvas width is within reasonable bounds"""
        if value < 100:
            raise serializers.ValidationError("Canvas width must be at least 100px")
        if value > 10000:
            raise serializers.ValidationError("Canvas width cannot exceed 10000px")
        return value

    def validate_canvas_height(self, value):
        """Validate canvas height is within reasonable bounds"""
        if value < 100:
            raise serializers.ValidationError("Canvas height must be at least 100px")
        if value > 10000:
            raise serializers.ValidationError("Canvas height cannot exceed 10000px")
        return value

    def validate_canvas_json(self, value):
        """Validate that canvas_json has the required structure"""
        if value is not None:
            if not isinstance(value, dict):
                raise serializers.ValidationError("canvas_json must be a JSON object")

            # Basic validation - ensure it has objects array
            if 'objects' in value and not isinstance(value.get('objects'), list):
                raise serializers.ValidationError("canvas_json.objects must be an array")

        return value

    def validate_status(self, value):
        """Validate that only one gallery can be active at a time per user"""
        if value == 'active':
            # Get the user from the context (passed from view)
            user = self.context.get('request').user if self.context.get('request') else None

            if user:
                # Check if there's already an active gallery for this user
                existing_active = Gallery.objects.get_active_objects().filter(
                    creator=user,
                    status='active'
                )

                # If updating an existing gallery, exclude it from the check
                if self.instance:
                    existing_active = existing_active.exclude(gallery_id=self.instance.gallery_id)

                if existing_active.exists():
                    raise serializers.ValidationError(
                        "You can only have one active gallery at a time. "
                        "Please archive or set another gallery to draft first."
                    )

        return value


class CreatorDetailSerializer(serializers.Serializer):
    """Nested serializer for creator details in gallery list"""
    id = serializers.IntegerField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    middle_name = serializers.CharField(allow_null=True)
    last_name = serializers.CharField()
    profile_picture = serializers.ImageField()
    artist_types = serializers.ListField(
        child=serializers.CharField(),
        allow_null=True,
        required=False
    )
    brush_drips_count = serializers.IntegerField()


class GalleryListSerializer(ModelSerializer):
    """Serializer for gallery list view with creator details"""
    creator_details = serializers.SerializerMethodField()

    class Meta:
        model = Gallery
        fields = [
            'gallery_id',
            'title',
            'description',
            'status',
            'picture',
            'canvas_width',
            'canvas_height',
            'created_at',
            'updated_at',
            'creator_details',
        ]
        read_only_fields = ['gallery_id', 'created_at', 'updated_at']

    def get_creator_details(self, obj):
        """Get creator details including artist types and brush drips count"""
        creator = obj.creator

        # Get artist types if artist profile exists (using select_related)
        artist_types = []
        try:
            artist = getattr(creator, 'artist', None)
            if artist and artist.artist_types:
                artist_types = artist.artist_types
        except AttributeError:
            artist_types = []

        # Get brush drips balance (count) (using select_related)
        brush_drips_count = 0
        try:
            wallet = getattr(creator, 'user_wallet', None)
            if wallet:
                brush_drips_count = wallet.balance
        except AttributeError:
            brush_drips_count = 0

        return {
            'id': creator.id,
            'username': creator.username,
            'first_name': creator.first_name or '',
            'middle_name': creator.middle_name or None,
            'last_name': creator.last_name or '',
            'profile_picture': creator.profile_picture.url if creator.profile_picture else None,
            'artist_types': artist_types,
            'brush_drips_count': brush_drips_count,
        }
>>>>>>> 9b57c94341f0e091accd798e04e37453060f4891
