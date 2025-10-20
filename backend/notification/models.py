import uuid

from django.db import models

from common.utils.choices import NOTIFICATION_OBJECT_CHOICES
from core.models import User


class Notification(models.Model):
    notification_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.TextField()
    # Notification Object Type is to track which table
    # the notification is intended to be for
    notification_object_type = models.CharField(choices=NOTIFICATION_OBJECT_CHOICES, max_length=500)
    notification_object_id = models.CharField(max_length=2000)
    is_read = models.BooleanField(default=False)
    notified_at = models.DateTimeField(auto_now_add=True)
    notified_to = models.ForeignKey(User, on_delete=models.CASCADE)

class NotificationNotifier(models.Model):
    notification_id = models.ForeignKey(Notification, on_delete=models.CASCADE)
    notified_by = models.ForeignKey(User, on_delete=models.CASCADE)
