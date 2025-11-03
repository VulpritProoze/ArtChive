import uuid

from django.db import models

from common.utils import choices
from core.models import User


class Gallery(models.Model):
    gallery_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=512)
    description = models.CharField(max_length=4096)
    status = models.CharField(choices=choices.COLLECTIVE_STATUS)
    picture = models.ImageField(default='static/images/default_600x400.png')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='galleries')
    
    # Gallery configuration
    max_slots = models.IntegerField(default=12)  # Maximum items in gallery
    allow_free_positioning = models.BooleanField(default=True)  # Hybrid: can use slots or free position

    def __str__(self):
        return f"{self.title}, owned by {self.creator.username}"

    def delete(self, *args, **kwargs):
        self.is_deleted = True
        self.save()


class GalleryItemCategory(models.Model):
    """Categories for gallery items (Artwork, Medal, Trophy, etc.)"""
    category_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, help_text="Icon identifier for frontend")
    description = models.TextField(blank=True)
    
    class Meta:
        verbose_name_plural = "Gallery Item Categories"
    
    def __str__(self):
        return self.name


class GalleryItem(models.Model):
    """Individual items that can be placed in gallery - both user uploads and auto-generated achievements"""
    VISIBILITY_CHOICES = [
        ('public', 'Public'),
        ('private', 'Private'),
        ('unlisted', 'Unlisted'),
    ]
    
    item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gallery_items')
    category = models.ForeignKey(GalleryItemCategory, on_delete=models.PROTECT, related_name='items')
    
    # Item data
    title = models.CharField(max_length=255)
    image_url = models.ImageField(upload_to='gallery/items/')
    description = models.TextField(blank=True)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='public')
    
    # Achievement-specific fields (nullable for regular artwork items)
    is_achievement = models.BooleanField(default=False)
    achievement_type = models.CharField(max_length=100, null=True, blank=True, 
                                       help_text="e.g., 'first_post', 'top_artist', 'trophy_collector'")
    achievement_date = models.DateTimeField(null=True, blank=True)
    achievement_metadata = models.JSONField(null=True, blank=True, 
                                           help_text="Additional achievement data")
    
    # Link to related objects (if achievement is based on something)
    related_post = models.ForeignKey('posts.Post', on_delete=models.SET_NULL, null=True, blank=True)
    related_trophy = models.ForeignKey('posts.PostTrophy', on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    is_featured = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        achievement_tag = " [Achievement]" if self.is_achievement else ""
        return f"{self.title} - {self.owner.username}{achievement_tag}"


class GalleryLayout(models.Model):
    """Stores the position and arrangement of items in a gallery - Dota 2 style"""
    layout_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gallery = models.ForeignKey(Gallery, on_delete=models.CASCADE, related_name='layout_items')
    item = models.ForeignKey(GalleryItem, on_delete=models.CASCADE, related_name='placements')
    
    # Hybrid positioning system
    slot_number = models.IntegerField(null=True, blank=True, 
                                     help_text="Slot-based position (1-12), null for free positioning")
    
    # Free-form positioning (pixel-based or grid-based)
    position_x = models.IntegerField(default=0, help_text="X coordinate in pixels or grid units")
    position_y = models.IntegerField(default=0, help_text="Y coordinate in pixels or grid units")
    width = models.IntegerField(default=200, help_text="Width in pixels")
    height = models.IntegerField(default=200, help_text="Height in pixels")
    
    # Visual properties
    z_index = models.IntegerField(default=0, help_text="Layer order for overlapping items")
    rotation = models.FloatField(default=0, help_text="Rotation in degrees")
    scale = models.FloatField(default=1.0, help_text="Scale factor")
    opacity = models.FloatField(default=1.0, help_text="Opacity (0-1)")
    
    # Additional styling
    border_color = models.CharField(max_length=7, default='#000000', help_text="Hex color code")
    border_width = models.IntegerField(default=0, help_text="Border width in pixels")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['z_index', 'slot_number']
    
    def __str__(self):
        slot_info = f"Slot {self.slot_number}" if self.slot_number else f"Free ({self.position_x}, {self.position_y})"
        return f"{self.gallery.title} - {self.item.title} at {slot_info}"


# Keep existing models for compatibility
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