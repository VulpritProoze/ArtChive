"""
Personalized Post Ranking Algorithm

This module provides database-level scoring for personalized post feeds.
All calculations are done in SQL using Django annotations for maximum performance.
"""
from datetime import timedelta
from typing import Dict, Set

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

from collective.models import CollectiveMember
from core.models import User, UserFellow
from post.models import Post, PostHeart, PostPraise, PostTrophy

# Scoring weights (can be made configurable later)
SCORING_WEIGHTS = {
    'recency': 0.15,
    'social_connection': 0.25,
    'interaction_history': 0.20,
    'engagement': 0.15,
    'collective_membership': 0.15,
    'post_type_preference': 0.10,
}

# Cache TTLs (in seconds)
CACHE_TTL_INTERACTION_STATS = 600  # 10 minutes
CACHE_TTL_FELLOWS = 300  # 5 minutes
CACHE_TTL_COLLECTIVES = 300  # 5 minutes
CACHE_TTL_FEED = 300  # 5 minutes


def get_cached_fellows(user: User) -> Set[int]:
    """
    Get cached list of user's fellow IDs (users they follow).

    Returns:
        Set of fellow_user_ids
    """
    cache_key = f"user_fellows:{user.id}"
    fellow_ids = cache.get(cache_key)

    if fellow_ids is None:
        fellow_ids = set(
            UserFellow.objects.filter(
                user=user,
                status='accepted',
                is_deleted=False
            ).values_list('fellow_user_id', flat=True)
        )
        cache.set(cache_key, fellow_ids, CACHE_TTL_FELLOWS)

    return fellow_ids


def get_cached_collectives(user: User) -> Set[str]:
    """
    Get cached list of user's collective IDs.

    Returns:
        Set of collective_ids (UUIDs as strings)
    """
    cache_key = f"user_joined_collectives:{user.id}"
    collective_ids = cache.get(cache_key)

    if collective_ids is None:
        collective_ids = {
            str(cid) for cid in CollectiveMember.objects.filter(
                member=user
            ).values_list('collective_id', flat=True)
        }
        cache.set(cache_key, collective_ids, CACHE_TTL_COLLECTIVES)

    return collective_ids


def get_user_interaction_stats(user: User) -> Dict:
    """
    Get cached user interaction statistics for scoring.

    Returns:
        Dict with:
        - author_interactions: Dict[author_id_str, interaction_count]
        - preferred_post_types: Dict[post_type, interaction_count]
    """
    cache_key = f"user_interaction_stats:{user.id}"
    stats = cache.get(cache_key)

    if stats is not None:
        return stats

    # Calculate interaction stats
    # Authors user has interacted with
    hearted_authors = set(
        PostHeart.objects.filter(author=user)
        .values_list('post_id__author_id', flat=True)
    )
    praised_authors = set(
        PostPraise.objects.filter(author=user)
        .values_list('post_id__author_id', flat=True)
    )
    trophy_authors = set(
        PostTrophy.objects.filter(author=user)
        .values_list('post_id__author_id', flat=True)
    )

    all_interacted_authors = hearted_authors | praised_authors | trophy_authors

    # Count interactions per author
    author_interactions = {}
    for author_id in all_interacted_authors:
        count = (
            PostHeart.objects.filter(author=user, post_id__author_id=author_id).count() +
            PostPraise.objects.filter(author=user, post_id__author_id=author_id).count() +
            PostTrophy.objects.filter(author=user, post_id__author_id=author_id).count()
        )
        author_interactions[str(author_id)] = count

    # Preferred post types (based on interaction frequency)
    user_posts_interacted = Post.objects.filter(
        Q(post_heart__author=user) |
        Q(post_praise__author=user) |
        Q(post_trophy__author=user)
    ).values('post_type').annotate(
        count=Count('post_type')
    ).order_by('-count')[:3]  # Top 3 types

    preferred_post_types = {
        item['post_type']: item['count']
        for item in user_posts_interacted
    }

    stats = {
        'author_interactions': author_interactions,
        'preferred_post_types': preferred_post_types,
    }

    cache.set(cache_key, stats, CACHE_TTL_INTERACTION_STATS)
    return stats


