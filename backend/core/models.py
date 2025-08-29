from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField
from common.utils import choices
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

    # profile
    profile_picture = models.ImageField(default='profile/images/default-pic-min.jpg', upload_to='profile/images/')

    objects = CustomUserManager()

    def __str__(self):
        return self.email

class UserFellow(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fellow_relationship')
    fellow_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fellow_relationship_as_fellow')
    status = models.CharField(choices=choices.FELLOW_STATUS, default='pending')
    fellowed_at = models.DateTimeField(auto_now_add=True)

class Artist(models.Model):
    user_id = models.OneToOneField(User, primary_key=True, on_delete=models.CASCADE, related_name='artist')
    artist_types = ArrayField(models.CharField(max_length=50), default=list, blank=True, help_text='Select artist types (e.g. visual arts, literary arts, etc.)')

    def __str__(self):
        return f"Artist profile for {self.user.username}"