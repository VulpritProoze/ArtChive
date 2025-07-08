from django.db import models
from account.models import User
from collective.models import Collective
from common.utils import choices
import uuid
    
class Post(models.Model):
    post_id = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image_url = models.ImageField(upload_to='posts/images/', blank=True, null=True)
    video_url = models.FileField(upload_to='posts/videos/', blank=True, null=True)
    post_type = models.CharField(max_length=100, choices=choices.POST_TYPE_CHOICES)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post')
    collective = models.ForeignKey(Collective, on_delete=models.CASCADE, related_name='post', default='00000000-0000-0000-0000-000000000001')

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
    post_trophy_type = models.CharField(max_length=100, choices=choices.POST_TROPHY_CHOICES)
    praised_at = models.DateTimeField(auto_now_add=True)


class Comment(models.Model):
    comment_id = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    post_id = models.ForeignKey(Post, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_comment')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_comment')
    
class Critique(models.Model):
    critique_id = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    impression = models.CharField(max_length=100, choices=choices.CRITIQUE_IMPRESSIONS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    post_id = models.ForeignKey(Post, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_critique')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='post_critique')
