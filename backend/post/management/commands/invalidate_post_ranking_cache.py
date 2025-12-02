"""
Management command to invalidate all caches related to PostListView and personalized ranking.

This command invalidates:
1. Calculation caches (user_interaction_stats, user_fellows, user_joined_collectives)
2. Calculation versions (calc_version) - automatically invalidates post_list caches
3. Post list caches (post_list:*)

Usage:
    # Invalidate all users' caches
    python manage.py invalidate_post_ranking_cache

    # Invalidate for a specific user
    python manage.py invalidate_post_ranking_cache --user-id 123

    # Reset calculation versions (forces fresh ranking on next request)
    python manage.py invalidate_post_ranking_cache --reset-versions

    # Clear all post list caches (use with caution - clears all post_list:* keys)
    python manage.py invalidate_post_ranking_cache --clear-post-caches
"""

from django.core.cache import cache
from django.core.management.base import BaseCommand

from core.models import User
from post.ranking import invalidate_user_calculations


class Command(BaseCommand):
    help = 'Invalidate all caches related to PostListView and personalized ranking'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='Invalidate caches for a specific user ID only',
        )
        parser.add_argument(
            '--reset-versions',
            action='store_true',
            help='Reset calculation versions for all users (forces fresh ranking)',
        )
        parser.add_argument(
            '--clear-post-caches',
            action='store_true',
            help='Clear all post_list cache keys (use with caution)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Invalidate all calculation caches and reset all versions',
        )

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        reset_versions = options.get('reset_versions', False)
        clear_post_caches = options.get('clear_post_caches', False)
        invalidate_all = options.get('all', False)

        if invalidate_all:
            # Invalidate everything
            self.stdout.write('Invalidating all PostListView-related caches...')
            self._invalidate_all_calculations()
            self._reset_all_versions()
            if clear_post_caches:
                self._clear_all_post_caches()
            self.stdout.write(
                self.style.SUCCESS('Successfully invalidated all caches!')
            )
            return

        if user_id:
            # Invalidate for specific user
            self.stdout.write(f'Invalidating caches for user ID: {user_id}')
            try:
                user = User.objects.get(id=user_id)
                invalidate_user_calculations(user_id)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully invalidated caches for user: {user.username} (ID: {user_id})'
                    )
                )
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'User with ID {user_id} does not exist')
                )
            return

        if reset_versions:
            # Reset all calculation versions
            self.stdout.write('Resetting calculation versions for all users...')
            count = self._reset_all_versions()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully reset calculation versions for {count} users'
                )
            )
            return

        if clear_post_caches:
            # Clear all post list caches
            self.stdout.write('Clearing all post_list cache keys...')
            self._clear_all_post_caches()
            self.stdout.write(
                self.style.SUCCESS('Successfully cleared all post_list caches!')
            )
            return

        # Default: invalidate all calculation caches
        self.stdout.write('Invalidating all calculation caches...')
        count = self._invalidate_all_calculations()
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully invalidated calculation caches for {count} users'
            )
        )

    def _invalidate_all_calculations(self):
        """Invalidate calculation caches for all users."""
        users = User.objects.filter(is_active=True)
        count = 0

        for user in users:
            invalidate_user_calculations(user.id)
            count += 1

        return count

    def _reset_all_versions(self):
        """Reset calculation versions for all users (forces fresh ranking)."""
        users = User.objects.filter(is_active=True)
        count = 0

        for user in users:
            version_key = f"calc_version:{user.id}"
            # Set version to 1 (or delete to start fresh)
            cache.delete(version_key)
            # Optionally set to 1 explicitly
            cache.set(version_key, 1, 86400)  # 24 hours TTL
            count += 1

        return count

    def _clear_all_post_caches(self):
        """
        Clear all post_list cache keys.

        Note: Django cache doesn't support pattern matching directly.
        This method attempts to clear known patterns, but for Redis,
        you might need to use Redis-specific commands.

        For now, we'll increment all calculation versions which automatically
        invalidates post_list caches (since cache keys include version).
        """
        # Since Django cache doesn't support pattern deletion,
        # we reset all calculation versions which invalidates post_list caches
        # (because post_list keys include calc_version)
        self.stdout.write(
            self.style.WARNING(
                'Note: Django cache does not support pattern-based deletion. '
                'Resetting calculation versions instead (this invalidates post_list caches).'
            )
        )
        self._reset_all_versions()

        # For anonymous users, we can't easily clear without pattern matching
        # They'll expire naturally with TTL (5 minutes)
        self.stdout.write(
            self.style.WARNING(
                'Anonymous user post_list caches will expire with TTL (5 minutes).'
            )
        )

