import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

from conversation.routing import websocket_urlpatterns as conversation_routes
from notification.routing import websocket_urlpatterns as notification_routes

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'artchive.settings.production')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            notification_routes +
            conversation_routes
        )
    )
})
