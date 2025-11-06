import uuid

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
    video_url = models.FileField(upload_to='posts/videos/', blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    post_type = models.CharField(max_length=100, choices=choices.POST_TYPE_CHOICES)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post')
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='post', default='00000000-0000-0000-0000-000000000001') # this id is the default id of channel of first collective 'public'

    objects = SoftDeleteManager()

    def __str__(self):
        desc = self.description or ""
        desc = desc[:15] + '...' if len(desc) > 15 else desc
        return f'[{self.post_id}] by {self.author} - "{desc}"'

    def delete(self, *_args, **_kwargs):
        """Override delete to perform soft deletion"""
        self.is_deleted = True
        self.save()

class NovelPost(models.Model):
    chapter = models.PositiveIntegerField()
    content = models.TextField()
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='novel_post')

class PostHeart(models.Model):
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_heart')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_heart')
    hearted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.author} hearted {self.post_id}'

class PostPraise(models.Model):
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_praise')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_praise')
    praised_at = models.DateTimeField(auto_now_add=True)

class PostTrophy(models.Model):
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_trophy')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_trophy')
    awarded_at = models.DateTimeField(auto_now_add=True)
    post_trophy_type = models.ForeignKey('TrophyType', on_delete=models.RESTRICT, related_name='post_trophy')

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

    def delete(self, *_args, **_kwargs):
        """Override delete to perform soft deletion"""
        self.is_deleted = True
        self.save()

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

    def __str__(self):
        imp = self.impression or ""
        imp = imp[:15] + '...' if len(imp) > 15 else imp
        return f'[{self.critique_id}] by {self.author} - "{imp}"'

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
