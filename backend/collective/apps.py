from django.apps import AppConfig


class CollectiveConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'collective'

    def ready(self):
        """Import signal handlers when the app is ready."""
        import collective.cache_utils  # noqa: F401
