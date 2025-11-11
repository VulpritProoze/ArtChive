"""
Cache utilities for core/user-related views.
"""

from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Artist, BrushDripWallet, User


def get_user_info_cache_key(user_id):
    """
    Generate cache key for user info.

    Args:
        user_id: User ID

    Returns:
        Cache key string
    """
    return f"user_info:{user_id}"


def invalidate_user_info_cache(user_id):
    """
    Invalidate user info cache for a specific user.

    Args:
        user_id: The ID of the user whose cache to invalidate
    """
    cache.delete(get_user_info_cache_key(user_id))


# Signal handlers to automatically invalidate cache
@receiver(post_save, sender=User)
def invalidate_cache_on_user_save(sender, instance, **kwargs):
    """Invalidate cache when user is updated."""
    invalidate_user_info_cache(instance.id)


@receiver(post_save, sender=Artist)
def invalidate_cache_on_artist_save(sender, instance, **kwargs):
    """Invalidate cache when artist info is updated."""
    invalidate_user_info_cache(instance.user_id.id)


@receiver(post_delete, sender=Artist)
def invalidate_cache_on_artist_delete(sender, instance, **kwargs):
    """Invalidate cache when artist is deleted."""
    invalidate_user_info_cache(instance.user_id.id)


@receiver(post_save, sender=BrushDripWallet)
def invalidate_cache_on_wallet_save(sender, instance, **kwargs):
    """Invalidate cache when wallet balance is updated."""
    invalidate_user_info_cache(instance.user.id)
