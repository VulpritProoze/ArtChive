"""
Upload the static fallback images in ``core/static/images`` to Cloudinary while
preserving their original filenames. Useful when the database relies on those
exact filenames for default media references.

Usage:
    python manage.py export_static_images
    python manage.py export_static_images --dry-run
    python manage.py export_static_images --folder=static/images
"""

from pathlib import Path

import cloudinary.uploader
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Upload core static images to Cloudinary without renaming files.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--folder',
            default='static/images',
            help='Cloudinary folder to upload into (default: static/images).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List the files that would be uploaded without calling Cloudinary.',
        )

    def handle(self, *args, **options):
        target_folder = options['folder'].strip('/')
        dry_run = options['dry_run']

        static_dir = Path(settings.BASE_DIR) / 'core' / 'static' / 'images'
        if not static_dir.exists():
            raise CommandError(f'Static image directory not found: {static_dir}')

        image_files = sorted(
            p for p in static_dir.iterdir()
            if p.is_file() and p.name != '__init__.py'
        )
        if not image_files:
            self.stdout.write(self.style.WARNING('No images found to upload.'))
            return

        self.stdout.write(
            f'Found {len(image_files)} image(s) in {static_dir.resolve()}'
        )
        if dry_run:
            self.stdout.write(self.style.WARNING('Dry run enabled; no uploads will occur.'))

        for image_path in image_files:
            public_id = image_path.stem  # keep original filename (without extension)
            file_format = image_path.suffix.lstrip('.')
            absolute_path = str(image_path.resolve())

            if dry_run:
                self.stdout.write(f'[DRY RUN] Would upload {absolute_path} as {public_id}.{file_format}')
                continue

            upload_options = {
                'folder': target_folder,
                'public_id': public_id,
                'use_filename': True,
                'unique_filename': False,
                'overwrite': True,
                'resource_type': 'image',
            }
            if file_format:
                upload_options['format'] = file_format

            self.stdout.write(f'Uploading {absolute_path} -> {target_folder}/{public_id}.{file_format or "jpg"}')
            result = cloudinary.uploader.upload(absolute_path, **upload_options)
            secure_url = result.get('secure_url') or result.get('url', 'N/A')
            self.stdout.write(self.style.SUCCESS(f'Uploaded as {secure_url}'))

        self.stdout.write(self.style.SUCCESS('All images uploaded successfully.'))

