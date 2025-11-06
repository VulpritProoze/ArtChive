"""
Management command to clear notification cache for all users.

Usage:
    python manage.py clear_notification_cache
"""
from backend.notification.cache_utils import invalidate_notification_list_cache
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Clear all notification cache for all users'

    def handle(self, *args, **options):
        self.stdout.write('Clearing all notification cache...')
        invalidate_notification_list_cache()
        self.stdout.write(self.style.SUCCESS('Successfully cleared notifications cache!'))
