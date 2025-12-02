from django.contrib.auth.models import BaseUserManager
from django.db.models import Manager


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password) # set_password hashes password
        user.save()
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if not extra_fields.get('is_staff'):
            raise ValueError('Superuser must have is_staff=True')

        if not extra_fields.get('is_superuser'):
            raise ValueError('Superuser must have is_superuser=True')

        return self.create_user(email, password, **extra_fields)

    def get_active_users(self):
        return self.get_queryset().filter(is_deleted=False)

    def get_inactive_users(self):
        return self.get_queryset().filter(is_deleted=True)

class SoftDeleteManager(Manager):
    """Custom manager for models with soft deletion support"""

    def get_active_objects(self):
        """Fetch all objects that are not soft-deleted (is_deleted=False)"""
        return self.get_queryset().filter(is_deleted=False)

    def get_inactive_objects(self):
        """Fetch all objects that are soft-deleted (is_deleted=True)"""
        return self.get_queryset().filter(is_deleted=True)
