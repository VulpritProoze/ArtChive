import uuid
from django.db import models
from core.models import User
from common.utils import choices
from .manager import AvatarManager

class Avatar(models.Model):
    """
    User avatar model with canvas-based editing support.
    Fixed canvas size: 512x512 pixels
    """
    
    # Constants
    CANVAS_WIDTH = 512
    CANVAS_HEIGHT = 512
    
    # Primary Key
    avatar_id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    # User Relationship (one user can have multiple avatars)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='avatars',
        help_text='Owner of this avatar'
    )
    
    # Avatar Metadata
    name = models.CharField(
        max_length=255,
        default='My Avatar',
        help_text='User-friendly name for the avatar'
    )
    
    description = models.TextField(
        max_length=1000,
        blank=True,
        null=True,
        help_text='Optional description of the avatar'
    )
    
    # Status Management
    status = models.CharField(
        max_length=20,
        default=choices.AVATAR_STATUS.draft,
        choices=choices.AVATAR_STATUS_CHOICES,
        help_text='Current status: draft/active/archived'
    )
    
    is_primary = models.BooleanField(
        default=False,
        help_text='Whether this is the user\'s primary/active avatar'
    )
    
    # Canvas Data (similar to Gallery model)
    canvas_json = models.JSONField(
        null=True,
        blank=True,
        help_text='Stores the avatar canvas state with all objects (512x512)'
    )
    
    # Rendered Outputs
    rendered_image = models.ImageField(
        upload_to='avatar/images/rendered/',
        blank=True,
        null=True,
        help_text='Full size 512x512 rendered avatar image (PNG/WebP)'
    )
    
    thumbnail = models.ImageField(
        upload_to='avatar/images/thumbnails/',
        blank=True,
        null=True,
        help_text='128x128 thumbnail for avatar selection UI'
    )
    
    # Soft Deletion
    is_deleted = models.BooleanField(
        default=False,
        help_text='Soft delete flag'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Custom Manager
    objects = AvatarManager()
    
    class Meta:
        ordering = ['-is_primary', '-updated_at']
        indexes = [
            models.Index(fields=['user', 'is_deleted']),
            models.Index(fields=['user', 'is_primary']),
        ]
        verbose_name = 'Avatar'
        verbose_name_plural = 'Avatars'
    
    def __str__(self):
        primary_indicator = " (Primary)" if self.is_primary else ""
        return f"{self.name} - {self.user.username}{primary_indicator}"
    
    def delete(self, *args, **kwargs):
        """Soft delete implementation"""
        self.is_deleted = True
        self.save()
    
    def save(self, *args, **kwargs):
        """
        Ensure only one primary avatar per user.
        When setting an avatar as primary, unset all others.
        """
        if self.is_primary and self.user:
            # Set all other avatars for this user to non-primary
            Avatar.objects.filter(
                user=self.user, 
                is_primary=True
            ).exclude(
                avatar_id=self.avatar_id
            ).update(is_primary=False)
        super().save(*args, **kwargs)
    
    def get_canvas_dimensions(self):
        """Returns the fixed canvas dimensions"""
        return {
            'width': self.CANVAS_WIDTH,
            'height': self.CANVAS_HEIGHT
        }

class ActiveAvatar(Avatar):
    """Proxy model for viewing only active (non-deleted) avatars in admin"""
    class Meta:
        proxy = True
        verbose_name = 'Active Avatar'
        verbose_name_plural = 'Active Avatars'


class InactiveAvatar(Avatar):
    """Proxy model for viewing only deleted avatars in admin"""
    class Meta:
        proxy = True
        verbose_name = 'Inactive Avatar'
        verbose_name_plural = 'Inactive Avatars'
