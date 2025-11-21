import uuid

from django.db import models

from common.utils import choices
from core.models import User
from gallery.manager import GalleryManager


class Gallery(models.Model):
    gallery_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=512)
    description = models.CharField(max_length=4096)
    status = models.CharField(default=choices.GALLERY_STATUS.draft, choices=choices.GALLERY_STATUS_CHOICES)
    picture = models.ImageField(default='static/images/default_600x400.png', upload_to='gallery/pictures/', blank=True)
    canvas_json = models.JSONField(null=True, blank=True)
    canvas_width = models.IntegerField(default=1920)
    canvas_height = models.IntegerField(default=1080)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE)

    objects = GalleryManager()

    def __str__(self):
        return f"{self.title}, owned by {self.creator.username}"

    def delete(self, *args, **kwargs):
        self.is_deleted = True
        self.save()

    # need to add a softdeletemanager soon, and create active_objects and inactive_objects method

class GalleryAward(models.Model):
    gallery_id = models.ForeignKey(Gallery, on_delete=models.CASCADE, related_name='gallery_award')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gallery_award')
    awarded_at = models.DateTimeField(auto_now_add=True)
    gallery_award_type = models.ForeignKey('AwardType', on_delete=models.RESTRICT, related_name='gallery_award')

class AwardType(models.Model):
    award = models.CharField(max_length=100)
    brush_drip_value = models.IntegerField()


class ActiveGallery(Gallery):
    class Meta:
        proxy = True
        verbose_name = 'Gallery'
        verbose_name_plural = 'Galleries'


class InactiveGallery(Gallery):
    class Meta:
        proxy = True
        verbose_name = 'Inactive Gallery'
        verbose_name_plural = 'Inactive Galleries'
