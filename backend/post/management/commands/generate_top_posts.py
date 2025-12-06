"""
Management command to generate and cache global top posts.

Usage:
    python manage.py generate_top_posts [--limit=100]
"""

from django.core.management.base import BaseCommand

from post.algorithm import generate_top_posts_cache


class Command(BaseCommand):
    help = 'Generate and cache global top posts for all users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Number of top posts to generate (default: 100, max: 100)',
        )
        parser.add_argument(
            '--post-type',
            type=str,
            default=None,
            help='Filter by post type (default, novel, image, video). Optional.',
        )

    def handle(self, *args, **options):
        limit = min(options['limit'], 100)  # Cap at 100
        post_type = options.get('post_type', None)

        if post_type:
            self.stdout.write(f'Generating top {limit} posts (type: {post_type})...')
            try:
                posts_data = generate_top_posts_cache(limit=limit, post_type=post_type)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully generated and cached {len(posts_data)} top posts!'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error generating top posts: {str(e)}')
                )
                raise
        else:
            # Generate for all types + unfiltered
            self.stdout.write(f'Generating top {limit} posts (all types)...')
            try:
                # Generate unfiltered cache (all post types)
                posts_data = generate_top_posts_cache(limit=limit, post_type=None)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully generated and cached {len(posts_data)} top posts (all types)!'
                    )
                )

                # Also generate for each specific post type for faster lookups
                from common.utils.choices import POST_TYPE_CHOICES
                post_types = [choice[0] for choice in POST_TYPE_CHOICES]

                for pt in post_types:
                    try:
                        type_posts = generate_top_posts_cache(limit=limit, post_type=pt)
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Successfully generated and cached {len(type_posts)} top {pt} posts!'
                            )
                        )
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'Warning: Could not generate cache for {pt}: {str(e)}')
                        )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error generating top posts: {str(e)}')
                )
                raise

