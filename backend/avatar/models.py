import uuid

from django.db import models

from core.models import User


class Avatar(models.Model):
    avatar_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_url = models.ImageField(upload_to='avatar/')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
