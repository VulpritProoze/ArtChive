from django.db import models

class AvatarManager(models.Manager):
    """Custom manager for Avatar model with common queries"""

    def active(self):
        """Get non-deleted avatars"""
        return self.filter(is_deleted=False)

    def inactive(self):
        """Get deleted avatars"""
        return self.filter(is_deleted=True)

    def for_user(self, user):
        """Get all active avatars for a specific user"""
        return self.active().filter(user=user)

    def primary_for_user(self, user):
        """Get the primary avatar for a user"""
        return self.active().filter(user=user, is_primary=True).first()

    def by_status(self, status):
        """Get avatars by status (draft/active/archived)"""
        return self.active().filter(status=status)
