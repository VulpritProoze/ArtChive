"""
Management command to clear collective memberships cache.

Usage:
    python manage.py clear_collective_cache --user_id=1
    python manage.py clear_collective_cache --all
"""

from django.core.management.base import BaseCommand

from collective.cache_utils import invalidate_collective_memberships_cache
from core.models import User


class Command(BaseCommand):
    help = 'Clear collective memberships cache for specific user or all users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user_id',
            type=int,
            help='User ID to clear cache for',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Clear cache for all users',
        )

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        clear_all = options.get('all')

        if not user_id and not clear_all:
            self.stdout.write(
                self.style.ERROR('Please provide either --user_id or --all')
            )
            return

        if clear_all:
            self.stdout.write('Clearing collective memberships cache for all users...')
            count = 0
            for user in User.objects.all():
                invalidate_collective_memberships_cache(user.id)
                count += 1
            self.stdout.write(
                self.style.SUCCESS(f'Successfully cleared cache for {count} users!')
            )
        else:
            self.stdout.write(f'Clearing collective memberships cache for user {user_id}...')
            invalidate_collective_memberships_cache(user_id)
            self.stdout.write(
                self.style.SUCCESS(f'Successfully cleared cache for user {user_id}!')
            )
