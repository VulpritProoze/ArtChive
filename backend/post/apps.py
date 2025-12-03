import threading

from django.apps import AppConfig

# Global flag to prevent double execution
_generate_top_posts_started = False


class PostConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'post'

    def ready(self):
        """Import signal handlers when the app is ready."""
        import post.cache_utils  # noqa: F401

        # Generate top posts cache after all systems are ready
        # Use threading to avoid blocking startup
        global _generate_top_posts_started

        # Prevent double execution (ready() can be called multiple times in dev mode)
        if _generate_top_posts_started:
            return

        def generate_top_posts_async():
            import time
            # Wait 5 seconds for all systems to be fully ready
            time.sleep(5)
            try:
                from django.core.management import call_command
                call_command('generate_top_posts', '--limit=100', verbosity=0)
            except Exception as e:
                # Log error but don't crash startup
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f'Failed to generate top posts on startup: {str(e)}')

        # Only run in non-testing environments
        import sys
        if 'test' not in sys.argv and 'migrate' not in sys.argv:
            _generate_top_posts_started = True
            thread = threading.Thread(target=generate_top_posts_async, daemon=True)
            thread.start()
