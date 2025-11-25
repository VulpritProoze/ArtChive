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

CORS_ALLOWED_ORIGINS = [
    'https://artchive.onrender.com',
]

CSRF_TRUSTED_ORIGINS = [
    'https://artchive.onrender.com',
]

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
    # 'silk',
    # 'drf_spectacular'
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # 'silk.middleware.SilkyMiddleware',
]
