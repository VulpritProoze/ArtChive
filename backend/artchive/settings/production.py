# For production environment

from decouple import config

from .base import *  # noqa: F403

# ALLOWED_HOSTS must be explicitly set via environment variable in production
ALLOWED_HOSTS_STR = config('ALLOWED_HOSTS')
if not ALLOWED_HOSTS_STR:
    raise ValueError(
        'ALLOWED_HOSTS environment variable is required in production. '
        'Please set it in your Render dashboard, or whichever service provider you are using '
        '(e.g., "your-backend.onrender.com" or comma-separated list).'
    )
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_STR.split(',')]

# CORS_ALLOWED_ORIGINS must be explicitly set via environment variable in production
CORS_ALLOWED_ORIGINS_STR = config('CORS_ALLOWED_ORIGINS')
if not CORS_ALLOWED_ORIGINS_STR:
    raise ValueError(
        'CORS_ALLOWED_ORIGINS environment variable is required in production. '
        'Please set it in your Render dashboard (e.g., "https://artchive.onrender.com" or comma-separated list).'
    )
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS_STR.split(',')]

# CSRF_TRUSTED_ORIGINS must be explicitly set via environment variable in production
# Also automatically add the backend server URL so Django admin works
CSRF_TRUSTED_ORIGINS_STR = config('CSRF_TRUSTED_ORIGINS')
if not CSRF_TRUSTED_ORIGINS_STR:
    raise ValueError(
        'CSRF_TRUSTED_ORIGINS environment variable is required in production. '
        'Please set it in your Render dashboard (e.g., "https://artchive.onrender.com" or comma-separated list).'
    )
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in CSRF_TRUSTED_ORIGINS_STR.split(',')]

# Automatically add backend server URL(s) to CSRF_TRUSTED_ORIGINS for Django admin access
# Convert ALLOWED_HOSTS to https:// URLs and add them
for host in ALLOWED_HOSTS:
    # Skip wildcard patterns (like .onrender.com)
    if not host.startswith('.'):
        backend_url = f'https://{host}'
        if backend_url not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(backend_url)

# Application definition
INSTALLED_APPS = [
    'daphne',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'cloudinary',
    'cloudinary_storage',
    'corsheaders',
    'core',
    'notification',
    'post',
    'collective',
    'gallery',
    'avatar',
    'conversation',
    'rest_framework',
    'silk',
    'drf_spectacular'
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'silk.middleware.SilkyMiddleware',
]

# Serve collected static assets via WhiteNoise in production
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": STATICFILES_STORAGE,
    },
}
