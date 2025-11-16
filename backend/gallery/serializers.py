from rest_framework import serializers

from .models import Gallery


class GallerySerializer(serializers.ModelSerializer):
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
