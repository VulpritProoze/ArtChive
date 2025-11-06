from django.apps import AppConfig


class PostConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'post'

    def ready(self):
        """Import signal handlers when the app is ready."""
        import post.cache_utils  # noqa: F401
