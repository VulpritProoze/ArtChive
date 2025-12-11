"""
Global Top Galleries Ranking Algorithm

This module provides database-level scoring for global top galleries (not personalized).
All calculations are done in SQL using Django annotations for maximum performance.
"""
from datetime import timedelta

from django.core.cache import cache
from django.db.models import (
    Case,
    Count,
    F,
    FloatField,
    Q,
    Value,
    When,
)
from django.utils import timezone

from gallery.models import Gallery

# Scoring weights for global ranking (no personalization)
SCORING_WEIGHTS = {
    'recency': 0.30,  # Higher weight since no personalization
    'engagement': 0.70,  # Higher weight for engagement
}

# Cache TTLs (in seconds)
# CACHE_TTL_TOP_GALLERIES = 3600  # 1 hour
CACHE_TTL_TOP_GALLERIES = 86400  # 1 day


def build_global_top_galleries_queryset(queryset, limit: int = 100):
    """
    Build global top galleries queryset with database-level scoring.
    
    This function uses Django annotations to calculate scores in SQL,
    avoiding expensive Python loops. No personalization - same for all users.

    Args:
        queryset: Base Gallery queryset (already filtered for active galleries)
        limit: Maximum number of galleries to return

    Returns:
        Annotated queryset ordered by global score, limited to top N galleries
    """
    now = timezone.now()
    one_day_ago = now - timedelta(days=1)
    two_days_ago = now - timedelta(days=2)
    one_week_ago = now - timedelta(days=7)

    # 1. RECENCY SCORE (30% weight)
    # Exponential decay: newer galleries get higher scores
    recency_score = Case(
        When(created_at__gte=one_day_ago, then=Value(30.0)),
        When(created_at__gte=two_days_ago, then=Value(15.0)),
        When(created_at__gte=one_week_ago, then=Value(5.0)),
        default=Value(1.0),
        output_field=FloatField()
    )

    # 2. ENGAGEMENT SCORE (70% weight)
    # Awards = 10x/15x/20x (bronze/golden/diamond), Comments = 0.5x
    # Calculate engagement using annotations for performance

    # First, annotate queryset with all counts
    queryset = queryset.annotate(
        # Award counts by type (bronze=10, golden=15, diamond=20)
        bronze_award_count=Count(
            'gallery_award',
            filter=Q(gallery_award__is_deleted=False, gallery_award__gallery_award_type__award='bronze_stroke'),
            distinct=True
        ),
        golden_award_count=Count(
            'gallery_award',
            filter=Q(gallery_award__is_deleted=False, gallery_award__gallery_award_type__award='golden_bristle'),
            distinct=True
        ),
        diamond_award_count=Count(
            'gallery_award',
            filter=Q(gallery_award__is_deleted=False, gallery_award__gallery_award_type__award='diamond_canvas'),
            distinct=True
        ),

        # Comment count (0.5x weight, is_deleted=False, not critique replies)
        comment_count=Count(
            'gallery_comment',
            filter=Q(gallery_comment__is_deleted=False, gallery_comment__is_critique_reply=False),
            distinct=True
        ),
    )

    # Calculate engagement score using annotated values
    engagement_score_raw = (
        (F('bronze_award_count') * 10.0) +  # Bronze awards = 10x
        (F('golden_award_count') * 15.0) +  # Golden awards = 15x
        (F('diamond_award_count') * 20.0) +  # Diamond awards = 20x
        (F('comment_count') * 0.5)  # Comments = 0.5x
    )

    # Annotate raw engagement score first
    queryset = queryset.annotate(engagement_score_raw=engagement_score_raw)

    # Cap engagement score to prevent it from dominating (max 100 points)
    engagement_score_capped = Case(
        When(engagement_score_raw__gt=100, then=Value(100.0)),
        default=F('engagement_score_raw'),
        output_field=FloatField()
    )

    # Apply engagement weight to the capped engagement score
    engagement_score_weighted = engagement_score_capped * SCORING_WEIGHTS['engagement']

    # Calculate total score
    total_score = (
        recency_score * SCORING_WEIGHTS['recency'] +
        engagement_score_weighted
    )

    # Annotate queryset with all scores
    queryset = queryset.annotate(
        recency_score=recency_score,
        engagement_score=engagement_score_capped,
        engagement_score_weighted=engagement_score_weighted,
        global_score=total_score
    ).order_by('-global_score', '-created_at')[:limit]

    return queryset


