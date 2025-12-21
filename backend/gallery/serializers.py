from django.utils import timezone
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from core.models import Artist
from post.models import Comment

from .models import Exhibit, Gallery


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

    def validate_picture(self, value):
        """Process gallery picture: resize, compress, and watermark."""
        if value:
            from common.utils.image_processing import process_gallery_picture, process_and_watermark_image
            
            # Get user from context for watermarking
            request = self.context.get('request')
            if request and request.user and request.user.is_authenticated:
                # Get gallery_id from instance if updating
                gallery_id = self.instance.gallery_id if self.instance else None
                try:
                    # Process and watermark image
                    return process_and_watermark_image(
                        image_file=value,
                        user_id=request.user.id,
                        username=request.user.username,
                        processing_function=process_gallery_picture,
                        gallery_id=gallery_id,
                    )
                except Exception as e:
                    # If watermarking fails, fall back to regular processing
                    try:
                        return process_gallery_picture(value)
                    except Exception as proc_err:
                        raise serializers.ValidationError(f"Failed to process image: {str(proc_err)}")
            else:
                # No user context, just process normally
                try:
                    return process_gallery_picture(value)
                except Exception as e:
                    raise serializers.ValidationError(f"Failed to process image: {str(e)}")
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

    def create(self, validated_data):
        """Create gallery and watermark record if picture exists."""
        gallery = super().create(validated_data)
        
        # Create watermark record if picture exists
        if gallery.picture:
            from core.models import WatermarkRecord
            from common.utils.watermark import generate_watermark_payload
            import hashlib
            import json
            
            try:
                user = validated_data.get('creator')
                payload = generate_watermark_payload(
                    user_id=user.id,
                    username=user.username,
                    gallery_id=gallery.gallery_id,
                )
                payload_str = json.dumps(payload, sort_keys=True)
                watermark_hash = hashlib.sha256(payload_str.encode()).hexdigest()
                
                WatermarkRecord.objects.create(
                    user=user,
                    content_type='gallery',
                    content_id=gallery.gallery_id,
                    image_url=str(gallery.picture),
                    watermark_version=1,
                    watermark_hash=watermark_hash,
                )
            except Exception:
                # Silently fail if watermark record creation fails
                pass
        
        return gallery


class GalleryPublicSerializer(ModelSerializer):
    """Serializer for public gallery endpoint - excludes canvas_json, includes creator details and reputation"""
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
        """Get creator details including artist types, brush drips count, and reputation"""
        creator = obj.creator

        # Get artist types if artist profile exists
        artist_types = []
        try:
            artist = getattr(creator, 'artist', None)
            if artist and artist.artist_types:
                artist_types = artist.artist_types
        except AttributeError:
            artist_types = []

        # Get brush drips balance (count)
        brush_drips_count = 0
        try:
            wallet = getattr(creator, 'user_wallet', None)
            if wallet:
                brush_drips_count = wallet.balance
        except AttributeError:
            brush_drips_count = 0

        # Get reputation
        reputation = getattr(creator, 'reputation', 0)

        return {
            'id': creator.id,
            'username': creator.username,
            'first_name': creator.first_name or '',
            'middle_name': creator.middle_name or None,
            'last_name': creator.last_name or '',
            'profile_picture': creator.profile_picture.url if creator.profile_picture else None,
            'artist_types': artist_types,
            'brush_drips_count': brush_drips_count,
            'reputation': reputation,
        }


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
    reputation = serializers.IntegerField()


class GalleryListSerializer(ModelSerializer):
    """Serializer for gallery list view with creator details"""
    creator_details = serializers.SerializerMethodField()
    awards = serializers.SerializerMethodField()

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
            'awards',
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
            'reputation': getattr(creator, 'reputation', 0),
        }

    def get_awards(self, obj):
        """Get unique award types for this gallery"""
        # Get awards using prefetch_related if available
        try:
            awards = obj.gallery_award.filter(is_deleted=False).select_related('gallery_award_type')
            award_types = {}
            for award in awards:
                award_type = award.gallery_award_type.award
                if award_type not in award_types:
                    award_types[award_type] = 0
                award_types[award_type] += 1
            return award_types
        except AttributeError:
            return {}


