# For local development


from .base import *  # noqa: F403

ALLOWED_HOSTS = ["*"]

CORS_ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

# No CSRF configuration in development

# Application definition
INSTALLED_APPS = [
    "daphne",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "core",  # Moved before unfold so our templates override Unfold's
    "unfold",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "cloudinary",
    "cloudinary_storage",
    "corsheaders",
    "notification",
    "post",
    "collective",
    "gallery",
    "avatar",
    "conversation",
    "searchapp",
    "rest_framework",
    "silk",
    "drf_spectacular",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "silk.middleware.SilkyMiddleware",
]


SPECTACULAR_SETTINGS = {
    "TITLE": "ArtChive API",
    "DESCRIPTION": "This serves as the official API documentation of ArtChive's API. Do not reproduce, and do not distribute. For internal usage only.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"/api/",
    "COMPONENTS": {
        "SECURITY_SCHEMES": {
            "cookieJWTAuth": {  # Changed from 'cookieAuth' to match extension
                "type": "apiKey",
                "in": "cookie",
                "name": "access_token",
                "description": "Cookie-based JWT authentication",
            },
            "refreshJWTAuth": {  # Changed from 'refreshAuth'
                "type": "apiKey",
                "in": "cookie",
                "name": "refresh_token",
                "description": "Refresh token cookie",
            },
        }
    },
    "AUTHENTICATION_EXTENSIONS": [
        "core.spectacular.CookieJWTAuthExtension",
    ],
}

# py manage.py spectacular --color --file schema.yml

STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}
