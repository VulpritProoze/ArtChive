from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from common.utils.choices import NOTIFICATION_TYPES
from core.models import User

from .models import Notification, NotificationNotifier


def create_notification(
    message: str,
    notification_object_type: str,
    notification_object_id: str,
    notified_to: User,
    notified_by: User = None
):
    """
    Create a notification and send it via WebSocket.

    Args:
        message: The notification message to display
        notification_object_type: Type of the related object (e.g., 'post_comment', 'post_critique')
        notification_object_id: ID of the related object
        notified_to: User who receives the notification
        notified_by: User who triggered the notification (optional, can be None for system notifications)

    Returns:
        Notification: The created notification object
    """
    # Create the notification
    notification = Notification.objects.create(
        message=message,
        notification_object_type=notification_object_type,
        notification_object_id=notification_object_id,
        notified_to=notified_to
    )

    # Create NotificationNotifier record if notified_by is provided
    if notified_by:
        NotificationNotifier.objects.create(
            notification_id=notification,
            notified_by=notified_by
        )

    # Send real-time notification via WebSocket
    send_notification_to_user(notified_to, notification, notified_by)

    return notification


def send_notification_to_user(user: User, notification: Notification, notified_by: User = None):
    """
    Send a notification to a specific user via WebSocket.

    Args:
        user: The user to send the notification to
        notification: The notification object
        notified_by: The user who triggered the notification (optional)
    """
    channel_layer = get_channel_layer()
    notification_group_name = f'notifications_{user.id}'

    # Helper function to get full name
    def get_full_name(user):
        name_parts = [user.first_name, user.middle_name, user.last_name]
        full_name = ' '.join(part for part in name_parts if part)
        return full_name if full_name else user.username

    # Prepare notification data
    notification_data = {
        'notification_id': str(notification.notification_id),
        'message': notification.message,
        'notification_object_type': notification.notification_object_type,
        'notification_object_id': notification.notification_object_id,
        'is_read': notification.is_read,
        'notified_at': notification.notified_at.isoformat(),
        'notified_by': {
            'id': notified_by.id,
            'username': notified_by.username,
            'first_name': notified_by.first_name or '',
            'middle_name': notified_by.middle_name or '',
            'last_name': notified_by.last_name or '',
            'full_name': get_full_name(notified_by),
            'profile_picture': notified_by.profile_picture.url if notified_by.profile_picture else None
        } if notified_by else None
    }

    # Send to the user's notification group
    async_to_sync(channel_layer.group_send)(
        notification_group_name,
        {
            'type': 'notification_message',
            'notification': notification_data
        }
    )


def create_comment_notification(comment, post_author):
    """
    Create a notification when someone comments on a post.

    Args:
        comment: The Comment object
        post_author: The User who owns the post
    """
    # Don't notify if the commenter is the post author
    if comment.author.id == post_author.id:
        return None

    message = f"{comment.author.username} commented on your post"

    return create_notification(
        message=message,
        notification_object_type=NOTIFICATION_TYPES.post_comment,
        notification_object_id=str(comment.comment_id),
        notified_to=post_author,
        notified_by=comment.author
    )


def create_critique_notification(critique, post_author):
    """
    Create a notification when someone critiques a post.

    Args:
        critique: The Critique object
        post_author: The User who owns the post
    """
    # Don't notify if the critique author is the post author
    if critique.author.id == post_author.id:
        return None

    message = f"{critique.author.username} critiqued your post"

    return create_notification(
        message=message,
        notification_object_type=NOTIFICATION_TYPES.post_critique,
        notification_object_id=str(critique.critique_id),
        notified_to=post_author,
        notified_by=critique.author
    )


def create_praise_notification(praise, post_author):
    """
    Create a notification when someone praises a post.

    Args:
        praise: The PostPraise object
        post_author: The User who owns the post
    """
    # Don't notify if the praiser is the post author
    if praise.author.id == post_author.id:
        return None

    message = f"{praise.author.username} praised your post"

    return create_notification(
        message=message,
        notification_object_type=NOTIFICATION_TYPES.post_praise,
        notification_object_id=str(praise.post_id.post_id),
        notified_to=post_author,
        notified_by=praise.author
    )


def create_trophy_notification(trophy, post_author):
    """
    Create a notification when someone awards a trophy to a post.

    Args:
        trophy: The PostTrophy object
        post_author: The User who owns the post
    """
    # Don't notify if the trophy giver is the post author
    if trophy.author.id == post_author.id:
        return None

    trophy_name = trophy.post_trophy_type.trophy.replace('_', ' ').title()
    message = f"{trophy.author.username} awarded you a {trophy_name}"

    return create_notification(
        message=message,
        notification_object_type=NOTIFICATION_TYPES.post_trophy,
        notification_object_id=str(trophy.post_id.post_id),
        notified_to=post_author,
        notified_by=trophy.author
    )
