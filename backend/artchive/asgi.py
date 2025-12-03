import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.sessions import SessionMiddlewareStack
from django.core.asgi import get_asgi_application

from core.websocket_auth import JWTAuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'artchive.settings.production')

# Initialize Django first so apps are ready before importing routing modules
django_application = get_asgi_application()

from conversation.routing import (  # noqa: E402
    websocket_urlpatterns as conversation_routes,  # noqa: E402
)
from core.routing import (  # noqa: E402
    websocket_urlpatterns as friend_request_routes,  # noqa: E402
)
from notification.routing import (  # noqa: E402
    websocket_urlpatterns as notification_routes,  # noqa: E402
)

application = ProtocolTypeRouter({
    "http": django_application,
    "websocket": SessionMiddlewareStack(
        JWTAuthMiddlewareStack(
            URLRouter(
                notification_routes +
                conversation_routes +
                friend_request_routes
            )
        )
    )
})
