"""
Management command to debug user presence tracking.

Usage:
    python manage.py debug_presence [--user-id=1] [--check-all]
"""

from django.core.cache import cache
from django.core.management.base import BaseCommand
from core.models import User, UserFellow
from core.presence import is_user_active, get_user_last_activity


class Command(BaseCommand):
    help = 'Debug user presence tracking'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='Check presence for specific user ID',
        )
        parser.add_argument(
            '--check-all',
            action='store_true',
            help='Check all active users in cache',
        )

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        check_all = options.get('check_all', False)

        if check_all:
            self.stdout.write('Checking all active users in cache...\n')
            # Try to find all presence keys (this is approximate since Redis doesn't have a direct way to list all keys)
            # We'll check for common user IDs
            active_users = []
            for uid in range(1, 100):  # Check first 100 user IDs
                if is_user_active(uid):
                    last_activity = get_user_last_activity(uid)
                    try:
                        user = User.objects.get(id=uid)
                        active_users.append({
                            'id': uid,
                            'username': user.username,
                            'last_activity': last_activity
                        })
                    except User.DoesNotExist:
                        pass

            if active_users:
                self.stdout.write(f'Found {len(active_users)} active users:\n')
                for user_info in active_users:
                    self.stdout.write(
                        f"  User {user_info['id']} ({user_info['username']}): "
                        f"Last active: {user_info['last_activity']}"
                    )
            else:
                self.stdout.write(self.style.WARNING('No active users found in cache'))

        elif user_id:
            self.stdout.write(f'Checking presence for user ID {user_id}...\n')
            try:
                user = User.objects.get(id=user_id)
                self.stdout.write(f'User: {user.username} (ID: {user.id})\n')
                
                is_active = is_user_active(user_id)
                last_activity = get_user_last_activity(user_id)
                
                self.stdout.write(f'Active: {is_active}\n')
                if last_activity:
                    self.stdout.write(f'Last Activity: {last_activity}\n')
                else:
                    self.stdout.write(self.style.WARNING('No last activity found\n'))
                
                # Check fellows
                self.stdout.write('\nFellows:\n')
                from django.db.models import Q
                fellows = UserFellow.objects.filter(
                    (Q(user=user, status='accepted') | Q(fellow_user=user, status='accepted')),
                    is_deleted=False
                )
                
                if fellows.exists():
                    for fellow in fellows:
                        fellow_user = fellow.fellow_user if fellow.user == user else fellow.user
                        fellow_active = is_user_active(fellow_user.id)
                        self.stdout.write(
                            f"  - {fellow_user.username} (ID: {fellow_user.id}): "
                            f"{'ACTIVE' if fellow_active else 'INACTIVE'}\n"
                        )
                else:
                    self.stdout.write(self.style.WARNING('  No accepted fellows found\n'))
                    
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'User with ID {user_id} not found'))
        else:
            self.stdout.write(self.style.ERROR('Please provide --user-id or --check-all'))

