from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import UserFellow
from .serializers import UserFellowSerializer


def get_friend_request_count(user):
    """
    Get friend request count for a user.
    """
    received_count = UserFellow.objects.filter(
        fellow_user=user,
        status='pending',
        is_deleted=False
    ).count()

    sent_count = UserFellow.objects.filter(
        user=user,
        status='pending',
        is_deleted=False
    ).count()

    return {
        'received_count': received_count,
        'sent_count': sent_count,
        'total_count': received_count + sent_count,
    }


def send_friend_request_update(user, action, friend_request=None):
    """
    Send a friend request update to a user via WebSocket.

    Args:
        user: The user to send the update to
        action: The action that occurred ('created', 'accepted', 'rejected', 'cancelled')
        friend_request: The UserFellow object (optional, for created/accepted actions)
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    friend_request_group_name = f'friend_requests_{user.id}'

    # Get updated count
    count_data = get_friend_request_count(user)

    # Prepare friend request data if provided
    friend_request_data = None
    if friend_request:
        serializer = UserFellowSerializer(friend_request)
        friend_request_data = serializer.data

    # Send to the user's friend request group
    async_to_sync(channel_layer.group_send)(
        friend_request_group_name,
        {
            'type': 'friend_request_update',
            'action': action,
            'friend_request': friend_request_data,
            'count': count_data,
        }
    )


def send_friend_request_update_to_both_users(friend_request, action):
    """
    Send friend request update to both the requester and recipient.

    Args:
        friend_request: The UserFellow object
        action: The action that occurred
    """
    # Send to requester (user who sent the request)
    send_friend_request_update(friend_request.user, action, friend_request)
    
    # Send to recipient (user who received the request)
    send_friend_request_update(friend_request.fellow_user, action, friend_request)

