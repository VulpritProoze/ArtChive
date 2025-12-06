"""
Management command to generate and cache global top galleries.

Usage:
    python manage.py generate_top_galleries [--limit=100]
"""

from django.core.management.base import BaseCommand

from gallery.ranking import generate_top_galleries_cache


class Command(BaseCommand):
    help = 'Generate and cache global top galleries for all users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Number of top galleries to generate (default: 100, max: 100)',
        )

    def handle(self, *args, **options):
        limit = min(options['limit'], 100)  # Cap at 100

        self.stdout.write(f'Generating top {limit} galleries...')
        try:
            galleries_data = generate_top_galleries_cache(limit=limit)
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully generated and cached {len(galleries_data)} top galleries!'
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating top galleries: {str(e)}')
            )
            raise

