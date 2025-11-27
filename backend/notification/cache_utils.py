"""
Cache utilities for notification views.
"""

from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Notification


def get_notification_cache_key(user_id):
    """
    Generate cache key for notification.

    Args:
        user_id: User ID

    Returns:
        Cache key string
    """
    return f"notification:{user_id}"

def invalidate_notification_list_cache():
    '''
    Invalidate all notification cache
    '''
    try:
        cache.delete_pattern('notification:*')
    except AttributeError:
        cache.clear()

def invalidate_notification_cache(user_id):
    """
    Invalidate notification cache for a specific user.

    Args:
        user_id: The ID of the user whose cache to invalidate
    """
    cache.delete(get_notification_cache_key(user_id))

# Signal handlers to automatically invalidate cache on save
@receiver(post_save, sender=Notification)
def invalidate_cache_on_notification_save(sender, instance, created, **kwargs):
    '''
    Invalidate notification cache on notification save/update.
    Includes actions such as marking notification as read.
    '''
    invalidate_notification_cache(instance.notified_to)

@receiver(post_delete, sender=Notification)
def invalidate_cache_on_notification_delete(sender, instance, **kwargs):
    '''
    Invalidate notification cache on notification delete.
    '''
    invalidate_notification_cache(instance.notified_to)
