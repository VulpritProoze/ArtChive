"""
User presence tracking using Redis.
Tracks which users are currently online/active.
"""


from django.core.cache import cache
from django.utils import timezone

# Cache TTLs
PRESENCE_TTL = 60  # 60 seconds - user is considered active if seen within this time
PRESENCE_UPDATE_INTERVAL = 30  # Update presence every 30 seconds


def mark_user_active(user_id: int):
    """Mark a user as active in Redis."""
    cache_key = f"user_presence:{user_id}"
    timestamp = timezone.now().isoformat()
    result = cache.set(cache_key, timestamp, PRESENCE_TTL)

    # Debug: Verify cache operation
    if result is False:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f'Failed to set cache for user {user_id} - cache.set returned False')
    else:
        # Verify it was actually stored
        stored_value = cache.get(cache_key)
        if stored_value is None:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Cache set succeeded but get returned None for user {user_id}')
        else:
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f'Successfully cached presence for user {user_id}: {stored_value}')


def is_user_active(user_id: int) -> bool:
    """Check if a user is currently active."""
    cache_key = f"user_presence:{user_id}"
    return cache.get(cache_key) is not None


def get_user_last_activity(user_id: int):
    """Get user's last activity timestamp."""
    cache_key = f"user_presence:{user_id}"
    timestamp_str = cache.get(cache_key)
    if timestamp_str:
        from datetime import datetime
        return datetime.fromisoformat(timestamp_str)
    return None


def mark_user_inactive(user_id: int):
    """Mark a user as inactive (remove from active set)."""
    cache_key = f"user_presence:{user_id}"
    cache.delete(cache_key)

