import atexit
import os
import threading

from django.apps import AppConfig

# Cache generation interval (in minutes)
CACHE_GENERATION_INTERVAL_MINUTES = 60

# Thread lock to prevent concurrent execution
_generate_top_posts_lock = threading.Lock()
_generate_top_posts_thread = None
_scheduler = None


class PostConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'post'
    _top_posts_generation_started = False  # Class attribute to track if generation has started
    _scheduler_started = False

    def ready(self):
        """Import signal handlers when the app is ready."""
        import post.cache_utils  # noqa: F401

        # Generate top posts cache after all systems are ready
        # Use threading to avoid blocking startup
        global _generate_top_posts_thread

        # Prevent double execution (ready() can be called multiple times in dev mode)
        # Use a lock to ensure thread-safe execution
        with _generate_top_posts_lock:
            # Check environment variable first (persists across module reloads)
            env_flag = os.environ.get('ARTCHIVE_TOP_POSTS_GENERATION_STARTED', '0')
            if env_flag == '1':
                return

            # Check if we've already started generation (class attribute)
            if PostConfig._top_posts_generation_started:
                return

            # Check if a thread is already running
            if _generate_top_posts_thread is not None and _generate_top_posts_thread.is_alive():
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
            # Check if we're running the server (not migrations, tests, or other commands)
            is_server = len(sys.argv) > 1 and sys.argv[1] in ('runserver', 'runserver_plus', 'daphne')
            if is_server and 'test' not in sys.argv and 'migrate' not in sys.argv and 'makemigrations' not in sys.argv:
                # Set both the class attribute and environment variable
                PostConfig._top_posts_generation_started = True
                os.environ['ARTCHIVE_TOP_POSTS_GENERATION_STARTED'] = '1'
                _generate_top_posts_thread = threading.Thread(target=generate_top_posts_async, daemon=True)
                _generate_top_posts_thread.start()

                # Set up APScheduler for periodic cache generation (every hour)
                self._start_scheduler()

    def _start_scheduler(self):
        """Start APScheduler to run cache generation every hour."""
        global _scheduler

        # Prevent multiple scheduler instances
        if _scheduler is not None and _scheduler.running:
            return

        if PostConfig._scheduler_started:
            return

        try:
            import logging

            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.triggers.interval import IntervalTrigger

            logger = logging.getLogger(__name__)

            _scheduler = BackgroundScheduler()
            _scheduler.daemon = True

            # Add job to generate top posts cache at configured interval
            _scheduler.add_job(
                self._generate_top_posts_cache,
                trigger=IntervalTrigger(minutes=CACHE_GENERATION_INTERVAL_MINUTES),
                id='generate_top_posts',
                name='Generate Top Posts Cache',
                replace_existing=True,
                max_instances=1,  # Prevent concurrent executions
            )

            _scheduler.start()
            PostConfig._scheduler_started = True
            logger.info(f'APScheduler started for top posts cache generation (every {CACHE_GENERATION_INTERVAL_MINUTES} minute(s))')

            # Register shutdown handler
            atexit.register(lambda: _scheduler.shutdown() if _scheduler and _scheduler.running else None)

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Failed to start APScheduler: {str(e)}')

    @staticmethod
    def _generate_top_posts_cache():
        """Generate top posts cache (called by scheduler)."""
        try:
            import logging

            from django.core.management import call_command
            logger = logging.getLogger(__name__)
            logger.info('Starting scheduled top posts cache generation...')
            call_command('generate_top_posts', '--limit=100', verbosity=0)
            logger.info('Successfully completed scheduled top posts cache generation')
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Failed to generate top posts cache in scheduler: {str(e)}')
