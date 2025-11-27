"""
Cache utilities for collective-related views.
"""

from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import CollectiveMember


def get_collective_memberships_cache_key(user_id):
    """
    Generate cache key for user's collective memberships.

    Args:
        user_id: User ID

    Returns:
        Cache key string
    """
    return f"collective_memberships:{user_id}"


def invalidate_collective_memberships_cache(user_id):
    """
    Invalidate collective memberships cache for a specific user.

    Args:
        user_id: The ID of the user whose cache to invalidate
    """
    cache.delete(get_collective_memberships_cache_key(user_id))


# Signal handlers to automatically invalidate cache
@receiver(post_save, sender=CollectiveMember)
def invalidate_cache_on_membership_save(sender, instance, **kwargs):
    """Invalidate cache when user joins a collective or role changes."""
    invalidate_collective_memberships_cache(instance.member.id)


@receiver(post_delete, sender=CollectiveMember)
def invalidate_cache_on_membership_delete(sender, instance, **kwargs):
    """Invalidate cache when user leaves a collective."""
    invalidate_collective_memberships_cache(instance.member.id)
