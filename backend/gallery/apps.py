import os
import threading

from django.apps import AppConfig

# Thread lock to prevent concurrent execution
_generate_top_galleries_lock = threading.Lock()
_generate_top_galleries_thread = None


class GalleryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gallery'
    _top_galleries_generation_started = False  # Class attribute to track if generation has started

    def ready(self):
        """Generate top galleries cache after all systems are ready."""
        # Generate top galleries cache after all systems are ready
        # Use threading to avoid blocking startup
        global _generate_top_galleries_thread

        # Prevent double execution (ready() can be called multiple times in dev mode)
        # Use a lock to ensure thread-safe execution
        with _generate_top_galleries_lock:
            # Check environment variable first (persists across module reloads)
            env_flag = os.environ.get('ARTCHIVE_TOP_GALLERIES_GENERATION_STARTED', '0')
            if env_flag == '1':
                return

            # Check if we've already started generation (class attribute)
            if GalleryConfig._top_galleries_generation_started:
                return

            # Check if a thread is already running
            if _generate_top_galleries_thread is not None and _generate_top_galleries_thread.is_alive():
                return

            def generate_top_galleries_async():
                import time
                # Wait 5 seconds for all systems to be fully ready
                time.sleep(5)
                try:
                    from django.core.management import call_command
                    call_command('generate_top_galleries', '--limit=100', verbosity=0)
                except Exception as e:
                    # Log error but don't crash startup
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f'Failed to generate top galleries on startup: {str(e)}')

            # Only run in non-testing environments
            import sys
            # Check if we're running the server (not migrations, tests, or other commands)
            is_server = len(sys.argv) > 1 and sys.argv[1] in ('runserver', 'runserver_plus', 'daphne')
            if is_server and 'test' not in sys.argv and 'migrate' not in sys.argv and 'makemigrations' not in sys.argv:
                # Set both the class attribute and environment variable
                GalleryConfig._top_galleries_generation_started = True
                os.environ['ARTCHIVE_TOP_GALLERIES_GENERATION_STARTED'] = '1'
                _generate_top_galleries_thread = threading.Thread(target=generate_top_galleries_async, daemon=True)
                _generate_top_galleries_thread.start()
