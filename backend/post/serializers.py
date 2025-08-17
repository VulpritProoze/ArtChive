from rest_framework import serializers
from django.core.validators import FileExtensionValidator
from core.models import User
from common.utils import choices
from PIL import Image 
from .models import *
import io
        
class NovelPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = NovelPost
        fields = ['chapter', 'content',]

class PostCreateUpdateSerializer(serializers.ModelSerializer):
    image_url = serializers.ImageField(required=False, allow_null=True, write_only=True, validators=[
        FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif'])
    ])
    video_url = serializers.FileField(required=False, allow_null=True, write_only=True, validators=[
        FileExtensionValidator(allowed_extensions=['mp4', 'mov', 'avi', 'webm', 'mkv'])
    ])
    chapter = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    content = serializers.CharField(required=False, allow_blank=True, write_only=True)
    
    class Meta:
        model = Post
        fields = '__all__'
        extra_kwargs = {
            'post_type': {'required': False}  # Make optional for updates
        }
        
    def validate_video_url(self, value):
        if value is None:
            return value
            
        max_file_size = 100 * 1000000  # 100MB
        if value.size > max_file_size:
            raise serializers.ValidationError('Video file size must not exceed 100MB')
        return value
        
    def validate_image_url(self, value):
        if value is None:
            return value
            
        max_file_size = 2 * 1000000  # 5MB
        if value.size > max_file_size:
            raise serializers.ValidationError('Image size must not exceed 5MB')
            
        try:
            img = Image.open(value)
            img.verify()
        except Exception:
            raise serializers.ValidationError('Invalid image file')
        return value
        
    def validate_post_type(self, value):
        if value is None and self.instance:  # Allow None for updates
            return None
            
        valid_choices = [choice[0] for choice in choices.POST_TYPE_CHOICES]
        if value not in valid_choices:
            raise serializers.ValidationError('Invalid post type')
        return value
    
    # For non-field specific validation
    def validate(self, data):
        post_type = data.get('post_type')
        
        if post_type == 'default':
            if data.get('image_url') or data.get('video_url') or data.get('chapter') or data.get('content'):
                raise serializers.ValidationError({
                    'post_type': 'Default posts must not contain additional fields'
                })
                
        if post_type == 'video':
            if data.get('image_url') or data.get('chapter') or data.get('content'): 
                raise serializers.ValidationError({
                    'post_type': 'Video posts must not contain fields from other post type'
                })
                
            if not data.get('video_url'):
                raise serializers.ValidationError({
                    'post_type': 'Video posts must contain a video_url'
                })
            
        if post_type == 'image':
            if data.get('video_url') or data.get('chapter') or data.get('content'):
                raise serializers.ValidationError({
                    'post_type': 'Video posts must not contain fields from other post type'
                })
                
            if not data.get('image_url'):
                raise serializers.ValidationError({
                    'post_type': 'Image posts must contain an image_url'
                })
            
        if post_type == 'novel':
            if data.get('image_url') or data.get('video_url'):
                raise serializers.ValidationError({
                    'post_type': 'Novel posts must not contain fields from other post type'
                })
                
            if not data.get('chapter') and not data.get('content'):
                raise serializers.ValidationError({
                    'post_type': 'Novel posts must contain both chapter and content'
                })

        return data
    
    def create(self, validated_data):
        chapter = validated_data.pop('chapter', None)
        content = validated_data.pop('content', None)
        post_type = validated_data.get('post_type')

        post = Post.objects.create(**validated_data)
            
        if post_type == 'novel' and chapter is not None and content is not None:
            NovelPost.objects.create(post_id=post, chapter=chapter, content=content)
            
        return post
    
    def update(self, instance, validated_data):
        chapter = validated_data.pop('chapter', None)
        content = validated_data.pop('content', None)
        post_type = validated_data.get('post_type', instance.post_type)
        
        # Update main post fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Handle novel post updates
        if post_type == 'novel':
            if chapter is not None or content is not None:
                novel_post, created = NovelPost.objects.get_or_create(post_id=instance)
                if chapter is not None:
                    novel_post.chapter = chapter
                if content is not None:
                    novel_post.content = content
                novel_post.save()
        elif instance.post_type == 'novel':  # Clean up if changing from novel type
            NovelPost.objects.filter(post_id=instance).delete()
        
        # Clean up old media files when changing types
        if 'post_type' in validated_data:
            if instance.post_type == 'image' and post_type != 'image':
                instance.image_url.delete(save=False)
            elif instance.post_type == 'video' and post_type != 'video':
                instance.video_url.delete(save=False)
        
        instance.save()
        return instance

class PostDeleteSerializer(serializers.ModelSerializer):
    confirm = serializers.BooleanField(
        write_only=True,
        required=True,
        help_text="Must be set to True to confirm deletion"
    )

    class Meta:
        model = Post
        fields = []  # No model fields needed, just the confirmation

    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("You must confirm deletion")
        return value

    def validate(self, data):
        # Add any additional pre-deletion validation here
        if not self.instance:
            raise serializers.ValidationError("No post found to delete")
        return data

    def delete(self):
        # Handle media file cleanup
        if self.instance.image_url:
            self.instance.image_url.delete(save=False)
        if self.instance.video_url:
            self.instance.video_url.delete(save=False)

        # Delete related novel post if exists
        if hasattr(self.instance, 'novel_post'):
            self.instance.novel_post.delete()

        # Perform the deletion
        self.instance.delete()
    
class PostViewSerializer(serializers.ModelSerializer):
    novel_post = NovelPostSerializer(many=True)
    
    class Meta:
        model = Post 
        fields = '__all__'
        
class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = '__all__'