"""
Serializers for search functionality.
Lightweight serializers optimized for search result previews.
"""
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from collective.models import Collective
from core.models import Artist, User
from gallery.models import Gallery
from post.models import Post

from .models import UserSearchHistory


class UserSearchSerializer(ModelSerializer):
    """Lightweight user serializer for search results"""
    fullname = serializers.SerializerMethodField()
    artist_types = serializers.SerializerMethodField()
    profile_picture = serializers.ImageField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'fullname',
            'profile_picture',
            'artist_types',
        ]
        read_only_fields = ['id', 'username', 'fullname', 'profile_picture', 'artist_types']

    def get_fullname(self, obj):
        """Get user's full name or username"""
        parts = [obj.first_name or '', obj.last_name or '']
        full_name = ' '.join(part.strip() for part in parts if part and part.strip())
        return full_name if full_name else obj.username

    def get_artist_types(self, obj):
        """Get user's artist types"""
        try:
            return obj.artist.artist_types
        except Artist.DoesNotExist:
            return []


class PostSearchSerializer(ModelSerializer):
    """Lightweight post serializer for search results"""
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_profile_picture = serializers.ImageField(source='author.profile_picture', read_only=True)
    image_url = serializers.ImageField(read_only=True)

    class Meta:
        model = Post
        fields = [
            'post_id',
            'description',
            'post_type',
            'image_url',
            'author',
            'author_username',
            'author_profile_picture',
            'created_at',
        ]
        read_only_fields = [
            'post_id',
            'description',
            'post_type',
            'image_url',
            'author',
            'author_username',
            'author_profile_picture',
            'created_at',
        ]


class CollectiveSearchSerializer(ModelSerializer):
    """Lightweight collective serializer for search results"""
    picture = serializers.ImageField(read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Collective
        fields = [
            'collective_id',
            'title',
            'description',
            'picture',
            'member_count',
            'created_at',
        ]
        read_only_fields = [
            'collective_id',
            'title',
            'description',
            'picture',
            'member_count',
            'created_at',
        ]

    def get_member_count(self, obj):
        """Get member count"""
        if hasattr(obj, 'collective_member'):
            return obj.collective_member.count()
        return obj.collective_member.count()


class GallerySearchSerializer(ModelSerializer):
    """Lightweight gallery serializer for search results"""
    picture = serializers.ImageField(read_only=True)
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    creator_profile_picture = serializers.ImageField(source='creator.profile_picture', read_only=True)
    creator_id = serializers.IntegerField(source='creator.id', read_only=True)

    class Meta:
        model = Gallery
        fields = [
            'gallery_id',
            'title',
            'description',
            'status',
            'picture',
            'creator',
            'creator_id',
            'creator_username',
            'creator_profile_picture',
            'created_at',
        ]
        read_only_fields = [
            'gallery_id',
            'title',
            'description',
            'status',
            'picture',
            'creator',
            'creator_id',
            'creator_username',
            'creator_profile_picture',
            'created_at',
        ]


class UserSearchHistorySerializer(ModelSerializer):
    """Serializer for user search history"""
    class Meta:
        model = UserSearchHistory
        fields = [
            'id',
            'query',
            'search_type',
            'result_count',
            'is_successful',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'query',
            'search_type',
            'result_count',
            'is_successful',
            'created_at',
        ]

