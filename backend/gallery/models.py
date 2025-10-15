from django.db import models
from common.utils import choices
from core.models import User
import uuid

class Gallery(models.Model):
    """
    A gallery is a collection/portfolio of artworks.
    Think of it like an album or project showcase.
    
    Example: "My Best Work 2025", "Landscape Photography", "Client Projects"
    """
    gallery_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=512)
    description = models.CharField(max_length=4096)
    status = models.CharField(choices=choices.COLLECTIVE_STATUS)  # public/private/archive
    picture = models.ImageField(default='static/images/default_600x400.png')  # Cover image
    
    # Layout configuration - how items are displayed
    layout_template = models.CharField(
        max_length=50, 
        default='classic_grid',
        choices=[
            ('classic_grid', 'Classic Grid'),
            ('masonry', 'Masonry'),
            ('carousel', 'Carousel'),
            ('feature_grid', 'Feature + Grid'),
            ('list_view', 'List View'),
        ]
    )
    
    # Ownership and metadata
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='galleries')
    view_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} by {self.owner.username}"
    
    class Meta:
        ordering = ['-created_at']  # Newest first
        verbose_name_plural = 'Galleries'


class GalleryItem(models.Model):
    """
    A single artwork/image that can be added to galleries.
    Think of it like a photo in your camera roll.
    
    Can exist independently and be added to multiple galleries.
    """
    item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    image_url = models.ImageField(upload_to='gallery/items/')
    description = models.TextField()
    
    # Who created/owns this artwork
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gallery_items')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} by {self.creator.username}"
    
    class Meta:
        ordering = ['-created_at']


class GalleryItemAssignment(models.Model):
    """
    Connects a GalleryItem to a Gallery with ordering.
    This is the "through" model that enables:
    - One artwork in multiple galleries
    - Custom ordering per gallery
    - Metadata about when item was added
    
    Example: 
    "Sunset Painting" appears in position 0 of "Portfolio 2025"
    Same "Sunset Painting" appears in position 5 of "Landscapes"
    """
    gallery = models.ForeignKey(Gallery, on_delete=models.CASCADE, related_name='item_assignments')
    gallery_item = models.ForeignKey(GalleryItem, on_delete=models.CASCADE, related_name='gallery_assignments')
    
    # Position in the gallery (0-indexed, lower = earlier)
    position = models.IntegerField(default=0)
    
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('gallery', 'gallery_item')  # Can't add same item twice to same gallery
        ordering = ['position']  # Always retrieve in correct order
    
    def __str__(self):
        return f"{self.gallery_item.title} in {self.gallery.title} (pos: {self.position})"


class ItemHeart(models.Model):
    """
    Heart/like reactions on individual artworks.
    Similar to Instagram likes on photos.
    """
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='item_hearts')
    item = models.ForeignKey(GalleryItem, on_delete=models.CASCADE, related_name='hearts')
    hearted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('author', 'item')  # One user can only heart once
    
    def __str__(self):
        return f"{self.author.username} ♥ {self.item.title}"


class ItemFeedback(models.Model):
    """
    Short feedback/comments on artworks.
    Max 500 characters - think Twitter-style quick reactions.
    """
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='item_feedbacks')
    item = models.ForeignKey(GalleryItem, on_delete=models.CASCADE, related_name='feedbacks')
    feedback = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Feedback by {self.author.username} on {self.item.title}"
    
    class Meta:
        ordering = ['-created_at']


class GalleryComment(models.Model):
    """
    Full comments on the entire gallery (not individual items).
    Think of YouTube comments on a video playlist.
    
    Supports nested replies (comment → reply → reply).
    """
    comment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gallery_comments')
    gallery = models.ForeignKey(Gallery, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField()
    
    # Soft delete (hide but keep data)
    is_deleted = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # For nested replies - points to parent comment
    replies_to = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        blank=True, 
        null=True, 
        related_name='replies'
    )
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.gallery.title}"
    
    class Meta:
        ordering = ['-created_at']


class GalleryAward(models.Model):
    """
    Awards given to galleries using Brush Drips (like Reddit awards).
    Costs Brush Drips, goes to gallery owner.
    """
    gallery = models.ForeignKey(Gallery, on_delete=models.CASCADE, related_name='awards')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gallery_awards_given')
    awarded_at = models.DateTimeField(auto_now_add=True)
    gallery_award_type = models.ForeignKey('AwardType', on_delete=models.RESTRICT, related_name='awards')
    
    class Meta:
        unique_together = ('gallery', 'author', 'gallery_award_type')
        # Can't give same award type twice to same gallery
    
    def __str__(self):
        return f"{self.gallery_award_type.award} → {self.gallery.title} by {self.author.username}"


class AwardType(models.Model):
    """
    Types of awards that can be given.
    Already defined in fixtures: apprentice_brush, impressionist_ink, etc.
    """
    award = models.CharField(max_length=100, unique=True)
    brush_drip_value = models.IntegerField()  # Cost in Brush Drips
    
    def __str__(self):
        return f"{self.award} ({self.brush_drip_value} drips)"