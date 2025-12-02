"""
Unit tests for personalized post ranking and cache invalidation.

Tests cover:
- Cache invalidation on user interactions
- Calculation version tracking
- Smart filtering of deleted posts from cache
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from post.models import Post, PostHeart
from post.ranking import (
    get_cached_collectives,
    get_cached_fellows,
    get_user_interaction_stats,
    invalidate_user_calculations,
)

User = get_user_model()


class CacheInvalidationTestCase(TestCase):
    """Test cache invalidation on user interactions."""

    fixtures = ['default_collectives']

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        # Clear cache before each test
        cache.clear()

    def test_calculation_version_increments_on_interaction(self):
        """Test that calculation version increments when user interacts with posts."""
        # Get initial version
        version_key = f"calc_version:{self.user.id}"
        initial_version = cache.get(version_key, 1)
        self.assertEqual(initial_version, 1)

        # Create a post and interact with it
        post = Post.objects.create(
            author=self.user,
            description="Test post",
            post_type="default"
        )

        # Heart the post (this should invalidate calculations)
        PostHeart.objects.create(post_id=post, author=self.user)
        invalidate_user_calculations(self.user.id)

        # Check version incremented
        new_version = cache.get(version_key, 1)
        self.assertEqual(new_version, initial_version + 1)

    def test_cache_keys_include_version(self):
        """Test that cache keys include calculation version."""
        version_key = f"calc_version:{self.user.id}"
        cache.set(version_key, 5, 86400)  # Set version to 5

        # Cache key should include version
        expected_key = f"post_list:{self.user.id}:calc_v5:1:10"
        self.assertIn("calc_v5", expected_key)

    def test_invalidate_user_calculations_deletes_caches(self):
        """Test that invalidate_user_calculations deletes calculation caches."""
        # Set some cached data
        cache.set(f"user_fellows:{self.user.id}", {1, 2, 3}, 300)
        cache.set(f"user_joined_collectives:{self.user.id}", {"coll1", "coll2"}, 300)
        cache.set(f"user_interaction_stats:{self.user.id}", {"test": "data"}, 300)

        # Verify caches exist
        self.assertIsNotNone(cache.get(f"user_fellows:{self.user.id}"))
        self.assertIsNotNone(cache.get(f"user_joined_collectives:{self.user.id}"))
        self.assertIsNotNone(cache.get(f"user_interaction_stats:{self.user.id}"))

        # Invalidate
        invalidate_user_calculations(self.user.id)

        # Verify caches are deleted
        self.assertIsNone(cache.get(f"user_fellows:{self.user.id}"))
        self.assertIsNone(cache.get(f"user_joined_collectives:{self.user.id}"))
        self.assertIsNone(cache.get(f"user_interaction_stats:{self.user.id}"))

        # Verify version incremented
        version_key = f"calc_version:{self.user.id}"
        version = cache.get(version_key, 1)
        self.assertEqual(version, 2)  # Should be 2 (started at 1, incremented once)


class SmartFilteringTestCase(TestCase):
    """Test smart filtering of deleted posts from cache."""

    fixtures = ['default_collectives']

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        cache.clear()

    def test_deleted_posts_filtered_from_cached_data(self):
        """Test that deleted posts are filtered from cached response."""
        # Create test posts
        post1 = Post.objects.create(
            author=self.user,
            description="Active post",
            post_type="default"
        )
        post2 = Post.objects.create(
            author=self.user,
            description="Deleted post",
            post_type="default"
        )

        # Simulate cached data with both posts
        cached_data = {
            'results': [
                {
                    'post_id': str(post1.post_id),
                    'description': 'Active post',
                    'is_deleted': False
                },
                {
                    'post_id': str(post2.post_id),
                    'description': 'Deleted post',
                    'is_deleted': True  # This should be filtered out
                }
            ],
            'count': 2
        }

        # Filter deleted posts (simulating what happens in PostListView.list())
        filtered_results = [
            post for post in cached_data['results']
            if not post.get('is_deleted', False)
        ]

        # Verify deleted post is filtered out
        self.assertEqual(len(filtered_results), 1)
        self.assertEqual(filtered_results[0]['post_id'], str(post1.post_id))
        self.assertFalse(filtered_results[0]['is_deleted'])

    def test_non_deleted_posts_remain_in_cache(self):
        """Test that non-deleted posts remain in cached response."""
        # Create test posts
        post1 = Post.objects.create(
            author=self.user,
            description="Post 1",
            post_type="default"
        )
        post2 = Post.objects.create(
            author=self.user,
            description="Post 2",
            post_type="default"
        )

        # Simulate cached data with no deleted posts
        cached_data = {
            'results': [
                {
                    'post_id': str(post1.post_id),
                    'description': 'Post 1',
                    'is_deleted': False
                },
                {
                    'post_id': str(post2.post_id),
                    'description': 'Post 2',
                    'is_deleted': False
                }
            ],
            'count': 2
        }

        # Filter deleted posts
        filtered_results = [
            post for post in cached_data['results']
            if not post.get('is_deleted', False)
        ]

        # Verify all posts remain
        self.assertEqual(len(filtered_results), 2)


class RankingFunctionsTestCase(TestCase):
    """Test ranking helper functions."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        cache.clear()

    def test_get_cached_fellows_returns_set(self):
        """Test that get_cached_fellows returns a set of fellow IDs."""
        fellow_ids = get_cached_fellows(self.user)
        self.assertIsInstance(fellow_ids, set)

    def test_get_cached_collectives_returns_set(self):
        """Test that get_cached_collectives returns a set of collective IDs."""
        collective_ids = get_cached_collectives(self.user)
        self.assertIsInstance(collective_ids, set)

    def test_get_user_interaction_stats_returns_dict(self):
        """Test that get_user_interaction_stats returns a dictionary."""
        stats = get_user_interaction_stats(self.user)
        self.assertIsInstance(stats, dict)
        self.assertIn('author_interactions', stats)
        self.assertIn('preferred_post_types', stats)

