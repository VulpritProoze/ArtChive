import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from notification.routing import websocket_urlpatterns as notification_routes
from conversation.routing import websocket_urlpatterns as conversation_routes

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
