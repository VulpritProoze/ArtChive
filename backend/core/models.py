from django.db import models
from django.contrib.auth.models import AbstractUser
from common.utils import choices
from .manager import CustomUserManager

class User(AbstractUser):
    USERNAME_FIELD = 'email'
    email = models.EmailField(unique=True)
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

class UserFellow(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fellow_relationship')
    fellow_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fellow_relationship_as_fellow')
    status = models.CharField(choices=choices.FELLOW_STATUS, default='pending')
    fellowed_at = models.DateTimeField(auto_now_add=True)