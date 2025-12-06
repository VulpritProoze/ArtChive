from rest_framework import serializers
from avatar.models import Avatar


class AvatarListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing avatars.
    Includes canvas_json to enable preview rendering from avatarOptions.
    """
    
    class Meta:
        model = Avatar
        fields = [
            'avatar_id',
            'name',
            'description',
            'status',
            'is_primary',
            'canvas_json',  # Include canvas_json for avatarOptions preview
            'rendered_image',
            'thumbnail',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['avatar_id', 'created_at', 'updated_at']


class AvatarDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for avatar details including canvas data.
    Used for create, retrieve, and update operations.
    """
    
    class Meta:
        model = Avatar
        fields = [
            'avatar_id',
            'name',
            'description',
            'status',
            'is_primary',
            'canvas_json',
            'rendered_image',
            'thumbnail',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['avatar_id', 'created_at', 'updated_at']


class AvatarCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new avatars.
    """
    
    class Meta:
        model = Avatar
        fields = [
            'name',
            'description',
            'canvas_json',
            'status',
        ]
    
    def validate_canvas_json(self, value):
        """Validate canvas JSON structure"""
        if value:
            # Ensure required keys exist
            if 'width' not in value or 'height' not in value:
                raise serializers.ValidationError(
                    "Canvas JSON must contain 'width' and 'height'"
                )
            
            # Validate fixed dimensions
            if value.get('width') != 512 or value.get('height') != 512:
                raise serializers.ValidationError(
                    "Avatar canvas must be 512x512 pixels"
                )
        
        return value


class AvatarUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating existing avatars.
    """
    
    class Meta:
        model = Avatar
        fields = [
            'name',
            'description',
            'canvas_json',
            'status',
        ]
    
    def validate_canvas_json(self, value):
        """Validate canvas JSON structure"""
        if value:
            # Ensure required keys exist
            if 'width' not in value or 'height' not in value:
                raise serializers.ValidationError(
                    "Canvas JSON must contain 'width' and 'height'"
                )
            
            # Validate fixed dimensions
            if value.get('width') != 512 or value.get('height') != 512:
                raise serializers.ValidationError(
                    "Avatar canvas must be 512x512 pixels"
                )
        
        return value

