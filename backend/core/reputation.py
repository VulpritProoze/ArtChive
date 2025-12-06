"""
Reputation system utility functions.
Handles reputation updates and history tracking.
"""

import logging
from django.db import transaction
from django.db.models import F
from django.core.cache import cache

from core.models import User, ReputationHistory

logger = logging.getLogger(__name__)

# Cache key for leaderboard invalidation
LEADERBOARD_CACHE_KEY = 'reputation_leaderboard:top_100'
LEADERBOARD_CACHE_TTL = 300  # 5 minutes


def get_reputation_amount_for_praise():
    """Get reputation amount for praise (+1)."""
    return 1


def get_reputation_amount_for_trophy_or_award(trophy_type: str):
    """
    Get reputation amount for trophy or gallery award.
    Returns 5, 10, or 20 based on trophy type.
    """
    from common.utils.choices import TROPHY_BRUSH_DRIP_COSTS
    return TROPHY_BRUSH_DRIP_COSTS.get(trophy_type, 0)


def get_reputation_amount_for_critique(impression: str):
    """
    Get reputation amount for critique based on impression.
    Returns +3 for positive, -3 for negative, 0 for neutral.
    """
    if impression == 'positive':
        return 3
    elif impression == 'negative':
        return -3
    else:  # neutral
        return 0


def get_recipient_for_critique(critique):
    """
    Get the recipient user for a critique (post author or gallery creator).
    Returns the User object.
    """
    if critique.post_id:
        return critique.post_id.author
    elif hasattr(critique, 'gallery_id') and critique.gallery_id:
        return critique.gallery_id.creator
    return None


@transaction.atomic
def update_reputation(
    user,
    amount: int,
    source_type: str,
    source_id: str,
    source_object_type: str = None,
    description: str = None
):
    """
    Update user reputation and create history record.
    
    Args:
        user: User instance to update
        amount: Reputation change amount (positive or negative)
        source_type: Type of source ('praise', 'trophy', 'critique', 'gallery_award')
        source_id: ID of the source object
        source_object_type: Optional type of object ('post', 'gallery')
        description: Optional human-readable description
    
    Returns:
        Updated reputation value
    """
    # Lock user row to prevent race conditions
    user = User.objects.select_for_update().get(pk=user.pk)
    
    # Update reputation atomically
    User.objects.filter(pk=user.pk).update(
        reputation=F('reputation') + amount
    )
    
    # Refresh user to get updated reputation
    user.refresh_from_db()
    
    # Create history record
    ReputationHistory.objects.create(
        user=user,
        amount=amount,
        source_type=source_type,
        source_id=source_id,
        source_object_type=source_object_type,
        description=description
    )
    
    # Invalidate leaderboard cache
    cache.delete(LEADERBOARD_CACHE_KEY)
    
    logger.info(
        f'Updated reputation for user {user.id} ({user.username}): '
        f'{amount:+d} (new total: {user.reputation}) from {source_type}'
    )
    
    return user.reputation


def get_user_reputation_history(user, limit=50, offset=0):
    """
    Get reputation history for a user.
    
    Args:
        user: User instance
        limit: Number of records to return
        offset: Pagination offset
    
    Returns:
        QuerySet of ReputationHistory records
    """
    return ReputationHistory.objects.filter(
        user=user
    ).order_by('-created_at')[offset:offset + limit]


