from django.db import models
from account.models import User
from collective.models import Collective
from common.utils import choices
import uuid
    
class Post(models.Model):
    post_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image_url = models.ImageField(upload_to='posts/images/', blank=True, null=True)
    video_url = models.FileField(upload_to='posts/videos/', blank=True, null=True)
    post_type = models.CharField(max_length=100, choices=choices.POST_TYPE_CHOICES)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post')
    collective = models.ForeignKey(Collective, on_delete=models.CASCADE, related_name='post', default='00000000-0000-0000-0000-000000000001') # this id is the default id of first collective 'public'

class NovelPost(models.Model):
    chapter = models.PositiveIntegerField()
    content = models.TextField()
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='novel_post')
    
class PostHeart(models.Model):
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_heart')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_heart')
    hearted_at = models.DateTimeField(auto_now_add=True)
    
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    post_id = models.ForeignKey(Post, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_comment')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_comment')
    
class Critique(models.Model):
    critique_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    impression = models.CharField(max_length=100, choices=choices.CRITIQUE_IMPRESSIONS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    post_id = models.ForeignKey(Post, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_critique')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_critique')
    replying_to = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True)

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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    event_id = models.ForeignKey(Event, on_delete=models.SET_NULL, blank=True, null=True, related_name='event_comment')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='event_comment')
    replying_to = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True)
    
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