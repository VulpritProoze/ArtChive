from django.db import models
from account.models import User
from common.utils import choices

class PostType(models.Model):
    name = models.CharField(max_length=128)
    
    def __str__(self):
        return f'{self.name} - {self.id}'
    
    # py manage.py loaddata common/fixtures/post_types.json
    
class Post(models.Model):
    post_id = models.AutoField(primary_key=True)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image_url = models.ImageField(upload_to='posts/images/', blank=True, null=True)
    video_url = models.FileField(upload_to='posts/videos/', blank=True, null=True)
    post_type = models.CharField(max_length=100, choices=choices.POST_TYPE_CHOICES)
    author = models.ForeignKey(User, on_delete=models.CASCADE)

class NovelPost(models.Model):
    chapter = models.PositiveIntegerField()
    content = models.TextField()
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='novel_post')

class Comment(models.Model):
    comment_id = models.AutoField(primary_key=True)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    author = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)