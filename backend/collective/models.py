from django.db import models
from account.models import User
import uuid

class Collective(models.Model):
    collective_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=256)

class CollectiveMember(models.Model):
    collective_id = models.ForeignKey(Collective, on_delete=models.CASCADE, related_name='collective_member')
    member = models.ForeignKey(User, on_delete=models.CASCADE, related_name='collective_member')

class Channel(models.Model):
    channel_id =  models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=256)