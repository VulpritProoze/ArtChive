# For local development

from .base import *

# ALLOWED_HOSTS = [
#     'localhost',
#     '127.0.0.1',
#     '.render.com',
# ]

ALLOWED_HOSTS = ['*']

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
