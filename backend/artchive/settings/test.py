# For testing environment

from .base import *  # noqa: F403
from .dev import INSTALLED_APPS as DEV_INSTALLED_APPS  # noqa: F401, F403
from .dev import MIDDLEWARE as DEV_MIDDLEWARE

# Override settings for testing
DEBUG = True
ALLOWED_HOSTS = ["*"]

# Use in-memory database for faster tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Disable migrations for faster tests (optional - comment out if you need migrations)
# class DisableMigrations:
#     def __contains__(self, item):
#         return True
#     def __getitem__(self, item):
#         return None
# MIGRATION_MODULES = DisableMigrations()

# Use locmem cache for testing (supports actual caching tests)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Disable Silk profiling in tests
INSTALLED_APPS = [app for app in DEV_INSTALLED_APPS if app != 'silk']
MIDDLEWARE = [mw for mw in DEV_MIDDLEWARE if 'silk' not in mw.lower()]

# CORS settings for tests
CORS_ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
CORS_ALLOW_CREDENTIALS = True

# Fixture directories - point to common/fixtures for test fixtures
# BASE_DIR is already imported from .base
FIXTURE_DIRS = [
    str(BASE_DIR / 'common' / 'fixtures'),  # noqa: F405
]

# Disable Cloudinary in tests (use local storage or mock)
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.InMemoryStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}
