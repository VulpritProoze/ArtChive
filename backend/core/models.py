import uuid

from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField
from django.db import models

from common.utils import choices
from common.utils.choices import TRANSACTION_OBJECT_CHOICES

from .manager import CustomUserManager


class User(AbstractUser):
    USERNAME_FIELD = 'email'

    # Change the username field to be 'email'
    email = models.EmailField(unique=True)
    REQUIRED_FIELDS = []

    # Custom fields
    first_name = models.CharField(max_length=255, blank=True, null=True)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, default='N/A', blank=True)
    country = models.CharField(max_length=100, default='N/A', blank=True)
    contact_no = models.CharField(max_length=20, default='N/A',blank=True)
    birthday = models.DateField(blank=True, null=True, help_text='Enter user\'s date of birth')
    is_deleted = models.BooleanField(default=False, help_text='Designates whether this user should be treated as deleted. Unselect this instead of deleting accounts.')

    # profile
    profile_picture = models.ImageField(default='static/images/default-pic-min.jpg', upload_to='profile/')

    objects = CustomUserManager()

    def __str__(self):
        return self.email

    # Soft deletion
    def delete(self, *args, **kwargs):
        """Soft delete user and cascade soft delete to directly related models"""
        self.is_deleted = True
        self.save()

        # Soft delete directly related models
        # Post - soft delete all posts by this user
        # These imports are here to avoid circular imports
        from post.models import Post
        Post.objects.filter(author=self).update(is_deleted=True)

        # Gallery - soft delete all galleries created by this user
        from gallery.models import Gallery
        Gallery.objects.filter(creator=self).update(is_deleted=True)

        # Artist - soft delete artist profile if exists
        if hasattr(self, 'artist'):
            self.artist.is_deleted = True
            self.artist.save()

        # BrushDripWallet - soft delete wallet if exists
        if hasattr(self, 'user_wallet'):
            self.user_wallet.is_deleted = True
            self.user_wallet.save()

        # UserFellow - soft delete all relationships where user is involved
        UserFellow.objects.filter(user=self).update(is_deleted=True)
        UserFellow.objects.filter(fellow_user=self).update(is_deleted=True)


class InactiveUser(User):
    class Meta:
        proxy = True
        verbose_name = "Inactive User"
        verbose_name_plural = "Inactive Users"

class UserFellow(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fellow_relationship')
    fellow_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fellow_relationship_as_fellow')
    status = models.CharField(choices=choices.FELLOW_STATUS, default='pending')
    fellowed_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False, help_text='Designates whether this relationship should be treated as deleted.')

    def delete(self, *args, **kwargs):
        """Override delete to perform soft deletion"""
        self.is_deleted = True
        self.save()

class Artist(models.Model):
    user_id = models.OneToOneField(User, primary_key=True, on_delete=models.CASCADE, related_name='artist')
    artist_types = ArrayField(models.CharField(max_length=50), default=list, blank=True, help_text='Select artist types (e.g. visual arts, literary arts, etc.)')
    is_deleted = models.BooleanField(default=False, help_text='Designates whether this artist profile should be treated as deleted.')

    def __str__(self):
        return f"Artist profile for {self.user_id.username}"

    def delete(self, *args, **kwargs):
        """Override delete to perform soft deletion"""
        self.is_deleted = True
        self.save()

class BrushDripWallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_wallet')
    balance = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False, help_text='Designates whether this wallet should be treated as deleted.')

    def __str__(self):
        return f"{self.user.username}'s wallet. Balance: {self.balance}"

    def delete(self, *args, **kwargs):
        """Override delete to perform soft deletion"""
        self.is_deleted = True
        self.save()

class BrushDripTransaction(models.Model):
    drip_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    amount = models.IntegerField(default=0)
    transaction_object_type = models.CharField(choices=TRANSACTION_OBJECT_CHOICES, max_length=500)  # Object type e.g. if transaction made by "praising", then "praise". We know it's a transaction connect to Praise object
    transaction_object_id = models.CharField(max_length=2000)   # Object's ID
    transacted_at = models.DateTimeField(auto_now_add=True)
    transacted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='brushdrip_transacted_by')
    transacted_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='brushdrip_transacted_to')

    class Meta:
        indexes = [
            models.Index(fields=['transacted_by']),
            models.Index(fields=['transacted_to']),
            models.Index(fields=['transaction_object_type', 'transaction_object_id']),
        ]

    def __str__(self):
        return f"{self.transacted_by} sent {self.amount} to {self.transacted_to}. {self.transaction_object_type}"
