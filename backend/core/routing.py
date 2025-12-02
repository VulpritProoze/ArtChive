from django.urls import path

from .consumers import FriendRequestConsumer, RealtimeConsumer

websocket_urlpatterns = [
    # Unified real-time WebSocket endpoint (recommended)
    path('ws/realtime/', RealtimeConsumer.as_asgi()),
    # Legacy endpoint (deprecated - will be removed after migration)
    path('ws/friend-requests/', FriendRequestConsumer.as_asgi()),
]