# ============================================================================
# Gallery Comment Serializers
# ============================================================================

class GalleryCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_picture = serializers.ImageField(
        source="author.profile_picture", read_only=True
    )
    author_artist_types = serializers.SerializerMethodField()
    gallery_title = serializers.CharField(source="gallery.title", read_only=True)
    is_deleted = serializers.BooleanField(read_only=True)

    class Meta:
        model = Comment
        fields = "__all__"

    def get_author_artist_types(self, obj):
        """Fetch author's artist types"""
        try:
            return obj.author.artist.artist_types
        except Artist.DoesNotExist:
            return []


class TopLevelGalleryCommentsViewSerializer(GalleryCommentSerializer):
    reply_count = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    show_replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "comment_id",
            "text",
            "created_at",
            "updated_at",
            "author_username",
            "author_picture",
            "gallery_title",
            "gallery",
            "author",
            "replies_to",
            "reply_count",
            "replies",
            "show_replies",
            "author_artist_types",
            "is_deleted",
        ]

    def get_reply_count(self, obj):
        """Get reply counts (excluding critique replies)"""
        if hasattr(obj, "reply_count"):
            return obj.reply_count
        return (
            obj.comment_reply.get_active_objects()
            .filter(is_critique_reply=False)
            .count()
        )

    def get_replies(self, obj):
        """Get all replies for this comment from prefetched data"""
        # Use prefetched replies if available
        if hasattr(obj, "prefetched_replies"):
            return GalleryCommentSerializer(
                obj.prefetched_replies, many=True, context=self.context
            ).data
        return []

    def get_show_replies(self, obj):
        """Show replies is false by default - user must click to expand"""
        # Always return False so replies are collapsed by default
        # The frontend will toggle this when user clicks "View replies"
        return False


