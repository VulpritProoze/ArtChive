from django.db import models
from django.contrib.postgres.fields import ArrayField
from core.models import User
from common.utils.choices import FACEBOOK_RULES, COLLECTIVE_STATUS
import uuid

class Collective(models.Model):
    def default_rules():
        return FACEBOOK_RULES.copy()
    
    collective_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=4096)
    status = models.CharField(max_length=100, choices=COLLECTIVE_STATUS)
    rules = ArrayField(models.CharField(max_length=100), blank=True, default=default_rules)
    artist_types = ArrayField(models.CharField(max_length=50), default=list, blank=True, help_text='Select artist types (e.g. visual arts, literary arts, etc.)')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
class CollectiveMember(models.Model):
    collective_id = models.ForeignKey(Collective, on_delete=models.CASCADE, related_name='collective_member')
    member = models.ForeignKey(User, on_delete=models.CASCADE, related_name='collective_member')
    
class Channel(models.Model):
    channel_id =  models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=512)
    description = models.CharField(max_length=4096)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    collective = models.ForeignKey(Collective, on_delete=models.CASCADE, related_name='collective_channel')