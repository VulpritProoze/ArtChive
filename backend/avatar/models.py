from django.db import models
from account.models import User
import uuid

class Avatar(models.Model):
    avatar_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_url = models.ImageField(upload_to='avatar/')
    user = models.ForeignKey(User, on_delete=models.CASCADE)