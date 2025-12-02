import uuid
from collections import deque

from cloudinary_storage.storage import VideoMediaCloudinaryStorage
from django.db import models

from collective.models import Channel, Collective
from common.utils import choices
from core.models import User
from gallery.models import Gallery

from .manager import SoftDeleteManager


class Post(models.Model):
    post_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image_url = models.ImageField(upload_to='posts/images/', blank=True, null=True)
    video_url = models.FileField(upload_to='posts/videos/', blank=True, null=True, storage=VideoMediaCloudinaryStorage())
    is_deleted = models.BooleanField(default=False)
    post_type = models.CharField(
        max_length=100,
        choices=choices.POST_TYPE_CHOICES,
        help_text='Type of post: "default" for standard posts, "novel" for novel chapters (requires NovelPost), "image" for image galleries, "video" for video content.'
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post')
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='post', default='00000000-0000-0000-0000-000000000001') # this id is the default id of channel of first collective 'public'

    objects = SoftDeleteManager()

    class Meta:
        indexes = [
            models.Index(fields=['author_id', 'created_at'], name='post_author_created_idx'),
            models.Index(fields=['channel_id', 'created_at'], name='post_channel_created_idx'),
            models.Index(fields=['post_type', 'created_at'], name='post_type_created_idx'),
            models.Index(fields=['is_deleted', 'created_at'], name='post_deleted_created_idx'),
        ]

    def __str__(self):
        desc = self.description or ""
        desc = desc[:15] + '...' if len(desc) > 15 else desc
        return f'"{desc}" by {self.author}'

    def delete(self, *_args, **_kwargs):
        """Override delete to perform soft deletion"""
        self.is_deleted = True
        self.save()

class NovelPost(models.Model):
    chapter = models.PositiveIntegerField()
    content = models.TextField()
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='novel_post')

    def __str__(self):
        desc = self.post_id.description or ""
        desc = desc[:15] + '...' if len(desc) > 15 else desc
        return f'NovelPost Chapter {self.chapter} of "{desc}"'

class PostHeart(models.Model):
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_heart')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_heart')
    hearted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['author', 'post_id'], name='postheart_author_post_idx'),
            models.Index(fields=['post_id', 'author'], name='postheart_post_author_idx'),
            models.Index(fields=['author', 'hearted_at'], name='postheart_author_at_idx'),
        ]

    def __str__(self):
        return f'{self.author} hearted {self.post_id}'

class PostPraise(models.Model):
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_praise')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_praise')
    praised_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['author', 'post_id'], name='postpraise_author_post_idx'),
            models.Index(fields=['post_id', 'author'], name='postpraise_post_author_idx'),
            models.Index(fields=['author', 'praised_at'], name='postpraise_author_at_idx'),
        ]

class PostTrophy(models.Model):
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_trophy')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_trophy')
    awarded_at = models.DateTimeField(auto_now_add=True)
    post_trophy_type = models.ForeignKey('TrophyType', on_delete=models.RESTRICT, related_name='post_trophy')

    class Meta:
        indexes = [
            models.Index(fields=['author', 'post_id'], name='posttrophy_author_post_idx'),
            models.Index(fields=['post_id', 'author'], name='posttrophy_post_author_idx'),
            models.Index(fields=['author', 'awarded_at'], name='posttrophy_author_at_idx'),
        ]

class TrophyType(models.Model):
    trophy = models.CharField(max_length=100)
    brush_drip_value = models.IntegerField()

