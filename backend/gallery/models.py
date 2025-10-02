from django.db import models
from common.utils import choices
from core.models import User
import uuid

class Gallery(models.Model):
    gallery_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=512)
    description = models.CharField(max_length=4096)
    status = models.CharField(choices=choices.COLLECTIVE_STATUS)
    picture = models.ImageField(default='static/images/default_600x400.png')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
class GalleryItem(models.Model):
    item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_url = models.ImageField(default='static/images/default_600x400.png')
    description = models.TextField()

# Heart reactions on a gallery item
class ItemHeart(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    item = models.ForeignKey('GalleryItem', on_delete=models.CASCADE)

class ItemFeedback(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    item = models.ForeignKey('GalleryItem', on_delete=models.CASCADE)
    feedback = models.CharField(max_length=500)

class GalleryComment(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    is_reply_to_item = models.BooleanField()    # if true, replies_to_item must not be null
    replies_to_item = models.ForeignKey('ItemFeedback', on_delete=models.SET_NULL, blank=True, null=True)   # reply to itemfeedback
    replies_to_gallery = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True) # reply to a gallerycomment
    
class GalleryAward(models.Model):
    gallery_id = models.ForeignKey(Gallery, on_delete=models.CASCADE, related_name='gallery_award')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gallery_award')
    awarded_at = models.DateTimeField(auto_now_add=True)
    gallery_award_type = models.ForeignKey('AwardType', on_delete=models.RESTRICT, related_name='gallery_award')
    
class AwardType(models.Model):
    award = models.CharField(max_length=100)
    brush_drip_value = models.IntegerField()