"""
Global Top Posts Ranking Algorithm

This module provides database-level scoring for global top posts (not personalized).
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

from post.models import Post

# Scoring weights for global ranking (no personalization)
SCORING_WEIGHTS = {
    'recency': 0.30,  # Higher weight since no personalization
    'engagement': 0.70,  # Higher weight for engagement
}

# Cache TTLs (in seconds)
CACHE_TTL_TOP_POSTS = 3600  # 1 hour


def build_global_top_posts_queryset(queryset, limit: int = 100, post_type: str = None):
    """
    Build global top posts queryset with database-level scoring.
    
    This function uses Django annotations to calculate scores in SQL,
    avoiding expensive Python loops. No personalization - same for all users.

    Args:
        queryset: Base Post queryset (already filtered for active posts)
        limit: Maximum number of posts to return
        post_type: Optional post type filter ('default', 'novel', 'image', 'video')

    Returns:
        Annotated queryset ordered by global score, limited to top N posts
    """
    # Filter by post type if provided
    if post_type:
        from common.utils.choices import POST_TYPE_CHOICES
        valid_types = [choice[0] for choice in POST_TYPE_CHOICES]
        if post_type in valid_types:
            queryset = queryset.filter(post_type=post_type)
    now = timezone.now()
    one_day_ago = now - timedelta(days=1)
    two_days_ago = now - timedelta(days=2)
    one_week_ago = now - timedelta(days=7)

    # 1. RECENCY SCORE (30% weight)
    # Exponential decay: newer posts get higher scores
    recency_score = Case(
        When(created_at__gte=one_day_ago, then=Value(30.0)),
        When(created_at__gte=two_days_ago, then=Value(15.0)),
        When(created_at__gte=one_week_ago, then=Value(5.0)),
        default=Value(1.0),
        output_field=FloatField()
    )

    # 2. ENGAGEMENT SCORE (70% weight)
    # Hearts = 1x, Praise = 3.5x, Trophies = 10x+, Critiques = varies, Comments = 0.5x
    # Calculate engagement using annotations for performance

    # First, annotate queryset with all counts
    queryset = queryset.annotate(
        # Hearts count (1x weight)
        hearts_count=Count('post_heart', distinct=True),

        # Praise count (3.5x weight)
        praise_count=Count('post_praise', distinct=True),

        # Trophy counts by type (bronze=10, golden=15, diamond=20)
        bronze_trophy_count=Count(
            'post_trophy',
            filter=Q(post_trophy__post_trophy_type__trophy='bronze_stroke'),
            distinct=True
        ),
        golden_trophy_count=Count(
            'post_trophy',
            filter=Q(post_trophy__post_trophy_type__trophy='golden_bristle'),
            distinct=True
        ),
        diamond_trophy_count=Count(
            'post_trophy',
            filter=Q(post_trophy__post_trophy_type__trophy='diamond_canvas'),
            distinct=True
        ),

        # Critique counts by impression (positive=8, negative=3, neutral=3)
        positive_critique_count=Count(
            'post_critique',
            filter=Q(post_critique__is_deleted=False, post_critique__impression='positive'),
            distinct=True
        ),
        negative_critique_count=Count(
            'post_critique',
            filter=Q(post_critique__is_deleted=False, post_critique__impression='negative'),
            distinct=True
        ),
        neutral_critique_count=Count(
            'post_critique',
            filter=Q(post_critique__is_deleted=False, post_critique__impression='neutral'),
            distinct=True
        ),

        # Comment count (0.5x weight, is_deleted=False, not critique replies)
        comment_count=Count(
            'post_comment',
            filter=Q(post_comment__is_deleted=False, post_comment__is_critique_reply=False),
            distinct=True
        ),
    )

    # Calculate engagement score using annotated values
    engagement_score_raw = (
        (F('hearts_count') * 1.0) +  # Hearts = 1x
        (F('praise_count') * 3.5) +  # Praise = 3.5x
        (F('bronze_trophy_count') * 10.0) +  # Bronze trophies = 10x
        (F('golden_trophy_count') * 15.0) +  # Golden trophies = 15x
        (F('diamond_trophy_count') * 20.0) +  # Diamond trophies = 20x
        (F('positive_critique_count') * 8.0) +  # Positive critiques = 8x
        (F('negative_critique_count') * 3.0) +  # Negative critiques = 3x
        (F('neutral_critique_count') * 3.0) +  # Neutral critiques = 3x
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


def generate_top_posts_cache(limit: int = 100, post_type: str = None):
    """
    Generate and cache top posts for all users.
    
    Args:
        limit: Number of top posts to generate (max 100)
        post_type: Optional post type filter ('default', 'novel', 'image', 'video')
    
    Returns:
        List of post data in ranked order
    """
    from .serializers import PostListViewSerializer
    from django.http import HttpRequest
    
    # Build base queryset - only active posts
    queryset = Post.objects.get_active_objects().select_related(
        'author',
        'author__artist',
        'channel',
        'channel__collective',
    ).prefetch_related('novel_post')
    
    # Apply global ranking algorithm
    ranked_queryset = build_global_top_posts_queryset(queryset, limit, post_type=post_type)
    
    # Serialize posts
    # Create a mock request for serializer context
    request = HttpRequest()
    request.method = 'GET'
    
    serializer = PostListViewSerializer(ranked_queryset, many=True, context={'request': request})
    posts_data = serializer.data
    
    # Build cache key with post_type if provided
    post_type_suffix = f":{post_type}" if post_type else ""
    cache_key = f"global_top_posts:{limit}{post_type_suffix}"
    cache.set(cache_key, posts_data, CACHE_TTL_TOP_POSTS)
    
    # Also cache for limit=100 if we generated more than that (for efficient slicing)
    if limit >= 100 and len(posts_data) >= 100:
        cache_key_100 = f"global_top_posts:100{post_type_suffix}"
        cache.set(cache_key_100, posts_data[:100], CACHE_TTL_TOP_POSTS)
    
    return posts_data


def get_cached_top_posts(limit: int = 100, post_type: str = None):
    """
    Get cached top posts.
    
    Args:
        limit: Number of posts to retrieve (5, 10, 25, 50, 100)
        post_type: Optional post type filter ('default', 'novel', 'image', 'video')
    
    Returns:
        Cached posts data or None if not cached
    """
    # Validate limit
    valid_limits = [5, 10, 25, 50, 100]
    if limit not in valid_limits:
        limit = 100  # Default to 100
    
    # Build cache key suffix with post_type if provided
    post_type_suffix = f":{post_type}" if post_type else ""
    
    # Always check cache for limit=100 first (most comprehensive)
    # If smaller limit requested, we can slice from the larger cache
    cache_key_100 = f"global_top_posts:100{post_type_suffix}"
    cached_data = cache.get(cache_key_100)
    
    if cached_data:
        # If post_type filter is requested, filter the cached data
        if post_type:
            filtered_data = [post for post in cached_data if post.get('post_type') == post_type]
            return filtered_data[:limit] if filtered_data else None
        # Return only the requested number
        return cached_data[:limit]
    
    # If limit=100 cache not found, try the specific limit cache
    if limit != 100:
        cache_key = f"global_top_posts:{limit}{post_type_suffix}"
        cached_data = cache.get(cache_key)
        if cached_data:
            # If post_type filter is requested, filter the cached data
            if post_type:
                filtered_data = [post for post in cached_data if post.get('post_type') == post_type]
                return filtered_data[:limit] if filtered_data else None
            return cached_data[:limit]
    
    # If post_type is requested but no filtered cache exists, try to get unfiltered cache and filter it
    if post_type:
        # Try to get unfiltered cache and filter it
        unfiltered_cache_key_100 = "global_top_posts:100"
        unfiltered_data = cache.get(unfiltered_cache_key_100)
        if unfiltered_data:
            filtered_data = [post for post in unfiltered_data if post.get('post_type') == post_type]
            if filtered_data:
                return filtered_data[:limit]
        
        # Try specific limit unfiltered cache
        if limit != 100:
            unfiltered_cache_key = f"global_top_posts:{limit}"
            unfiltered_data = cache.get(unfiltered_cache_key)
            if unfiltered_data:
                filtered_data = [post for post in unfiltered_data if post.get('post_type') == post_type]
                if filtered_data:
                    return filtered_data[:limit]
    
    return None

