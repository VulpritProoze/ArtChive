from django.core.validators import FileExtensionValidator
from PIL import Image
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from common.utils import choices
from common.utils.choices import TROPHY_BRUSH_DRIP_COSTS
from core.models import Artist, BrushDripWallet

from .models import (
    Comment,
    Critique,
    NovelPost,
    Post,
    PostHeart,
    PostPraise,
    PostTrophy,
    TrophyType,
)


class NovelPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = NovelPost
        fields = [
            "chapter",
            "content",
        ]


class PostCreateSerializer(ModelSerializer):
    """
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
    """

    image_url = serializers.ImageField(
        required=False,
        allow_null=True,
        write_only=True,
        validators=[
            FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "gif"])
        ],
    )
    video_url = serializers.FileField(
        required=False,
        allow_null=True,
        write_only=True,
        validators=[
            FileExtensionValidator(
                allowed_extensions=["mp4", "mov", "avi", "webm", "mkv"]
            )
        ],
    )
    chapters = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = Post
        fields = "__all__"
        extra_kwargs = {"author": {"read_only": True}}

    def validate_video_url(self, value):
        if value is None:
            return value

        max_file_size = 100 * 1000000  # 100MB
        if value.size > max_file_size:
            raise serializers.ValidationError("Video file size must not exceed 100MB")
        return value

    def validate_image_url(self, value):
        if value is None:
            return value

        max_file_size = 2 * 1000000  # 5MB
        if value.size > max_file_size:
            raise serializers.ValidationError("Image size must not exceed 5MB")

        try:
            img = Image.open(value)
            img.verify()
            # Reset file pointer after verification so Cloudinary can read it
            value.seek(0)
        except Exception:
            raise serializers.ValidationError("Invalid image file")
        return value

    def validate_post_type(self, value):
        if value is None and self.instance:  # Allow None for updates
            return None

        valid_choices = [choice[0] for choice in choices.POST_TYPE_CHOICES]
        if value not in valid_choices:
            raise serializers.ValidationError("Invalid post type")
        return value

    def validate_chapters(self, value):
        if value is None:
            return value

        for chapter_data in value:
            if "chapter" not in chapter_data or "content" not in chapter_data:
                raise serializers.ValidationError(
                    "Each chapter must have both chapter number and content"
                )

            try:
                chapter_number = int(chapter_data["chapter"])
                if chapter_number < 1:
                    raise serializers.ValidationError(
                        "Chapter number must be a postive integer"
                    )

            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    "Chapter number must be a valid integer"
                )

        return value

    # For non-field specific validation
    def validate(self, data):
        post_type = data.get("post_type")

        # Default posts should not have an image url, video url, chapter, or content fields
        if post_type == "default":
            if data.get("image_url") or data.get("video_url") or data.get("chapters"):
                raise serializers.ValidationError(
                    {"post_type": "Default posts must not contain additional fields"}
                )

        # Video posts should not have an image url, chapter, or content fields
        if post_type == "video":
            if data.get("image_url") or data.get("chapters"):
                raise serializers.ValidationError(
                    {
                        "post_type": "Video posts must not contain fields from other post type"
                    }
                )

            if not data.get("video_url"):
                raise serializers.ValidationError(
                    {"post_type": "Video posts must contain a video_url"}
                )

        # Image posts should not have a video url, chapter, or content fields
        if post_type == "image":
            if data.get("video_url") or data.get("chapters"):
                raise serializers.ValidationError(
                    {
                        "post_type": "Video posts must not contain fields from other post type"
                    }
                )

            if not data.get("image_url"):
                raise serializers.ValidationError(
                    {"post_type": "Image posts must contain an image_url"}
                )

        # Novel posts should not have an image url or video url fields
        if post_type == "novel":
            if data.get("image_url") or data.get("video_url"):
                raise serializers.ValidationError(
                    {
                        "post_type": "Novel posts must not contain fields from other post type"
                    }
                )

            if not data.get("chapters"):
                raise serializers.ValidationError(
                    {"post_type": "Novel posts must contain at least one chapter"}
                )

        return data

    def create(self, validated_data):
        chapters_data = validated_data.pop("chapters", [])
        post_type = validated_data.get("post_type")

        post = Post.objects.create(**validated_data)

        if post_type == "novel" and chapters_data:
            for chapter_data in chapters_data:
                NovelPost.objects.create(
                    post_id=post,
                    chapter=chapter_data["chapter"],
                    content=chapter_data["content"],
                )
            # NovelPost.objects.create(post_id=post, chapter=chapter, content=content)

        return post

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        # Add novel posts to representation if post type is novel
        if instance.post_type == "novel":
            novel_posts = NovelPost.objects.filter(post_id=instance)
            representation["chapters"] = NovelPostSerializer(
                novel_posts, many=True
            ).data

        return representation