def generate_top_galleries_cache(limit: int = 100):
    """
    Generate and cache top galleries for all users.
    
    Args:
        limit: Number of top galleries to generate (max 100)
    
    Returns:
        List of gallery data in ranked order
    """
    import hashlib
    import logging

    from django.http import HttpRequest
    from django.utils import timezone

    from .serializers import GalleryListSerializer

    logger = logging.getLogger(__name__)

    # Build cache key
    cache_key = f"global_top_galleries:{limit}"

    # Log cache generation start with timestamp
    generation_timestamp = timezone.now().isoformat()
    logger.info(f'[CACHE GENERATION] Starting top galleries cache generation - Cache Key: {cache_key}, Timestamp: {generation_timestamp}')

    # Build base queryset - only active galleries
    queryset = Gallery.objects.get_active_objects().filter(
        status='active'
    ).select_related(
        'creator',
        'creator__artist',
        'creator__user_wallet',
    ).prefetch_related(
        'gallery_award__gallery_award_type',
    )

    # Apply global ranking algorithm
    ranked_queryset = build_global_top_galleries_queryset(queryset, limit)

    # Serialize galleries
    # Create a mock request for serializer context
    request = HttpRequest()
    request.method = 'GET'

    serializer = GalleryListSerializer(ranked_queryset, many=True, context={'request': request})
    galleries_data = serializer.data

    # Generate unique cache identifier (hash of first gallery ID + timestamp)
    cache_id = None
    if galleries_data:
        first_gallery_id = str(galleries_data[0].get('gallery_id', ''))
        cache_id_hash = hashlib.md5(f"{first_gallery_id}:{generation_timestamp}".encode()).hexdigest()[:8]
        cache_id = f"{cache_key}:{cache_id_hash}"
        logger.info(f'[CACHE GENERATION] Generated {len(galleries_data)} galleries - Cache ID: {cache_id}, First Gallery ID: {first_gallery_id}')
    else:
        logger.warning(f'[CACHE GENERATION] No galleries found for cache key: {cache_key}')

    cache.set(cache_key, galleries_data, CACHE_TTL_TOP_GALLERIES)
    logger.info(f'[CACHE GENERATION] Successfully cached top galleries - Cache Key: {cache_key}, Items: {len(galleries_data)}, Cache ID: {cache_id}')

    # Also cache for limit=100 if we generated more than that (for efficient slicing)
    if limit >= 100 and len(galleries_data) >= 100:
        cache_key_100 = "global_top_galleries:100"
        cache.set(cache_key_100, galleries_data[:100], CACHE_TTL_TOP_GALLERIES)
        logger.info(f'[CACHE GENERATION] Also cached limit=100 slice - Cache Key: {cache_key_100}, Items: 100')

    return galleries_data


def get_cached_top_galleries(limit: int = 100):
    """
    Get cached top galleries.
    
    Args:
        limit: Number of galleries to retrieve (5, 10, 25, 50, 100)
    
    Returns:
        Cached galleries data or None if not cached
    """
    # Validate limit
    valid_limits = [5, 10, 25, 50, 100]
    if limit not in valid_limits:
        limit = 100  # Default to 100

    # Always check cache for limit=100 first (most comprehensive)
    # If smaller limit requested, we can slice from the larger cache
    cache_key_100 = "global_top_galleries:100"
    cached_data = cache.get(cache_key_100)

    if cached_data:
        # Return only the requested number
        return cached_data[:limit]

    # If limit=100 cache not found, try the specific limit cache
    if limit != 100:
        cache_key = f"global_top_galleries:{limit}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data[:limit]

    return None

