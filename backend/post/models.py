from django.db import models
from account.models import User


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
    author = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    post_type = models.ForeignKey(PostType, on_delete=models.RESTRICT)

class ImagePost(models.Model):
    post_id = models.OneToOneField(Post, primary_key=True, on_delete=models.CASCADE, related_name='image_post')
    image_url = models.ImageField(upload_to='posts/images/')

class VideoPost(models.Model):
    post_id = models.OneToOneField(Post, primary_key=True, on_delete=models.CASCADE, related_name='video_post')
    video_url = models.FileField(upload_to='posts/videos/')

class NovelPost(models.Model):
    chapter = models.PositiveIntegerField(unique=True)
    content = models.TextField()
    post_id = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='novel_post')

class Comment(models.Model):
    comment_id = models.AutoField(primary_key=True)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    author = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)