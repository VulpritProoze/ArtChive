"""
Management command to inspect Redis cache contents.

Usage:
    python manage.py inspect_cache [--pattern="global_top_posts:*"] [--all]
"""

from django.core.cache import cache
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Inspect Redis cache contents, especially for top posts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--pattern',
            type=str,
            default='global_top_posts:*',
            help='Pattern to search for in cache keys (default: "global_top_posts:*")',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Show all cache keys (requires Redis connection)',
        )

    def handle(self, *args, **options):
        pattern = options['pattern']
        show_all = options['all']

        self.stdout.write(self.style.SUCCESS(f'Inspecting cache with pattern: {pattern}\n'))

        # Try to get cache backend
        cache_backend = cache
        backend_class = cache_backend.__class__.__name__

        self.stdout.write(f'Cache backend: {backend_class}\n')

        # For django_redis, we can use the client directly
        if hasattr(cache_backend, 'client'):
            try:
                client = cache_backend.client.get_client()
                
                if show_all:
                    # Get all keys matching pattern
                    if hasattr(client, 'keys'):
                        keys = client.keys(f'artchive:{pattern}' if pattern else 'artchive:*')
                        self.stdout.write(f'Found {len(keys)} keys:\n')
                        for key in keys[:100]:  # Limit to first 100
                            # Remove prefix if present
                            display_key = key.decode('utf-8') if isinstance(key, bytes) else key
                            if display_key.startswith('artchive:'):
                                display_key = display_key[len('artchive:'):]
                            
                            # Try to get value
                            value = cache.get(display_key)
                            if value:
                                if isinstance(value, list):
                                    self.stdout.write(f'  {display_key}: {len(value)} items (list)')
                                elif isinstance(value, dict):
                                    self.stdout.write(f'  {display_key}: {len(value)} keys (dict)')
                                else:
                                    self.stdout.write(f'  {display_key}: {type(value).__name__}')
                            else:
                                self.stdout.write(f'  {display_key}: (not found or expired)')
                        
                        if len(keys) > 100:
                            self.stdout.write(f'\n... and {len(keys) - 100} more keys')
                    else:
                        self.stdout.write(self.style.WARNING('Cannot list keys with this cache backend'))
                else:
                    # Check specific keys for top posts
                    test_keys = [
                        'global_top_posts:100',
                        'global_top_posts:25',
                        'global_top_posts:10',
                        'global_top_posts:5',
                        'global_top_posts:100:image',
                        'global_top_posts:100:video',
                        'global_top_posts:100:novel',
                        'global_top_posts:100:default',
                    ]
                    
                    self.stdout.write('Checking common top posts cache keys:\n')
                    for key in test_keys:
                        value = cache.get(key)
                        if value:
                            if isinstance(value, list):
                                self.stdout.write(
                                    self.style.SUCCESS(
                                        f'  ✓ {key}: {len(value)} posts cached'
                                    )
                                )
                                # Show first post info if available
                                if len(value) > 0 and isinstance(value[0], dict):
                                    first_post = value[0]
                                    post_type = first_post.get('post_type', 'unknown')
                                    post_id = first_post.get('post_id', 'unknown')
                                    self.stdout.write(
                                        f'    First post: {post_id} (type: {post_type})'
                                    )
                            else:
                                self.stdout.write(
                                    self.style.SUCCESS(f'  ✓ {key}: {type(value).__name__}')
                                )
                        else:
                            self.stdout.write(
                                self.style.ERROR(f'  ✗ {key}: Not cached or expired')
                            )
                    
                    # Check for any post_type filtered caches
                    self.stdout.write('\nChecking for post_type filtered caches:\n')
                    post_types = ['image', 'video', 'novel', 'default']
                    for post_type in post_types:
                        key = f'global_top_posts:100:{post_type}'
                        value = cache.get(key)
                        if value:
                            if isinstance(value, list):
                                self.stdout.write(
                                    self.style.SUCCESS(
                                        f'  ✓ {key}: {len(value)} posts cached'
                                    )
                                )
                            else:
                                self.stdout.write(
                                    self.style.SUCCESS(f'  ✓ {key}: {type(value).__name__}')
                                )
                        else:
                            self.stdout.write(
                                self.style.WARNING(f'  - {key}: Not cached')
                            )
                
                # Show cache info
                self.stdout.write('\n' + '='*50)
                self.stdout.write('Cache Statistics:')
                self.stdout.write('='*50)
                
                if hasattr(client, 'info'):
                    try:
                        info = client.info('stats')
                        self.stdout.write(f'Keyspace hits: {info.get("keyspace_hits", "N/A")}')
                        self.stdout.write(f'Keyspace misses: {info.get("keyspace_misses", "N/A")}')
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'Could not get cache stats: {e}'))
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error inspecting cache: {str(e)}')
                )
                import traceback
                self.stdout.write(traceback.format_exc())
        else:
            self.stdout.write(
                self.style.WARNING(
                    'Cache backend does not support direct inspection. '
                    'Trying to access keys directly...'
                )
            )
            
            # Fallback: try to get keys directly
            test_keys = [
                'global_top_posts:100',
                'global_top_posts:25',
                'global_top_posts:5',
            ]
            
            for key in test_keys:
                value = cache.get(key)
                if value:
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ {key}: Found ({type(value).__name__})')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ {key}: Not found')
                    )

