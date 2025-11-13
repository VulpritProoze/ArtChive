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
