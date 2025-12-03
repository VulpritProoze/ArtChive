"""
Custom WebSocket authentication middleware that supports JWT tokens.
Allows authentication via:
1. JWT access token from cookies (primary method)
2. JWT token in query parameter (fallback)
3. Session cookies (last resort)
"""

import logging
from urllib.parse import parse_qs

from channels.auth import get_user
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_string):
    """Get user from JWT access token."""
    try:
        access_token = AccessToken(token_string)
        user_id = access_token.get('user_id')
        if user_id:
            user = User.objects.get(id=user_id)
            logger.info(f'Successfully authenticated user {user.id} ({user.username}) from JWT token')
            return user
    except (TokenError, InvalidToken) as e:
        logger.debug(f'JWT token validation failed: {e}')
    except User.DoesNotExist:
        logger.debug('User from JWT token does not exist')
    except Exception as e:
        logger.error(f'Unexpected error authenticating from token: {e}', exc_info=True)
    return None


def get_cookie_value(cookie_string, cookie_name):
    """Extract cookie value from cookie string."""
    if not cookie_string:
        return None
    cookies = cookie_string.split(';')
    for cookie in cookies:
        cookie = cookie.strip()
        if cookie.startswith(f'{cookie_name}='):
            return cookie.split('=', 1)[1]
    return None


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom WebSocket authentication middleware with enhanced logging.
    Tries to authenticate via:
    1. JWT token from cookies (access_token cookie) - PRIMARY METHOD
    2. JWT token in query string (token parameter) - if provided
    3. Session cookies (fallback)
    """

    async def __call__(self, scope, receive, send):
        # Log connection attempt
        query_string = scope.get('query_string', b'').decode()
        headers = dict(scope.get('headers', []))
        cookie_string = headers.get(b'cookie', b'').decode() if b'cookie' in headers else ''

        logger.info(f'WebSocket connection attempt - Query: {query_string[:100]}, Has cookies: {bool(cookie_string)}')
        if cookie_string:
            logger.debug(f'Cookie string (first 200 chars): {cookie_string[:200]}')

        user = None

        # Try JWT token from cookies first (PRIMARY METHOD - this is what your app uses)
        access_token_cookie = get_cookie_value(cookie_string, 'access_token')
        if access_token_cookie:
            logger.debug('Attempting JWT token authentication from access_token cookie')
            user = await get_user_from_token(access_token_cookie)
            if user:
                logger.info(f'WebSocket authenticated via JWT cookie for user {user.id} ({user.username})')
            else:
                logger.warning('JWT token from cookie failed validation')
        else:
            logger.debug('No access_token cookie found')

        # If cookie auth failed, try query parameter
        if not user:
            query_params = parse_qs(query_string)
            if 'token' in query_params:
                token = query_params['token'][0]
                logger.debug('Attempting JWT token authentication from query parameter')
                user = await get_user_from_token(token)
                if user:
                    logger.info(f'WebSocket authenticated via JWT query param for user {user.id} ({user.username})')

        # If JWT auth failed, try session-based auth (fallback)
        if not user:
            logger.debug('Attempting session-based authentication for WebSocket')
            try:
                user = await get_user(scope)
                if user and not user.is_anonymous:
                    logger.info(f'WebSocket authenticated via session for user {user.id} ({user.username})')
                else:
                    logger.warning(f'Session authentication failed - user is anonymous. Cookies present: {bool(cookie_string)}')
            except Exception as e:
                logger.error(f'Error during session authentication: {e}', exc_info=True)

        # Set user in scope
        scope['user'] = user if user and not user.is_anonymous else AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """
    Stack that combines JWT auth with session auth.
    Tries JWT token first (if provided), falls back to session cookies.
    """
    from channels.auth import AuthMiddlewareStack
    # Apply our custom middleware, then session auth as fallback
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))

