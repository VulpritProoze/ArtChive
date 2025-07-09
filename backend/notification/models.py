from django.db import models
from account.models import User
import uuid

class Notification(models.Model):
    notification_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.TextField()
    related_table_id = models.IntegerField(null=True, blank=True)   # for building url that navigates to notif
    is_read = models.BooleanField(default=False)
    notified_at = models.DateTimeField(auto_now_add=True)
    notified_to = models.ForeignKey(User, on_delete=models.CASCADE)
    has_notifiers = models.BooleanField(default=False) # if true, notificationnotifiers must be related
    
class NotificationNotifier(models.Model):
    notification_id = models.ForeignKey(Notification, on_delete=models.CASCADE)
    notified_by = models.ForeignKey(User, on_delete=models.CASCADE)