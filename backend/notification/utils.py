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
        Notification: The created notification object, or None if notification should not be created
    """
    # Safety check: Don't create notification if notified_by is the same as notified_to
    # The person who triggers the notification should not receive it
    if notified_by and notified_by.id == notified_to.id:
        return None

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

    # Format: "postId:commentId" for proper navigation
    notification_object_id = f"{comment.post_id.post_id}:{comment.comment_id}"

    return create_notification(
        message=message,
        notification_object_type=NOTIFICATION_TYPES.post_comment,
        notification_object_id=notification_object_id,
        notified_to=post_author,
        notified_by=comment.author
    )


def create_critique_notification(critique, recipient):
    """
    Create a notification when someone critiques a post or gallery.

    Args:
        critique: The Critique object
        recipient: The User who owns the post or gallery
    """
    # Don't notify if the critique author is the recipient
    if critique.author.id == recipient.id:
        return None

    # Determine if it's a post or gallery critique
    if critique.post_id:
        message = f"{critique.author.username} critiqued your post"
        # Format: "postId:critiqueId" for proper navigation
        notification_object_id = f"{critique.post_id.post_id}:{critique.critique_id}"
        notification_type = NOTIFICATION_TYPES.post_critique
    elif critique.gallery_id:
        message = f"{critique.author.username} critiqued your gallery"
        # Use creator's user ID for navigation to /gallery/:userid
        notification_object_id = str(critique.gallery_id.creator.id)
        notification_type = NOTIFICATION_TYPES.gallery_critique
    else:
        # Should not happen, but handle gracefully
        return None

    return create_notification(
        message=message,
        notification_object_type=notification_type,
        notification_object_id=notification_object_id,
        notified_to=recipient,
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


def create_gallery_award_notification(gallery_award, gallery_creator):
    """
    Create a notification when someone awards a gallery award to a gallery.

    Args:
        gallery_award: The GalleryAward object
        gallery_creator: The User who owns the gallery
    """
    # Don't notify if the award giver is the gallery creator
    if gallery_award.author.id == gallery_creator.id:
        return None

    award_name = gallery_award.gallery_award_type.award.replace('_', ' ').title()
    message = f"{gallery_award.author.username} awarded you a {award_name}"

    return create_notification(
        message=message,
        notification_object_type=NOTIFICATION_TYPES.gallery_award,
        notification_object_id=str(gallery_award.gallery_id.creator.id),
        notified_to=gallery_creator,
        notified_by=gallery_award.author
    )


def create_comment_reply_notification(reply, parent_comment_author):
    """
    Create a notification when someone replies to a comment.

    Args:
        reply: The Comment object (the reply)
        parent_comment_author: The User who owns the parent comment
    """
    # Don't notify if replying to own comment
    if reply.author.id == parent_comment_author.id:
        return None

    message = f"{reply.author.username} replied to your comment"

    # Format: "postId:replyId" for proper navigation
    notification_object_id = f"{reply.post_id.post_id}:{reply.comment_id}"

    return create_notification(
        message=message,
        notification_object_type=NOTIFICATION_TYPES.post_comment,
        notification_object_id=notification_object_id,
        notified_to=parent_comment_author,
        notified_by=reply.author
    )


def create_critique_reply_notification(reply, critique_author):
    """
    Create a notification when someone replies to a critique.

    Args:
        reply: The Comment object (the critique reply)
        critique_author: The User who owns the critique
    """
    # Don't notify if replying to own critique
    # Also ensure notified_by (reply author) is not the same as notified_to (critique author)
    if reply.author.id == critique_author.id:
        return None

    message = f"{reply.author.username} replied to your critique"

    # Use just the post ID (like praise/trophy notifications)
    # Navigation will go to the post, and hash navigation can handle scrolling to the reply
    notification_object_id = str(reply.post_id.post_id)

    # Only notify the critique author (notified_to), never the reply author (notified_by)
    return create_notification(
        message=message,
        notification_object_type=NOTIFICATION_TYPES.post_critique,
        notification_object_id=notification_object_id,
        notified_to=critique_author,  # Only the critique author receives this notification
        notified_by=reply.author  # The reply author triggered it, but doesn't receive it
    )