class GalleryCommentCreateSerializer(ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text", "gallery"]
        extra_kwargs = {
            "gallery": {"required": False},
        }

    def to_representation(self, instance):
        return GalleryCommentSerializer(instance, context=self.context).data


class GalleryCommentUpdateSerializer(ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text"]

    def validate(self, data):
        # Ensure user owns the comment or is admin
        user = self.context["request"].user
        if not (user == self.instance.author or user.is_staff):
            raise serializers.ValidationError("You can only update your own comments")

        # Ensure comment is not deleted
        if self.instance.is_deleted:
            raise serializers.ValidationError("Cannot update a deleted comment")

        return data


class GalleryCommentDeleteSerializer(serializers.ModelSerializer):
    confirm = serializers.BooleanField(
        required=True, write_only=True, help_text="Must be True to confirm deletion"
    )

    class Meta:
        model = Comment
        fields = ["confirm"]

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
        user = self.context["request"].user
        if not (user == self.instance.author or user.is_staff):
            raise serializers.ValidationError("You can only delete your own comments")

        return data


class GalleryCommentReplyViewSerializer(GalleryCommentSerializer):
    class Meta:
        model = Comment
        fields = [
            "comment_id",
            "text",
            "created_at",
            "updated_at",
            "author_username",
            "author_picture",
            "gallery_title",
            "gallery",
            "author",
            "replies_to",
        ]


class GalleryCommentReplyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text", "replies_to"]
        extra_kwargs = {"replies_to": {"required": True, "write_only": True}}

    def validate_replies_to(self, value):
        # Prevent replying to a reply (only top-level comments allowed)
        if value.replies_to is not None:
            raise serializers.ValidationError(
                "You can only reply to top-level comments."
            )
        if value.is_deleted:
            raise serializers.ValidationError("Cannot reply to a deleted comment.")
        return value

    def validate(self, data):
        replies_to = data["replies_to"]

        # Auto-set author and gallery from parent comment
        data["gallery"] = replies_to.gallery  # inherit gallery from parent

        return data

    def to_representation(self, instance):
        return GalleryCommentSerializer(instance, context=self.context).data


# ============================================================================
# Exhibit Serializers
# ============================================================================


class ExhibitSerializer(ModelSerializer):
    """Serializer for exhibit detail view"""
    gallery_title = serializers.CharField(source='gallery.title', read_only=True)
    gallery_picture = serializers.ImageField(source='gallery.picture', read_only=True)
    gallery_creator_username = serializers.CharField(source='gallery.creator.username', read_only=True)

    class Meta:
        model = Exhibit
        fields = [
            'exhibit_id',
            'gallery',
            'gallery_title',
            'gallery_picture',
            'gallery_creator_username',
            'organizer_name',
            'city',
            'country',
            'start_date',
            'end_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['exhibit_id', 'created_at', 'updated_at']


class ExhibitCreateSerializer(ModelSerializer):
    """Serializer for creating exhibits"""

    class Meta:
        model = Exhibit
        fields = [
            'gallery',
            'organizer_name',
            'city',
            'country',
            'start_date',
            'end_date',
        ]

    def validate_gallery(self, value):
        """Validate that gallery exists and is not deleted"""
        if value.is_deleted:
            raise serializers.ValidationError("Cannot create exhibit for deleted gallery")
        return value

    def validate(self, data):
        """Validate exhibit dates and check if user already has an exhibit"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        gallery = data.get('gallery')

        # Check if user already has an exhibit (across all their galleries)
        if gallery and hasattr(self, 'context') and 'request' in self.context:
            user = self.context['request'].user
            # Check if user already has any active exhibit
            existing_exhibit = Exhibit.objects.get_active_objects().filter(
                gallery__creator=user
            ).exists()

            if existing_exhibit:
                raise serializers.ValidationError({
                    'gallery': 'You already have an exhibit. Only one exhibit per user is allowed.'
                })

        if start_date and end_date:
            if end_date <= start_date:
                raise serializers.ValidationError({
                    'end_date': 'End date must be after start date'
                })

            # Optional: Prevent creating exhibits in the past
            if start_date < timezone.now():
                raise serializers.ValidationError({
                    'start_date': 'Cannot create exhibit with start date in the past'
                })

        return data


class ExhibitUpdateSerializer(ModelSerializer):
    """Serializer for updating exhibits"""

    class Meta:
        model = Exhibit
        fields = [
            'organizer_name',
            'city',
            'country',
            'start_date',
            'end_date',
        ]

    def validate(self, data):
        """Validate exhibit dates"""
        start_date = data.get('start_date', self.instance.start_date if self.instance else None)
        end_date = data.get('end_date', self.instance.end_date if self.instance else None)

        if start_date and end_date:
            if end_date <= start_date:
                raise serializers.ValidationError({
                    'end_date': 'End date must be after start date'
                })

        return data


class ExhibitListSerializer(ModelSerializer):
    """Serializer for exhibit list views (lighter weight)"""
    gallery_title = serializers.CharField(source='gallery.title', read_only=True)
    gallery_picture = serializers.ImageField(source='gallery.picture', read_only=True)
    gallery_creator_username = serializers.CharField(source='gallery.creator.username', read_only=True)
    is_upcoming = serializers.SerializerMethodField()
    is_ongoing = serializers.SerializerMethodField()
    is_past = serializers.SerializerMethodField()

    class Meta:
        model = Exhibit
        fields = [
            'exhibit_id',
            'gallery_title',
            'gallery_picture',
            'gallery_creator_username',
            'organizer_name',
            'city',
            'country',
            'start_date',
            'end_date',
            'is_upcoming',
            'is_ongoing',
            'is_past',
            'created_at',
        ]

    def get_is_upcoming(self, obj):
        """Check if exhibit is upcoming"""
        now = timezone.now()
        return obj.start_date > now

    def get_is_ongoing(self, obj):
        """Check if exhibit is currently ongoing"""
        now = timezone.now()
        return obj.start_date <= now <= obj.end_date

    def get_is_past(self, obj):
        """Check if exhibit has ended"""
        now = timezone.now()
        return obj.end_date < now
