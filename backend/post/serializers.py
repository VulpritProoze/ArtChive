from rest_framework import serializers
from django.shortcuts import get_object_or_404
from .models import *
        
class NovelPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = NovelPost
        fields = ['chapter', 'content',]

class VideoPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoPost
        fields = ['video_url',]

class ImagePostSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagePost
        fields = ['image_url',]

class PostSerializer(serializers.ModelSerializer):
    image_url = serializers.ImageField(required=False, allow_null=True)
    video_url = serializers.FileField(required=False, allow_null=True)
    chapter = serializers.IntegerField(required=False, allow_null=True)
    content = serializers.CharField(required=False, allow_null=True)
    
    class Meta:
        model = Post
        fields = '__all__'
        
    def validate(self, data):
        post_type = data.get('post_type')
        
        if post_type.name == 'video' and not data.get('video_url'):
            raise serializers.ValidationError("Video posts require a video_url")
            
        if post_type.name == 'image' and not data.get('image_url'):
            raise serializers.ValidationError("Image posts require an image_url")
            
        if post_type.name == 'novel':
            if not data.get('chapter'):
                raise serializers.ValidationError("Novel posts require a chapter number")
            if not data.get('content'):
                raise serializers.ValidationError("Novel posts require content")
        
        return data
    
    def create(self, validated_data):
        image_url = validated_data.pop('image_url', None)
        video_url = validated_data.pop('video_url', None)
        chapter = validated_data.pop('chapter', None)
        content = validated_data.pop('content', None)

        post = Post.objects.create(**validated_data)

        if post.post_type.name == 'image' and image_url:
            ImagePost.objects.create(post_id=post, image_url=image_url)
        
        elif post.post_type.name == 'video' and video_url:
            VideoPost.objects.create(post_id=post, video_url=video_url)
            
        elif post.post_type.name == 'novel':
            novel_post = NovelPost.objects.create(post_id=post, chapter=chapter, content=content)
            
        return post
        
class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = '__all__'