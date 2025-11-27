"""
Cache utilities for post-related views.

This module provides caching helpers for optimizing post queries.
Cache keys are invalidated when posts are created, updated, or deleted.
"""

from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Comment, Post, PostHeart, PostPraise, PostTrophy


def get_post_list_cache_key(user_id, page=1, page_size=10):
    """
    Generate cache key for post list view.

    Args:
        user_id: User ID (None for anonymous users)
        page: Page number
        page_size: Number of items per page

    Returns:
        Cache key string
    """
    user_key = f"user_{user_id}" if user_id else "anon"
    return f"post_list:{user_key}:page_{page}:size_{page_size}"


def get_post_list_count_cache_key(user_id):
    """
    Generate cache key for post list count.

    Args:
        user_id: User ID (None for anonymous users)

    Returns:
        Cache key string
    """
    user_key = f"user_{user_id}" if user_id else "anon"
    return f"post_list_count:{user_key}"


def invalidate_post_list_cache():
    """
    Invalidate all post list caches.

    This is called when posts are created, updated, or deleted.
    Uses pattern-based deletion to clear all related cache entries.
    """
    # Clear all post list cache entries
    # Note: This requires django-redis which supports pattern-based deletion
    try:
        cache.delete_pattern("post_list:*")
        cache.delete_pattern("post_list_count:*")
    except AttributeError:
        # Fallback for cache backends that don't support delete_pattern
        cache.clear()


def invalidate_post_cache(post_id):
    """
    Invalidate cache for a specific post.

    Args:
        post_id: The UUID of the post to invalidate
    """
    cache.delete(f"post_detail:{post_id}")
    # Also invalidate the list cache since post details may have changed
    invalidate_post_list_cache()


def _delete_pattern_or_clear(pattern: str):
    """Helper that deletes by pattern when supported, otherwise clears cache."""
    try:
        cache.delete_pattern(pattern)
    except AttributeError:
        cache.clear()


def get_post_praise_count_cache_key(post_id, user_id):
    user_key = f"user_{user_id}" if user_id else "anon"
    return f"post_praise_count:{post_id}:{user_key}"


def get_post_trophy_count_cache_key(post_id, user_id):
    user_key = f"user_{user_id}" if user_id else "anon"
    return f"post_trophy_count:{post_id}:{user_key}"


def invalidate_post_praise_cache(post_id=None):
    pattern = f"post_praise_count:{post_id}:*" if post_id else "post_praise_count:*"
    _delete_pattern_or_clear(pattern)


def invalidate_post_trophy_cache(post_id=None):
    pattern = f"post_trophy_count:{post_id}:*" if post_id else "post_trophy_count:*"
    _delete_pattern_or_clear(pattern)


# Signal handlers to automatically invalidate cache
@receiver(post_save, sender=Post)
def invalidate_cache_on_post_save(sender, instance, created, **kwargs):
    """Invalidate cache when a post is created or updated."""
    invalidate_post_list_cache()
    if not created:
        invalidate_post_cache(instance.post_id)


@receiver(post_delete, sender=Post)
def invalidate_cache_on_post_delete(sender, instance, **kwargs):
    """Invalidate cache when a post is deleted."""
    invalidate_post_list_cache()
    invalidate_post_cache(instance.post_id)


@receiver(post_save, sender=Comment)
def invalidate_cache_on_comment_change(sender, instance, **kwargs):
    """Invalidate cache when a comment is added/updated."""
    # Comments affect post list (comment count), so invalidate
    invalidate_post_list_cache()
    if instance.post_id:
        invalidate_post_cache(instance.post_id.post_id)


@receiver(post_delete, sender=Comment)
def invalidate_cache_on_comment_delete(sender, instance, **kwargs):
    """Invalidate cache when a comment is deleted."""
    invalidate_post_list_cache()
    if instance.post_id:
        invalidate_post_cache(instance.post_id.post_id)


@receiver(post_save, sender=PostHeart)
def invalidate_cache_on_heart_change(sender, instance, **kwargs):
    """Invalidate cache when a heart is added."""
    # Hearts affect post list (heart count), so invalidate
    invalidate_post_list_cache()
    if instance.post_id:
        invalidate_post_cache(instance.post_id.post_id)


@receiver(post_delete, sender=PostHeart)
def invalidate_cache_on_heart_delete(sender, instance, **kwargs):
    """Invalidate cache when a heart is removed."""
    invalidate_post_list_cache()
    if instance.post_id:
        invalidate_post_cache(instance.post_id.post_id)


@receiver(post_save, sender=PostPraise)
@receiver(post_delete, sender=PostPraise)
def invalidate_cache_on_praise_change(sender, instance, **kwargs):
    """Invalidate cached praise counts when praises change."""
    if instance.post_id:
        invalidate_post_praise_cache(instance.post_id.post_id)


@receiver(post_save, sender=PostTrophy)
@receiver(post_delete, sender=PostTrophy)
def invalidate_cache_on_trophy_change(sender, instance, **kwargs):
    """Invalidate cached trophy counts when trophies change."""
    if instance.post_id:
        invalidate_post_trophy_cache(instance.post_id.post_id)