class PostUpdateSerializer(ModelSerializer):
    """
    Serializer for Post updates only - post_type cannot be changed
    """

    image_url = serializers.ImageField(
        required=False,
        allow_null=True,
        write_only=True,
        validators=[
            FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "gif"])
        ],
    )
    video_url = serializers.FileField(
        required=False,
        allow_null=True,
        write_only=True,
        validators=[
            FileExtensionValidator(
                allowed_extensions=["mp4", "mov", "avi", "webm", "mkv"]
            )
        ],
    )
    chapters = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = Post
        fields = "__all__"
        extra_kwargs = {"post_type": {"read_only": True}, "author": {"read_only": True}}

    def validate_video_url(self, value):
        if value is None:
            return value

        max_file_size = 100 * 1000000  # 100MB
        if value.size > max_file_size:
            raise serializers.ValidationError("Video file size must not exceed 100MB")
        return value

    def validate_image_url(self, value):
        if value is None:
            return value

        max_file_size = 2 * 1000000  # 5MB
        if value.size > max_file_size:
            raise serializers.ValidationError("Image size must not exceed 5MB")

        try:
            img = Image.open(value)
            img.verify()
            # Reset file pointer after verification so Cloudinary can read it
            value.seek(0)
        except Exception:
            raise serializers.ValidationError("Invalid image file")
        return value

    def validate_chapters(self, value):
        if value is None:
            return value

        for chapter_data in value:
            if "chapter" not in chapter_data or "content" not in chapter_data:
                raise serializers.ValidationError(
                    "Each chapter must have both chapter number and content"
                )

            try:
                chapter_number = int(chapter_data["chapter"])
                if chapter_number < 1:
                    raise serializers.ValidationError(
                        "Chapter number must be a postive integer"
                    )

            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    "Chapter number must be a valid integer"
                )

        return value

    def validate(self, data):
        # Ensure no cross-type field updates
        current_post_type = self.instance.post_type

        if current_post_type == "default":
            if any(field in data for field in ["image_url", "video_url", "chapters"]):
                raise serializers.ValidationError(
                    "Default posts cannot have image, video, or chapter fields"
                )

        elif current_post_type == "image":
            # Do not allow updating image_url for image posts
            if "image_url" in data:
                raise serializers.ValidationError(
                    "Image cannot be updated for image posts"
                )
            if any(field in data for field in ["video_url", "chapters"]):
                raise serializers.ValidationError(
                    "Image posts cannot have video or chapter fields"
                )

        elif current_post_type == "video":
            # Do not allow updating video_url for video posts
            if "video_url" in data:
                raise serializers.ValidationError(
                    "Video cannot be updated for video posts"
                )
            if any(field in data for field in ["image_url", "chapters"]):
                raise serializers.ValidationError(
                    "Video posts cannot have image or chapter fields"
                )

        elif current_post_type == "novel":
            if any(field in data for field in ["image_url", "video_url"]):
                raise serializers.ValidationError(
                    "Novel posts cannot have image or video fields"
                )

        return data

    def update(self, instance, validated_data):
        # For novel posts, handle chapter updates separately
        if instance.post_type == "novel" and "chapters" in validated_data:
            chapters_data = validated_data.pop("chapters")

            # Delete existing novel posts and create new ones
            NovelPost.objects.filter(post_id=instance).delete()
            for chapter_data in chapters_data:
                NovelPost.objects.create(
                    post_id=instance,
                    chapter=chapter_data["chapter"],
                    content=chapter_data["content"],
                )

        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        if instance.post_type == "novel":
            novel_posts = NovelPost.objects.filter(post_id=instance)
            representation["chapters"] = NovelPostSerializer(
                novel_posts, many=True
            ).data

        return representation


