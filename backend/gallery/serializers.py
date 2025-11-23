from rest_framework import serializers
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
