from django.db.models import Manager


class SoftDeleteManager(Manager):
    """Custom manager for models with soft deletion support"""

    def get_active_objects(self):
        """Fetch all objects that are not soft-deleted (is_deleted=False)"""
        return self.get_queryset().filter(is_deleted=False)

    def get_inactive_objects(self):
        """Fetch all objects that are soft-deleted (is_deleted=True)"""
        return self.get_queryset().filter(is_deleted=True)
