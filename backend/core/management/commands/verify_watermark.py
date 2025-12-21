"""
Management command to verify watermark in an image.

Usage:
    python manage.py verify_watermark <image_url> [--extract]
    python manage.py verify_watermark <image_path> [--extract]
"""
from django.core.management.base import BaseCommand, CommandError
from common.utils.watermark import extract_watermark


class Command(BaseCommand):
    help = 'Verify watermark in an image file or URL'

    def add_arguments(self, parser):
        parser.add_argument(
            'image_source',
            type=str,
            help='URL or file path of the image to verify'
        )
        parser.add_argument(
            '--extract',
            action='store_true',
            help='Extract and display full watermark payload'
        )

    def handle(self, *args, **options):
        image_source = options['image_source']
        extract_full = options.get('extract', False)

        self.stdout.write(f'Verifying watermark in: {image_source}')

        try:
            payload = extract_watermark(image_source)

            if payload:
                self.stdout.write(
                    self.style.SUCCESS('✓ Watermark found!')
                )
                
                if extract_full:
                    self.stdout.write('\nFull watermark payload:')
                    import json
                    self.stdout.write(json.dumps(payload, indent=2))
                else:
                    self.stdout.write('\nWatermark details:')
                    self.stdout.write(f"  User ID: {payload.get('user_id')}")
                    self.stdout.write(f"  Username: {payload.get('username')}")
                    self.stdout.write(f"  Platform: {payload.get('platform')}")
                    self.stdout.write(f"  Timestamp: {payload.get('timestamp')}")
                    if payload.get('post_id'):
                        self.stdout.write(f"  Post ID: {payload.get('post_id')}")
                    if payload.get('gallery_id'):
                        self.stdout.write(f"  Gallery ID: {payload.get('gallery_id')}")
                    self.stdout.write(f"  Version: {payload.get('version')}")
                    self.stdout.write(f"  Checksum: {payload.get('checksum')}")
            else:
                self.stdout.write(
                    self.style.WARNING('✗ No watermark found in image')
                )
                return 1

        except Exception as e:
            raise CommandError(f'Error verifying watermark: {str(e)}') from e

        return 0

