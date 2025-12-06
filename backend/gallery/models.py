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

    class Meta:
        indexes = [
            models.Index(fields=['creator', 'status', 'created_at'], name='gal_cr_stat_crt_idx'),
            models.Index(fields=['creator', 'is_deleted', 'created_at'], name='gal_cr_del_crt_idx'),
        ]

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
    is_deleted = models.BooleanField(default=False)  # Soft delete

    class Meta:
        indexes = [
            models.Index(fields=['gallery_id', 'author'], name='galleryaward_gal_author_idx'),
            models.Index(fields=['author', 'awarded_at'], name='galleryaward_author_at_idx'),
        ]

    def delete(self, *args, **kwargs):
        """Override delete to perform soft deletion"""
        self.is_deleted = True
        self.save()

class AwardType(models.Model):
    award = models.CharField(max_length=100, choices=choices.GALLERY_AWARD_CHOICES)
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


# Proxy models - import at the end to avoid circular dependencies
# These imports must be after all other models are defined
from post.models import Comment, Critique  # noqa: E402


class GalleryComment(Comment):
    """Proxy model for gallery comments"""
    class Meta:
        proxy = True
        verbose_name = 'Gallery Comment'
        verbose_name_plural = 'Gallery Comments'


class GalleryCritique(Critique):
    """Proxy model for gallery critiques"""
    class Meta:
        proxy = True
        verbose_name = 'Gallery Critique'
        verbose_name_plural = 'Gallery Critiques'


class InactiveGalleryComment(Comment):
    """Proxy model for inactive gallery comments"""
    class Meta:
        proxy = True
        verbose_name = 'Inactive Gallery Comment'
        verbose_name_plural = 'Inactive Gallery Comments'


class InactiveGalleryCritique(Critique):
    """Proxy model for inactive gallery critiques"""
    class Meta:
        proxy = True
        verbose_name = 'Inactive Gallery Critique'
        verbose_name_plural = 'Inactive Gallery Critiques'
