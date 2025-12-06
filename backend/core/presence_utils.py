"""
Utility functions for broadcasting presence changes to fellows.
"""

from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def broadcast_presence_change(user_id: int, username: str, status: str):
    """
    Broadcast presence change to all of a user's fellows.
    Called when a user comes online or goes offline.
    
    Args:
        user_id: ID of the user whose presence changed
        username: Username of the user
        status: 'online' or 'offline'
    """
    from core.models import UserFellow
    from django.db.models import Q

    # Get all fellows of this user
    fellows = UserFellow.objects.filter(
        (Q(user_id=user_id, status='accepted') |
         Q(fellow_user_id=user_id, status='accepted')),
        is_deleted=False
    ).values_list('user_id', 'fellow_user_id')

    fellow_ids = set()
    for u_id, f_id in fellows:
        if u_id == user_id:
            fellow_ids.add(f_id)
        else:
            fellow_ids.add(u_id)

    # Broadcast to each fellow
    channel_layer = get_channel_layer()
    if channel_layer:
        for fellow_id in fellow_ids:
            async_to_sync(channel_layer.group_send)(
                f'presence_{fellow_id}',
                {
                    'type': 'presence_update',
                    'user_id': user_id,
                    'username': username,
                    'status': status,
                    'timestamp': timezone.now().isoformat(),
                }
            )