class Comment(models.Model):
    comment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    is_deleted = models.BooleanField(default=False)  # Soft delete
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    post_id = models.ForeignKey(Post, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_comment')
    '''
    Critique Id is null by default. Validation will be handled by serializer
    '''
    is_critique_reply = models.BooleanField(default=False)
    critique_id = models.ForeignKey('Critique', on_delete=models.SET_NULL, blank=True, null=True, related_name='critique_reply')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_comment')
    replies_to = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True, null=True, related_name='comment_reply')
    '''
    Gallery comment
    '''
    gallery = models.ForeignKey(Gallery, on_delete=models.SET_NULL, blank=True, null=True, related_name='gallery_comment')

    objects = SoftDeleteManager()

    class Meta:
        indexes = [
            models.Index(fields=['post_id', 'is_deleted', 'created_at'], name='comment_post_del_created_idx'),
            models.Index(fields=['author', 'created_at'], name='comment_author_created_idx'),
            models.Index(fields=['gallery', 'is_deleted', 'created_at'], name='cmt_gal_del_crt_idx'),
            models.Index(fields=['critique_id', 'is_deleted', 'created_at'], name='comment_crit_del_created_idx'),
        ]

    def delete(self, *_args, **_kwargs):
        """Override delete to perform soft deletion and cascade to all replies"""
        # Only process if not already deleted
        if self.is_deleted:
            return

        # Collect all comments to delete (including replies)
        comments_to_delete = []
        queue = deque([self])

        while queue:
            current = queue.popleft()
            if not current.is_deleted:
                comments_to_delete.append(current)
                # Get direct replies that are not deleted
                replies = Comment.objects.get_active_objects().filter(
                    replies_to=current
                )
                queue.extend(replies)

        # Soft delete all comments in the chain
        for comment in comments_to_delete:
            comment.is_deleted = True
            comment.save()

    def __str__(self):
        text = self.text or ""
        text = text[:15] + '...' if len(text) > 15 else text
        return f'"{text}" by {self.author}'

class Critique(models.Model):
    critique_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    is_deleted = models.BooleanField(default=False)  # Soft delete
    impression = models.CharField(max_length=100, choices=choices.CRITIQUE_IMPRESSIONS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    post_id = models.ForeignKey(Post, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_critique')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_critique')

    objects = SoftDeleteManager()

    class Meta:
        indexes = [
            models.Index(fields=['post_id', 'is_deleted', 'created_at'], name='critique_post_del_created_idx'),
            models.Index(fields=['author', 'created_at'], name='critique_author_created_idx'),
        ]

    def __str__(self):
        text = self.text or ""
        text = text[:15] + '...' if len(text) > 15 else text
        return f'"{text}" by {self.author} - {self.impression}'

    def delete(self, *_args, **_kwargs):
        """Override delete to perform soft deletion"""
        self.is_deleted = True
        self.save()

class Event(models.Model):
    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=512)
    description = models.CharField(max_length=4096)
    start = models.DateTimeField()
    end = models.DateTimeField()
    details = models.TextField()
    collective = models.ForeignKey(Collective, on_delete=models.CASCADE, related_name='event', default='00000000-0000-0000-0000-000000000001')

class EventComment(models.Model):
    event_comment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    is_deleted = models.BooleanField(default=False)  # Soft delete
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    event_id = models.ForeignKey(Event, on_delete=models.SET_NULL, blank=True, null=True, related_name='event_comment')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='event_comment')
    replying_to = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True, related_name='event_comment')

class ArtChallenge(models.Model):
    challenge_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=512)
    description = models.CharField(max_length=4096)
    details = models.TextField()
    start = models.DateTimeField()
    end = models.DateTimeField()
    brush_drip_reward = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ArtChallengeParticipant(models.Model):
    challenge_id = models.ForeignKey(ArtChallenge, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)


# Proxy models for inactive objects (for admin separation)
class InactivePost(Post):
    class Meta:
        proxy = True
        verbose_name = "Inactive Post"
        verbose_name_plural = "Inactive Posts"


class InactiveComment(Comment):
    class Meta:
        proxy = True
        verbose_name = "Inactive Comment"
        verbose_name_plural = "Inactive Comments"


class InactiveCritique(Critique):
    class Meta:
        proxy = True
        verbose_name = "Inactive Critique"
        verbose_name_plural = "Inactive Critiques"
