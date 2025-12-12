import re
from typing import List, Dict

from core.models import User
from notification.utils import create_notification
from common.utils.choices import NOTIFICATION_TYPES


def extract_mentions(text: str) -> List[str]:
    """
    Extract usernames from @mentions in text.
    
    Args:
        text: The text to extract mentions from
        
    Returns:
        List of unique usernames (case-insensitive, deduplicated)
    """
    if not text:
        return []
    
    pattern = r'@(\w+)'
    mentions = re.findall(pattern, text)
    
    # Convert to lowercase and deduplicate
    unique_mentions = list(set(username.lower() for username in mentions))
    
    return unique_mentions


def validate_mentions(usernames: List[str]) -> Dict[str, bool]:
    """
    Check which mentioned usernames exist in the database.
    
    Args:
        usernames: List of usernames to validate
        
    Returns:
        Dictionary mapping username (lowercase) to existence boolean
    """
    if not usernames:
        return {}
    
    # Query users with case-insensitive matching
    existing_users = User.objects.filter(
        username__in=[u.lower() for u in usernames]
    ).values_list('username', flat=True)
    
    existing_usernames = {u.lower() for u in existing_users}
    
    return {username: username in existing_usernames for username in usernames}


def create_mention_notifications(post, description: str, author: User) -> List:
    """
    Create notifications for users mentioned in a post.
    
    Args:
        post: The Post object
        description: The post description text
        author: The User who created the post
        
    Returns:
        List of created Notification objects
    """
    if not description:
        return []
    
    # Extract mentions
    mentioned_usernames = extract_mentions(description)
    
    if not mentioned_usernames:
        return []
    
    # Validate mentions (check which users exist)
    valid_mentions = validate_mentions(mentioned_usernames)
    
    # Limit mentions per post to prevent spam (max 10)
    MAX_MENTIONS = 10
    valid_usernames = [
        username for username, exists in valid_mentions.items() 
        if exists
    ][:MAX_MENTIONS]
    
    if not valid_usernames:
        return []
    
    # Get User objects for valid mentions
    mentioned_users = User.objects.filter(
        username__in=valid_usernames
    )
    
    created_notifications = []
    
    for mentioned_user in mentioned_users:
        # Skip if user mentions themselves
        if mentioned_user.id == author.id:
            continue
        
        # Create notification
        message = f"{author.username} mentioned you in a post"
        
        notification = create_notification(
            message=message,
            notification_object_type=NOTIFICATION_TYPES.post_mention,
            notification_object_id=str(post.post_id),
            notified_to=mentioned_user,
            notified_by=author
        )
        
        if notification:
            created_notifications.append(notification)
    
    return created_notifications


def get_new_mentions(old_description: str, new_description: str) -> List[str]:
    """
    Get list of new mentions that weren't in the old description.
    Useful for update operations to only notify about new mentions.
    
    Args:
        old_description: The previous description
        new_description: The new description
        
    Returns:
        List of new usernames that weren't in the old description
    """
    old_mentions = set(extract_mentions(old_description or ''))
    new_mentions = set(extract_mentions(new_description or ''))
    
    # Return only mentions that are new
    return list(new_mentions - old_mentions)

