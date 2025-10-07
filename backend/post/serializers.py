from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from django.core.validators import FileExtensionValidator
from django.core.exceptions import PermissionDenied
from core.models import User, Artist
from common.utils import choices
from PIL import Image 
from .pagination import CommentPagination
from .models import *
from core.models import Artist
import io
        
class NovelPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = NovelPost
        fields = ['chapter', 'content',]

class PostCreateSerializer(serializers.ModelSerializer):
    '''
    Serializer for Posts creation. A post can either be default, novel, image, or video.
    
    Default post fields:
    - description
    - post type (default)
    - author
    - collective (public by default)

    Image post fields:
    - all default post fields
    - image url

    Video post fields:
    - all default post fields
    - video url

    Novel post fields:
    - all default post fields
    - chapter
    - content
    '''
    image_url = serializers.ImageField(required=False, allow_null=True, write_only=True, validators=[
        FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif'])
    ])
    video_url = serializers.FileField(required=False, allow_null=True, write_only=True, validators=[
        FileExtensionValidator(allowed_extensions=['mp4', 'mov', 'avi', 'webm', 'mkv'])
    ])
    chapters = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        required=False,
        allow_null=True,
        write_only=True,
    )
    
    class Meta:
        model = Post
        fields = '__all__'
        extra_kwargs = {
            'author': {'read_only': True}
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
    
    def validate_chapters(self, value):
        if value is None:
            return value
        
        for chapter_data in value:
            if 'chapter' not in chapter_data or 'content' not in chapter_data:
                raise serializers.ValidationError('Each chapter must have both chapter number and content')

            try:
                chapter_number = int(chapter_data['chapter'])
                if chapter_number < 1:
                    raise serializers.ValidationError('Chapter number must be a postive integer')

            except (ValueError, TypeError):
                raise serializers.ValidationError('Chapter number must be a valid integer')
        
        return value

    # For non-field specific validation
    def validate(self, data):
        post_type = data.get('post_type')
        
        # Default posts should not have an image url, video url, chapter, or content fields
        if post_type == 'default':
            if data.get('image_url') or data.get('video_url') or data.get('chapters'):
                raise serializers.ValidationError({
                    'post_type': 'Default posts must not contain additional fields'
                })
                
        # Video posts should not have an image url, chapter, or content fields
        if post_type == 'video':
            if data.get('image_url') or data.get('chapters'): 
                raise serializers.ValidationError({
                    'post_type': 'Video posts must not contain fields from other post type'
                })
                
            if not data.get('video_url'):
                raise serializers.ValidationError({
                    'post_type': 'Video posts must contain a video_url'
                })

        # Image posts should not have a video url, chapter, or content fields 
        if post_type == 'image':
            if data.get('video_url') or data.get('chapters'):
                raise serializers.ValidationError({
                    'post_type': 'Video posts must not contain fields from other post type'
                })
                
            if not data.get('image_url'):
                raise serializers.ValidationError({
                    'post_type': 'Image posts must contain an image_url'
                })
            
        # Novel posts should not have an image url or video url fields
        if post_type == 'novel':
            if data.get('image_url') or data.get('video_url'):
                raise serializers.ValidationError({
                    'post_type': 'Novel posts must not contain fields from other post type'
                })
                
            if not data.get('chapters'):
                raise serializers.ValidationError({
                    'post_type': 'Novel posts must contain at least one chapter'
                })

        return data
    
    def create(self, validated_data):
        chapters_data = validated_data.pop('chapters', [])
        post_type = validated_data.get('post_type')

        post = Post.objects.create(**validated_data)
            
        if post_type == 'novel' and chapters_data:
            for chapter_data in chapters_data:
                NovelPost.objects.create(
                    post_id=post,
                    chapter=chapter_data['chapter'],
                    content=chapter_data['content'],
                )
            # NovelPost.objects.create(post_id=post, chapter=chapter, content=content)
            
        return post

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Add novel posts to representation if post type is novel
        if instance.post_type == 'novel':
            novel_posts = NovelPost.objects.filter(post_id=instance)
            representation['chapters'] = NovelPostSerializer(novel_posts, many=True).data
        
        return representation

class PostUpdateSerializer(ModelSerializer):
    '''
    Serializer for Post updates only - post_type cannot be changed
    '''
    image_url = serializers.ImageField(required=False, allow_null=True, write_only=True, validators=[
        FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif'])
    ])
    video_url = serializers.FileField(required=False, allow_null=True, write_only=True, validators=[
        FileExtensionValidator(allowed_extensions=['mp4', 'mov', 'avi', 'webm', 'mkv'])
    ])
    chapters = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        required=False,
        allow_null=True,
        write_only=True,
    )
    class Meta:
        model = Post
        fields = '__all__'
        extra_kwargs = {
            'post_type': { 'read_only': True },
            'author': {'read_only': True}
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
    
    def validate_chapters(self, value):
        if value is None:
            return value
        
        for chapter_data in value:
            if 'chapter' not in chapter_data or 'content' not in chapter_data:
                raise serializers.ValidationError('Each chapter must have both chapter number and content')

            try:
                chapter_number = int(chapter_data['chapter'])
                if chapter_number < 1:
                    raise serializers.ValidationError('Chapter number must be a postive integer')

            except (ValueError, TypeError):
                raise serializers.ValidationError('Chapter number must be a valid integer')
        
        return value
    
    def validate(self, data):
        # Ensure no cross-type field updates
        current_post_type = self.instance.post_type
        
        if current_post_type == 'default':
            if any(field in data for field in ['image_url', 'video_url', 'chapters']):
                raise serializers.ValidationError(
                    'Default posts cannot have image, video, or chapter fields'
                )
                
        elif current_post_type == 'image':
            if any(field in data for field in ['video_url', 'chapters']):
                raise serializers.ValidationError(
                    'Image posts cannot have video or chapter fields'
                )
                
        elif current_post_type == 'video':
            if any(field in data for field in ['image_url', 'chapters']):
                raise serializers.ValidationError(
                    'Video posts cannot have image or chapter fields'
                )
                
        elif current_post_type == 'novel':
            if any(field in data for field in ['image_url', 'video_url']):
                raise serializers.ValidationError(
                    'Novel posts cannot have image or video fields'
                )
        
        return data

    def update(self, instance, validated_data):
        # For novel posts, handle chapter updates separately
        if instance.post_type == 'novel' and 'chapters' in validated_data:
            chapters_data = validated_data.pop('chapters')
            
            # Delete existing novel posts and create new ones
            NovelPost.objects.filter(post_id=instance).delete()
            for chapter_data in chapters_data:
                NovelPost.objects.create(
                    post_id=instance,
                    chapter=chapter_data['chapter'],
                    content=chapter_data['content']
                )
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        if instance.post_type == 'novel':
            novel_posts = NovelPost.objects.filter(post_id=instance)
            representation['chapters'] = NovelPostSerializer(novel_posts, many=True).data
        
        return representation

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
    
class PostViewSerializer(serializers.ModelSerializer):
    novel_post = NovelPostSerializer(many=True)
    hearts_count = serializers.SerializerMethodField()
    is_hearted_by_user = serializers.SerializerMethodField()
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_artist_types = serializers.SerializerMethodField()
    author_fullname = serializers.SerializerMethodField()
    author_picture = serializers.ImageField(source='author.profile_picture', read_only=True)
    channel_name = serializers.CharField(source='channel.name', read_only=True)
    comment_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Post 
        fields = '__all__'

    def get_hearts_count(self, obj):
        """Get the number of hearts for this post"""
        return obj.post_heart.count()  # Using the related_name from PostHeart model

    def get_is_hearted_by_user(self, obj):
        """Check if the current user has hearted this post"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.post_heart.filter(author=request.user).exists()
        return False
    
    def get_author_artist_types(self, obj):
        '''Fetch author's artist types'''
        try:
            return obj.author.artist.artist_types
        except Artist.DoesNotExist:
            return []

    def get_author_fullname(self, obj):
        '''Fetch author's full name. Return username if author has no provided name'''
        user = obj.author
        parts = [user.first_name or '', user.last_name or '']    
        full_name = ' '.join(part.strip() for part in parts if part and part.strip())
        return full_name if full_name else user.username

    def get_comment_count(self, obj):
        return obj.post_comment.filter(is_deleted=False).count()

    
class PostDetailViewSerializer(PostViewSerializer):
    class Meta:
        model = Post
        fields = '__all__'

class PostListViewSerializer(PostViewSerializer):
    comments = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = '__all__'
    
    def get_comments(self, obj):
        """Get first 2 comments for this post"""
        comments = obj.post_comment.all().order_by('-created_at')[:2]  # Get latest 2 comments
        return TopLevelCommentsViewSerializer(comments, many=True, context=self.context).data

class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_picture = serializers.ImageField(source='author.profile_picture', read_only=True)
    author_artist_types = serializers.CharField(source='author.artist.artist_types', read_only=True)
    post_title = serializers.CharField(source='post_id.title', read_only=True)
    critique_author_username = serializers.CharField(source='critique_id.author.username', read_only=True, allow_null=True)
    critique_author_picture = serializers.ImageField(source='critique_id.author.profile_picture', read_only=True, allow_null=True)
    critique_author_artist_types = serializers.CharField(source='critique_id.author.artist.artist_types', read_only=True)
    critique_author_id = serializers.IntegerField(source='critique_id.author.id', read_only=True, allow_null=True)
    is_deleted = serializers.BooleanField(read_only=True)

    class Meta:
        model = Comment
        fields = '__all__'

class TopLevelCommentsViewSerializer(CommentSerializer):
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'comment_id',
            'text',
            'created_at',
            'updated_at',
            'author_username',
            'author_picture',
            'post_title',
            'post_id',
            'author',
            'replies_to',
            'reply_count',
            'is_deleted'
        ]
    
    def get_reply_count(self, obj):
        '''Get reply counts'''
        return obj.comment_reply.filter(is_deleted=False).count()

class CommentCreateSerializer(ModelSerializer):
    class Meta:
        model = Comment
        fields = ['text', 'post_id']
        extra_kwargs = {
            'post_id': {'required': False},
        }
    
class CommentUpdateSerializer(ModelSerializer):
    class Meta:
        model = Comment
        fields = ['text']

    def validate(self, data):
        # Ensure user owns the comment or is admin
        user = self.context['request'].user
        if not (user == self.instance.author or user.is_staff):
            raise serializers.ValidationError("You can only update your own comments")
        
        # Ensure comment is not deleted
        if self.instance.is_deleted:
            raise serializers.ValidationError("Cannot update a deleted comment")
        
        return data

class CommentDeleteSerializer(serializers.ModelSerializer):
    confirm = serializers.BooleanField(
        required=True,
        write_only=True,
        help_text="Must be True to confirm deletion"
    )

    class Meta:
        model = Comment
        fields = ['confirm']

    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("Must confirm deletion")
        return value

    def validate(self, data):
        if not self.instance:
            raise serializers.ValidationError("Comment not found")
        
        # Ensure comment is not already deleted
        if self.instance.is_deleted:
            raise serializers.ValidationError("Comment is already deleted")
        
        # Ensure user owns the comment or is admin
        user = self.context['request'].user
        if not (user == self.instance.author or user.is_staff):
            raise serializers.ValidationError("You can only delete your own comments")
        
        return data

class CommentReplyViewSerializer(CommentSerializer):
    class Meta:
        model = Comment
        fields = [
            'comment_id',
            'text',
            'created_at',
            'updated_at',
            'author_username',
            'author_picture',
            'post_title',
            'post_id',
            'author',
            'replies_to',
        ]

class CommentReplyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['text', 'replies_to']
        extra_kwargs = {
            'replies_to': {'required': True, 'write_only': True}
        }

    def validate_replies_to(self, value):
        # Prevent replying to a reply (only top-level comments allowed)
        if value.replies_to is not None:
            raise serializers.ValidationError("You can only reply to top-level comments.")
        if value.is_deleted:
            raise serializers.ValidationError("Cannot reply to a deleted comment.")
        return value

    def validate(self, data):
        request = self.context['request']
        replies_to = data['replies_to']

        # Auto-set author and post_id from parent comment
        data['author'] = request.user
        data['post_id'] = replies_to.post_id  # inherit post from parent
        
        return data

class CritiqueReplySerializer(CommentSerializer):
    class Meta:
        model = Comment
        fields = [
            'comment_id',
            'text',
            'created_at',
            'updated_at',
            'author_username',
            'author_picture',
            'post_title',
            'post_id',
            'author',
            'is_critique_reply',
            'critique_id',
        ]

    def get_reply_count(self, obj):
        '''Get reply counts'''
        return obj.comment_reply.filter(is_deleted=False).count()

class CritiqueReplyCreateSerializer(ModelSerializer):
    class Meta:
        model = Comment
        fields = ['text', 'critique_id']
        extra_kwargs = {
            'critique_id': {'required': True, 'write_only': True}
        }

    def validate_critique_id(self, value):
        # Ensure critique exists and is not deleted
        if value.is_deleted:
            raise serializers.ValidationError("Cannot reply to a deleted critique.")
        return value

    def validate(self, data):
        request = self.context['request']
        critique = data['critique_id']

        # Auto-set author, post_id from critique, and set as critique reply
        data['author'] = request.user
        data['post_id'] = critique.post_id  # inherit post from critique
        data['is_critique_reply'] = True  # Explicitly set as critique reply
        data['replies_to'] = None  # Ensure no reply chain for critique replies
        
        return data
    
class ReplyUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['text']  # Only allow updating the text

    def validate(self, data):
        # Ensure this is actually a reply (defensive check)
        if self.instance and self.instance.replies_to is None:
            raise serializers.ValidationError("This is not a reply comment.")
        
        # Ensure reply is not deleted
        if self.instance.is_deleted:
            raise serializers.ValidationError("Cannot update a deleted reply")
            
        return data
    
class PostHeartSerializer(ModelSerializer):
    class Meta:
        model = PostHeart
        fields = '__all__'

class PostHeartCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostHeart
        fields = ['post_id']

    def validate(self, data):
        # Auto-set the author to current user
        request = self.context.get('request')
        if request and request.method == 'POST':
            data['author'] = request.user
        
        # Check if user already hearted this post
        if PostHeart.objects.filter(
            post_id=data['post_id'], 
            author=data['author']
        ).exists():
            raise serializers.ValidationError("You have already hearted this post")
        
        return data
    
class CritiqueSerializer(ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_picture = serializers.CharField(source='author.profile_picture', read_only=True)
    post_title = serializers.CharField(source='post_id.title', read_only=True)
    author_artist_types = serializers.SerializerMethodField()
    author_fullname = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    is_deleted = serializers.BooleanField(read_only=True)

    class Meta:
        model = Critique
        fields = '__all__'

    def get_author_artist_types(self, obj):
        '''Fetch author's artist types'''
        try:
            return obj.author.artist.artist_types
        except Artist.DoesNotExist:
            return []

    def get_author_fullname(self, obj):
        '''Fetch author's full name. Return username if author has no provided name'''
        user = obj.author
        parts = [user.first_name or '', user.last_name or '']    
        full_name = ' '.join(part.strip() for part in parts if part and part.strip())
        return full_name if full_name else user.username
    
    def get_reply_count(self, obj):
        '''Get reply counts'''
        return obj.critique_reply.count()

class CritiqueCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Critique
        fields = ['text', 'impression', 'post_id']

    def validate_impression(self, value):
        valid_choices = [choice[0] for choice in choices.CRITIQUE_IMPRESSIONS]
        if value not in valid_choices:
            raise serializers.ValidationError('Invalid impression type')
        return value

    def validate(self, data):
        # Auto-set the author to current user
        request = self.context.get('request')
        if request and request.method == 'POST':
            data['author'] = request.user
        
        # Check if user already created a critique for this post
        if Critique.objects.filter(
            post_id=data['post_id'], 
            author=data['author'],
            is_deleted=False
        ).exists():
            raise serializers.ValidationError("You have already created a critique for this post")
        
        return data

    def to_representation(self, instance):
        return CritiqueSerializer(instance, context=self.context).data

class CritiqueUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Critique
        fields = ['text', 'impression']

    def validate_impression(self, value):
        valid_choices = [choice[0] for choice in choices.CRITIQUE_IMPRESSIONS]
        if value not in valid_choices:
            raise serializers.ValidationError('Invalid impression type')
        return value

    def validate(self, data):
        # Ensure user owns the critique
        user = self.context['request'].user
        if not (user == self.instance.author or user.is_staff):
            raise serializers.ValidationError("You can only update your own critiques")
        
        return data

    def to_representation(self, instance):
        return CritiqueSerializer(instance, context=self.context).data

class CritiqueDeleteSerializer(serializers.ModelSerializer):
    confirm = serializers.BooleanField(
        required=True,
        write_only=True,
        help_text="Must be True to confirm deletion"
    )

    class Meta:
        model = Critique
        fields = ['confirm']

    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("Must confirm deletion")
        return value