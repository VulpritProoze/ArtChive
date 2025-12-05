"""
Search models for storing user search history.
"""
from django.db import models

from core.models import User


class UserSearchHistory(models.Model):
    """
    Store user search history for analytics and recent searches feature.
    """
    SEARCH_TYPE_CHOICES = [
        ('all', 'All'),
        ('users', 'Users'),
        ('posts', 'Posts'),
        ('collectives', 'Collectives'),
        ('galleries', 'Galleries'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='search_history'
    )
    query = models.CharField(
        max_length=255,
        help_text='The search query string'
    )
    search_type = models.CharField(
        max_length=20,
        choices=SEARCH_TYPE_CHOICES,
        default='all',
        help_text='Type of search performed'
    )
    result_count = models.IntegerField(
        default=0,
        help_text='Number of results found'
    )
    is_successful = models.BooleanField(
        default=False,
        help_text='Whether results were found'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'User Search History'
        verbose_name_plural = 'User Search Histories'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at'], name='search_hist_user_created_idx'),
            models.Index(fields=['query'], name='search_history_query_idx'),
        ]

    def __str__(self):
        return f"{self.user.username}: '{self.query}' ({self.search_type}) at {self.created_at}"

    @classmethod
    def get_recent_searches(cls, user, limit=10):
        """Get recent searches for a user, excluding duplicates (same query)"""
        # Get distinct queries, ordered by most recent occurrence
        recent_queries = cls.objects.filter(
            user=user
        ).values('query').annotate(
            latest_created_at=models.Max('created_at')
        ).order_by('-latest_created_at')[:limit]

        # Get the actual objects for the most recent occurrence of each unique query
        query_list = [item['query'] for item in recent_queries]
        seen_queries = set()
        results = []

        # Get all matching objects and filter to get only the first occurrence of each query
        for obj in cls.objects.filter(
            user=user,
            query__in=query_list
        ).order_by('-created_at'):
            if obj.query not in seen_queries:
                seen_queries.add(obj.query)
                results.append(obj)
                if len(results) >= limit:
                    break

        return results