def build_personalized_queryset(queryset, user: User):
    """
    Build personalized queryset with database-level scoring.

    This function uses Django annotations to calculate scores in SQL,
    avoiding expensive Python loops.

    Args:
        queryset: Base Post queryset (already filtered)
        user: Authenticated user

    Returns:
        Annotated queryset ordered by personalized score
    """
    now = timezone.now()
    one_day_ago = now - timedelta(days=1)
    two_days_ago = now - timedelta(days=2)

    # Get cached user data
    fellow_ids = list(get_cached_fellows(user))
    collective_ids = list(get_cached_collectives(user))
    interaction_stats = get_user_interaction_stats(user)
    preferred_post_types = interaction_stats.get('preferred_post_types', {})
    # Note: author_interactions is available but not used in current scoring implementation
    # It's kept in interaction_stats for potential future use

    # Build score components using database annotations

    # 1. RECENCY SCORE (15% weight)
    # Exponential decay: newer posts get higher scores
    recency_score = Case(
        When(created_at__gte=one_day_ago, then=Value(15.0)),
        When(created_at__gte=two_days_ago, then=Value(5.0)),
        default=Value(1.0),
        output_field=FloatField()
    )

    # 2. SOCIAL CONNECTION SCORE (25% weight)
    # Posts from users you follow (fellows)
    social_score = Case(
        When(author_id__in=fellow_ids if fellow_ids else [-1], then=Value(12.5)),
        default=Value(0.0),
        output_field=FloatField()
    )

    # 3. COLLECTIVE MEMBERSHIP SCORE (15% weight)
    # Posts from collectives you're a member of
    collective_score = Case(
        When(channel__collective_id__in=collective_ids if collective_ids else ['-1'], then=Value(4.5)),
        default=Value(0.0),
        output_field=FloatField()
    )

    # 4. POST TYPE PREFERENCE SCORE (10% weight)
    # Boost for post types user interacts with most
    type_boost_cases = []

    for post_type, count in preferred_post_types.items():
        boost_value = min(count * 0.1, 1.0)  # Cap at 1.0 point
        type_boost_cases.append(
            When(post_type=post_type, then=Value(boost_value))
        )

    if type_boost_cases:
        type_preference_score = Case(
            *type_boost_cases,
            default=Value(0.0),
            output_field=FloatField()
        )
    else:
        # No preferred types, use zero score
        type_preference_score = Value(0.0, output_field=FloatField())

    # 5. ENGAGEMENT SCORE (based on interactions)
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
        (F('negative_critique_count') * 3.0) +  # Negative critiques = 3x (higher than heart)
        (F('neutral_critique_count') * 3.0) +  # Neutral critiques = 3x (higher than heart)
        (F('comment_count') * 0.5)  # Comments = 0.5x
    )

    # Annotate raw engagement score first
    queryset = queryset.annotate(engagement_score_raw=engagement_score_raw)

    # Cap engagement score to prevent it from dominating (max 50 points)
    # Define the capped engagement score expression
    engagement_score_capped = Case(
        When(engagement_score_raw__gt=50, then=Value(50.0)),
        default=F('engagement_score_raw'),
        output_field=FloatField()
    )

    # 6. OWN POST PENALTY (reduce showing user's own posts)
    # Apply penalty to posts authored by the current user
    own_post_penalty = Case(
        When(author_id=user.id, then=Value(-20.0)),  # Heavy penalty for own posts
        default=Value(0.0),
        output_field=FloatField()
    )

    # Calculate total score using expressions (not annotated fields yet)
    # Apply engagement weight to the capped engagement score
    engagement_score_weighted = engagement_score_capped * SCORING_WEIGHTS['engagement']

    total_score = (
        recency_score +
        social_score +
        collective_score +
        type_preference_score +
        engagement_score_weighted +
        own_post_penalty
    )

    # Annotate queryset with all scores in one go
    queryset = queryset.annotate(
        recency_score=recency_score,
        social_score=social_score,
        collective_score=collective_score,
        type_preference_score=type_preference_score,
        engagement_score=engagement_score_capped,  # Store raw capped score for debugging
        engagement_score_weighted=engagement_score_weighted,  # Store weighted score
        own_post_penalty=own_post_penalty,
        personalized_score=total_score
    ).order_by('-personalized_score', '-created_at')

    return queryset


def invalidate_user_cache(user_id: int):
    """
    Invalidate all cached data for a user.
    Call this when user interactions change.

    Args:
        user_id: User ID to invalidate cache for
    """
    cache_keys = [
        f"user_interaction_stats:{user_id}",
        f"user_fellows:{user_id}",
        f"user_joined_collectives:{user_id}",
        # Note: Feed cache keys include page/size, so we'd need to invalidate
        # all combinations. For now, let TTL handle it, or use cache versioning.
    ]

    cache.delete_many(cache_keys)


def invalidate_feed_cache(user_id: int):
    """
    Invalidate personalized feed cache for a user.
    Use cache versioning or pattern deletion if available.
    """
    # For Redis, we could use pattern matching, but Django cache doesn't support it directly
    # Instead, we rely on TTL or implement cache versioning
    # For now, let TTL handle expiration
    pass


def invalidate_user_calculations(user_id: int):
    """
    Invalidate calculation caches and increment version to invalidate post caches.

    This function implements Facebook-style cache invalidation:
    - Deletes calculation caches (fellows, collectives, interaction_stats)
    - Increments calculation version
    - Post cache keys include version, so incrementing version automatically invalidates all post caches

    Call this function when:
    - User interacts with posts (heart/praise/trophy)
    - User follows/unfollows someone
    - User joins/leaves a collective

    Args:
        user_id: User ID to invalidate calculations for
    """
    # Delete calculation caches
    cache.delete(f"user_interaction_stats:{user_id}")
    cache.delete(f"user_fellows:{user_id}")
    cache.delete(f"user_joined_collectives:{user_id}")

    # Increment calculation version (invalidates all post caches automatically)
    # Post cache keys are: post_list:{user_id}:calc_v{version}:{page}:{page_size}
    # By incrementing version, old cache keys become invalid
    version_key = f"calc_version:{user_id}"
    current_version = cache.get(version_key, 1)
    cache.set(version_key, current_version + 1, 86400)  # 24 hours TTL

