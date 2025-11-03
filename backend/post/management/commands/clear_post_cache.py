"""
Management command to clear post-related cache entries.

Usage:
    python manage.py clear_post_cache
"""

from django.core.management.base import BaseCommand

from post.cache_utils import invalidate_post_list_cache


class Command(BaseCommand):
    help = 'Clear all post list cache entries'

    def handle(self, *args, **options):
        self.stdout.write('Clearing post list cache...')
        invalidate_post_list_cache()
        self.stdout.write(self.style.SUCCESS('Successfully cleared post list cache!'))