class PostDeleteSerializer(serializers.ModelSerializer):
    confirm = serializers.BooleanField(
        write_only=True,
        required=True,
        help_text="Must be set to True to confirm deletion",
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


class PostListViewSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views.
    Excludes expensive count fields which are now fetched via bulk meta endpoint.
    """

    novel_post = NovelPostSerializer(many=True)
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_artist_types = serializers.SerializerMethodField()
    author_fullname = serializers.SerializerMethodField()
    author_picture = serializers.ImageField(
        source="author.profile_picture", read_only=True
    )
    channel_name = serializers.CharField(source="channel.title", read_only=True)

    class Meta:
        model = Post
        fields = [
            "post_id",
            "description",
            "image_url",
            "video_url",
            "is_deleted",
            "post_type",
            "author",
            "channel",
            "created_at",
            "updated_at",
            "novel_post",
            "author_username",
            "author_artist_types",
            "author_fullname",
            "author_picture",
            "channel_name",
        ]

    def get_author_artist_types(self, obj):
        """Fetch author's artist types"""
        try:
            return obj.author.artist.artist_types
        except Artist.DoesNotExist:
            return []

    def get_author_fullname(self, obj):
        """Fetch author's full name. Return username if author has no provided name"""
        user = obj.author
        parts = [user.first_name or "", user.last_name or ""]
        full_name = " ".join(part.strip() for part in parts if part and part.strip())
        return full_name if full_name else user.username


class PostDetailViewSerializer(PostListViewSerializer):
    """
    Lightweight serializer for detail view.
    Same as PostListViewSerializer - excludes expensive count fields
    which are fetched separately via PostBulkMetaView.
    """
    # Inherits all fields and methods from PostListViewSerializer
    # No additional fields needed - matches list view pattern


class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_picture = serializers.ImageField(
        source="author.profile_picture", read_only=True
    )
    author_artist_types = serializers.SerializerMethodField()
    post_title = serializers.CharField(source="post_id.title", read_only=True)
    critique_author_username = serializers.CharField(
        source="critique_id.author.username", read_only=True, allow_null=True
    )
    critique_author_picture = serializers.ImageField(
        source="critique_id.author.profile_picture", read_only=True, allow_null=True
    )
    critique_author_artist_types = serializers.SerializerMethodField()
    critique_author_id = serializers.IntegerField(
        source="critique_id.author.id", read_only=True, allow_null=True
    )
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

    def get_critique_author_artist_types(self, obj):
        """Fetch author's artist types"""
        try:
            if obj.critique_id:
                return obj.critique_id.author.artist.artist_types
            return []
        except (Artist.DoesNotExist, AttributeError):
            return []


class TopLevelCommentsViewSerializer(CommentSerializer):
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
            "post_title",
            "post_id",
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
            return CommentSerializer(
                obj.prefetched_replies, many=True, context=self.context
            ).data
        return []

    def get_show_replies(self, obj):
        """Show replies is false by default - user must click to expand"""
        # Always return False so replies are collapsed by default
        # The frontend will toggle this when user clicks "View replies"
        return False


class CommentCreateSerializer(ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text", "post_id"]
        extra_kwargs = {
            "post_id": {"required": False},
        }

    def to_representation(self, instance):
        return CommentSerializer(instance, context=self.context).data


class CommentUpdateSerializer(ModelSerializer):
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


class CommentDeleteSerializer(serializers.ModelSerializer):
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


class CommentReplyViewSerializer(CommentSerializer):
    class Meta:
        model = Comment
        fields = [
            "comment_id",
            "text",
            "created_at",
            "updated_at",
            "author_username",
            "author_picture",
            "post_title",
            "post_id",
            "author",
            "replies_to",
        ]


class CommentReplyCreateSerializer(serializers.ModelSerializer):
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
        request = self.context["request"]
        replies_to = data["replies_to"]

        # Auto-set author and post_id from parent comment
        data["post_id"] = replies_to.post_id  # inherit post from parent

        return data

    def to_representation(self, instance):
        return CommentSerializer(instance, context=self.context).data


class CritiqueReplySerializer(CommentSerializer):
    class Meta:
        model = Comment
        fields = [
            "comment_id",
            "text",
            "created_at",
            "updated_at",
            "author_username",
            "author_picture",
            "author_artist_types",
            "post_title",
            "post_id",
            "author",
            "is_critique_reply",
            "critique_id",
        ]

    def get_reply_count(self, obj):
        """Get reply counts (excluding critique replies)"""
        return (
            obj.comment_reply.get_active_objects()
            .filter(is_critique_reply=False)
            .count()
        )


class CritiqueReplyCreateSerializer(ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text", "critique_id"]
        extra_kwargs = {"critique_id": {"required": True, "write_only": True}}

    def validate_critique_id(self, value):
        # Ensure critique exists and is not deleted
        if value.is_deleted:
            raise serializers.ValidationError("Cannot reply to a deleted critique.")
        return value

    def validate(self, data):
        request = self.context["request"]
        critique = data["critique_id"]

        # Auto-set author, post_id from critique, and set as critique reply
        data["author"] = request.user
        data["post_id"] = critique.post_id  # inherit post from critique
        data["is_critique_reply"] = True  # Explicitly set as critique reply
        data["replies_to"] = None  # Ensure no reply chain for critique replies

        return data


class ReplyUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text"]  # Only allow updating the text

    def validate(self, data):
        # Ensure this is actually a reply (defensive check)
        if self.instance and self.instance.replies_to is None:
            raise serializers.ValidationError("This is not a reply comment.")

        # Ensure reply is not deleted
        if self.instance.is_deleted:
            raise serializers.ValidationError("Cannot update a deleted reply")

        return data


class CritiqueReplyUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["text"]  # Only allow updating the text

    def validate(self, data):
        # Ensure this is actually a critique reply (defensive check)
        if self.instance and not self.instance.is_critique_reply:
            raise serializers.ValidationError("This is not a critique reply.")

        # Ensure critique reply is not deleted
        if self.instance.is_deleted:
            raise serializers.ValidationError("Cannot update a deleted critique reply")

        return data


class PostHeartSerializer(ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_fullname = serializers.SerializerMethodField()
    author_picture = serializers.ImageField(
        source="author.profile_picture", read_only=True
    )

    class Meta:
        model = PostHeart
        fields = [
            "id",
            "post_id",
            "author",
            "hearted_at",
            "author_username",
            "author_fullname",
            "author_picture",
        ]
        read_only_fields = ["id", "author", "hearted_at"]

    def get_author_fullname(self, obj):
        """Fetch author's full name. Return username if author has no provided name"""
        user = obj.author
        parts = [user.first_name or "", user.last_name or ""]
        full_name = " ".join(part.strip() for part in parts if part and part.strip())
        return full_name if full_name else user.username


class PostHeartCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostHeart
        fields = ["post_id"]

    def validate(self, data):
        # Auto-set the author to current user
        request = self.context.get("request")
        if request and request.method == "POST":
            data["author"] = request.user

        # Check if user already hearted this post
        if PostHeart.objects.filter(
            post_id=data["post_id"], author=data["author"]
        ).exists():
            raise serializers.ValidationError("You have already hearted this post")

        return data


class CritiqueSerializer(ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_picture = serializers.ImageField(
        source="author.profile_picture", read_only=True
    )
    post_title = serializers.CharField(source="post_id.title", read_only=True)
    author_artist_types = serializers.SerializerMethodField()
    author_fullname = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    is_deleted = serializers.BooleanField(read_only=True)

    class Meta:
        model = Critique
        fields = "__all__"

    def get_author_artist_types(self, obj):
        """Fetch author's artist types"""
        try:
            return obj.author.artist.artist_types
        except Artist.DoesNotExist:
            return []

    def get_author_fullname(self, obj):
        """Fetch author's full name. Return username if author has no provided name"""
        user = obj.author
        parts = [user.first_name or "", user.last_name or ""]
        full_name = " ".join(part.strip() for part in parts if part and part.strip())
        return full_name if full_name else user.username

    def get_reply_count(self, obj):
        """Get reply counts (excluding soft-deleted replies)"""
        if hasattr(obj, "reply_count"):
            return obj.reply_count
        return obj.critique_reply.filter(is_deleted=False).count()


class CritiqueCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Critique
        fields = ["text", "impression", "post_id"]

    def validate_impression(self, value):
        valid_choices = [choice[0] for choice in choices.CRITIQUE_IMPRESSIONS]
        if value not in valid_choices:
            raise serializers.ValidationError("Invalid impression type")
        return value

    def validate(self, data):
        # Auto-set the author to current user
        request = self.context.get("request")
        if request and request.method == "POST":
            data["author"] = request.user

        user = data.get("author")
        post = data.get("post_id")

        # Prevent post author from critiquing their own post
        if post and post.author == user:
            raise serializers.ValidationError(
                "You cannot critique your own post"
            )

        # Check if user already created a critique for this post
        if (
            user and
            Critique.objects.get_active_objects()
            .filter(post_id=post, author=user)
            .exists()
        ):
            raise serializers.ValidationError(
                "You have already created a critique for this post"
            )

        # Check if user has sufficient Brush Drips (1 required)
        if user:
            try:
                wallet = BrushDripWallet.objects.get(user=user)
                if wallet.balance < 1:
                    raise serializers.ValidationError(
                        f"Insufficient Brush Drips. You need 1 Brush Drip to create a critique. "
                        f"Current balance: {wallet.balance}"
                    )
            except BrushDripWallet.DoesNotExist:
                raise serializers.ValidationError("Wallet not found for this user")

        return data

    def to_representation(self, instance):
        return CritiqueSerializer(instance, context=self.context).data


class CritiqueUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Critique
        fields = ["text"]
        extra_kwargs = {"text": {"required": True}}

    def to_representation(self, instance):
        return CritiqueSerializer(instance, context=self.context).data


class CritiqueDeleteSerializer(serializers.ModelSerializer):
    confirm = serializers.BooleanField(
        required=True, write_only=True, help_text="Must be True to confirm deletion"
    )

    class Meta:
        model = Critique
        fields = ["confirm"]

    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("Must confirm deletion")
        return value


class PostPraiseSerializer(ModelSerializer):
    """Serializer for viewing PostPraise with author details"""

    author_username = serializers.CharField(source="author.username", read_only=True)
    author_picture = serializers.ImageField(
        source="author.profile_picture", read_only=True
    )
    author_fullname = serializers.SerializerMethodField()
    post_description = serializers.CharField(
        source="post_id.description", read_only=True
    )

    class Meta:
        model = PostPraise
        fields = [
            "id",
            "post_id",
            "author",
            "praised_at",
            "author_username",
            "author_picture",
            "author_fullname",
            "post_description",
        ]
        read_only_fields = ["id", "author", "praised_at"]

    def get_author_fullname(self, obj):
        """Fetch author's full name. Return username if author has no provided name"""
        user = obj.author
        parts = [user.first_name or "", user.last_name or ""]
        full_name = " ".join(part.strip() for part in parts if part and part.strip())
        return full_name if full_name else user.username


class PostPraiseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating PostPraise - costs 1 Brush Drip"""

    class Meta:
        model = PostPraise
        fields = ["post_id"]

    def validate_post_id(self, value):
        """Validate the post exists"""
        if not value:
            raise serializers.ValidationError("Post is required")
        return value

    def validate(self, data):
        """
        Validate:
        1. User is not praising their own post
        2. User hasn't already praised this post
        3. User has sufficient Brush Drips (1 required)
        """
        request = self.context.get("request")
        if not request:
            raise serializers.ValidationError("Request context is required")

        user = request.user
        post = data["post_id"]

        # Check if praising own post
        if post.author == user:
            raise serializers.ValidationError("You cannot praise your own post")

        # Check if already praised
        if PostPraise.objects.filter(post_id=post, author=user).exists():
            raise serializers.ValidationError("You have already praised this post")

        # Check if user has sufficient Brush Drips
        try:
            wallet = BrushDripWallet.objects.get(user=user)
            if wallet.balance < 1:
                raise serializers.ValidationError(
                    f"Insufficient Brush Drips. You need 1 Brush Drip to praise a post. "
                    f"Current balance: {wallet.balance}"
                )
        except BrushDripWallet.DoesNotExist:
            raise serializers.ValidationError("Wallet not found for this user")

        # Check if post author has a wallet
        try:
            BrushDripWallet.objects.get(user=post.author)
        except BrushDripWallet.DoesNotExist:
            raise serializers.ValidationError("Post author does not have a wallet")

        return data

    def to_representation(self, instance):
        """Return detailed PostPraise info after creation"""
        return PostPraiseSerializer(instance, context=self.context).data


class PostTrophySerializer(ModelSerializer):
    """Serializer for viewing PostTrophy with author and trophy details"""

    author_username = serializers.CharField(source="author.username", read_only=True)
    author_picture = serializers.ImageField(
        source="author.profile_picture", read_only=True
    )
    author_fullname = serializers.SerializerMethodField()
    post_description = serializers.CharField(
        source="post_id.description", read_only=True
    )
    trophy_type_name = serializers.CharField(
        source="post_trophy_type.trophy", read_only=True
    )
    trophy_brush_drip_value = serializers.IntegerField(
        source="post_trophy_type.brush_drip_value", read_only=True
    )

    class Meta:
        model = PostTrophy
        fields = [
            "id",
            "post_id",
            "author",
            "awarded_at",
            "post_trophy_type",
            "author_username",
            "author_picture",
            "author_fullname",
            "post_description",
            "trophy_type_name",
            "trophy_brush_drip_value",
        ]
        read_only_fields = ["id", "author", "awarded_at"]

    def get_author_fullname(self, obj):
        """Fetch author's full name. Return username if author has no provided name"""
        user = obj.author
        parts = [user.first_name or "", user.last_name or ""]
        full_name = " ".join(part.strip() for part in parts if part and part.strip())
        return full_name if full_name else user.username


class PostTrophyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating PostTrophy - costs 5/10/20 Brush Drips based on trophy type"""

    trophy_type = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = PostTrophy
        fields = ["post_id", "trophy_type"]

    def validate_post_id(self, value):
        """Validate the post exists"""
        if not value:
            raise serializers.ValidationError("Post is required")
        return value

    def validate_trophy_type(self, value):
        """Validate trophy type is valid"""
        if value not in TROPHY_BRUSH_DRIP_COSTS:
            raise serializers.ValidationError(
                f"Invalid trophy type. Must be one of: {', '.join(TROPHY_BRUSH_DRIP_COSTS.keys())}"
            )
        return value

    def validate(self, data):
        """
        Validate:
        1. User is not awarding trophy to their own post
        2. User hasn't already awarded this trophy type to this post
        3. User has sufficient Brush Drips
        """
        request = self.context.get("request")
        if not request:
            raise serializers.ValidationError("Request context is required")

        user = request.user
        post = data["post_id"]
        trophy_type = data["trophy_type"]
        required_amount = TROPHY_BRUSH_DRIP_COSTS[trophy_type]

        # Check if awarding trophy to own post
        if post.author == user:
            raise serializers.ValidationError(
                "You cannot award a trophy to your own post"
            )

        # Check if already awarded this trophy type to this post
        try:
            trophy_type_obj = TrophyType.objects.get(trophy=trophy_type)
            if PostTrophy.objects.filter(
                post_id=post, author=user, post_trophy_type=trophy_type_obj
            ).exists():
                raise serializers.ValidationError(
                    f"You have already awarded a {trophy_type.replace('_', ' ').title()} to this post"
                )
        except TrophyType.DoesNotExist:
            raise serializers.ValidationError(
                f"Trophy type '{trophy_type}' not found in database"
            )

        # Check if user has sufficient Brush Drips
        try:
            wallet = BrushDripWallet.objects.get(user=user)
            if wallet.balance < required_amount:
                raise serializers.ValidationError(
                    f"Insufficient Brush Drips. You need {required_amount} Brush Drips to award a "
                    f"{trophy_type.replace('_', ' ').title()}. Current balance: {wallet.balance}"
                )
        except BrushDripWallet.DoesNotExist:
            raise serializers.ValidationError("Wallet not found for this user")

        # Check if post author has a wallet
        try:
            BrushDripWallet.objects.get(user=post.author)
        except BrushDripWallet.DoesNotExist:
            raise serializers.ValidationError("Post author does not have a wallet")

        return data

    def to_representation(self, instance):
        """Return detailed PostTrophy info after creation"""
        return PostTrophySerializer(instance, context=self.context).data
