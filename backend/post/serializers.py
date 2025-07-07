from rest_framework import serializers
from django.core.validators import FileExtensionValidator
from account.models import User
from common.utils import choices
from PIL import Image 
from .models import *
import io
        
class NovelPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = NovelPost
        fields = ['chapter', 'content',]

class PostCreateSerializer(serializers.ModelSerializer):
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
        
    def validate_video_url(self, value):
        max_file_size = 100 * 1000000 # 100MB
        
        if value.size > max_file_size:
            raise serializers.ValidationError('Video\'s file size must not exceed 100MB')
        
        return value
        
    def validate_image_url(self, value):
        max_file_size = 2 * 1000000 # 5MB
        
        if value is None:
            return value
        
        if value.size > max_file_size:
            raise serializers.ValidationError('Image size must not exceed 5MB')
        
        try:
            img = Image.open(value)
            img.verify()
        except Exception:
            raise serializers.ValidationError('Image is invalid')

        return value
        
    def validate_post_type(self, value):
        valid_choices = [choice[0] for choice in choices.POST_TYPE_CHOICES]
        
        if value not in valid_choices:
            raise serializers.ValidationError('Invalid post type')
        
        return value
    
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
        post_type = validated_data.get('post_type', None)

        post = Post.objects.create(**validated_data)
            
        if post_type == 'novel' and chapter and content:
            NovelPost.objects.create(post_id=post, chapter=chapter, content=content)
            
        return post
    
class PostViewSerializer(serializers.ModelSerializer):
    novel_post = NovelPostSerializer(many=True)
    
    class Meta:
        model = Post 
        fields = '__all__'
        
class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = '__all__'