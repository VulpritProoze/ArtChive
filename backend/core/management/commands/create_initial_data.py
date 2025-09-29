from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decouple import config

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates initial superuser from environment variables'

    def handle(self, *args, **options):
        username = config('ADMIN_USER', default='')
        email = config('ADMIN_EMAIL', default='')
        password = config('ADMIN_PASS', default='')

        if not username or not email or not password:
            self.stdout.write(
                self.style.WARNING('ADMIN_USER/ADMIN_EMAIL/ADMIN_PASS not set. Skipping.')
            )
            return

        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(
                self.style.SUCCESS('Superuser already exists. Skipping...')
            )
            return

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        self.stdout.write(
            self.style.SUCCESS(f'Superuser "{username}" created.')
        )