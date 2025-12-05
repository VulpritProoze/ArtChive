import asyncio
import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone


class RealtimeConsumer(AsyncWebsocketConsumer):
    """
    Unified WebSocket consumer for all real-time updates.
    Handles notifications, friend requests, and future message types.
    Each user connects to a single unified channel that receives all real-time updates.
    """

    async def connect(self):
        """
        Handle WebSocket connection.
        User must be authenticated to connect.
        Joins both notification and friend request channel groups.
        """
        import logging
        logger = logging.getLogger(__name__)

        self.user = self.scope['user']

        logger.info(f'WebSocket connection attempt - User: {self.user}, Anonymous: {self.user.is_anonymous}, User ID: {getattr(self.user, "id", "N/A")}')

        # Reject connection if user is not authenticated
        if self.user.is_anonymous:
            logger.warning('WebSocket connection REJECTED: User is anonymous (not authenticated)')
            await self.close()
            return

        # Create unique group names for this user
        self.notification_group_name = f'notifications_{self.user.id}'
        self.friend_request_group_name = f'friend_requests_{self.user.id}'
        self.presence_group_name = f'presence_{self.user.id}'

        # Join all channel groups for unified updates
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )
        await self.channel_layer.group_add(
            self.friend_request_group_name,
            self.channel_name
        )
        await self.channel_layer.group_add(
            self.presence_group_name,
            self.channel_name
        )

        # Accept the WebSocket connection
        logger.info(f'Accepting WebSocket connection for user {self.user.id} ({self.user.username})')
        await self.accept()
        logger.info(f'WebSocket CONNECTED successfully for user {self.user.id} ({self.user.username})')

        # Mark user as active when they connect (after accept to ensure connection is established)
        try:
            await self.mark_user_active()
            logger.info(f'User {self.user.id} marked as active in Redis')

            # Notify all fellows that this user is now online
            await self.notify_fellows_presence_change('online')
            logger.info(f'Presence change notifications sent to fellows for user {self.user.id}')
        except Exception as e:
            logger.error(f'Error during WebSocket connect setup for user {self.user.id}: {e}', exc_info=True)

        # Start periodic presence updates
        self.presence_update_task = asyncio.create_task(
            self.periodic_presence_update()
        )

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Leave all channel groups quickly, then do cleanup in background.
        """
        # Store user info before disconnect (self.user might not be available later)
        user_id = getattr(self.user, 'id', None)
        username = getattr(self.user, 'username', None)

        # Cancel periodic presence updates with short timeout
        if hasattr(self, 'presence_update_task'):
            self.presence_update_task.cancel()
            try:
                await asyncio.wait_for(self.presence_update_task, timeout=0.5)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass

        # Leave channel groups immediately (fast operations)
        if hasattr(self, 'notification_group_name'):
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )
        if hasattr(self, 'friend_request_group_name'):
            await self.channel_layer.group_discard(
                self.friend_request_group_name,
                self.channel_name
            )
        if hasattr(self, 'presence_group_name'):
            await self.channel_layer.group_discard(
                self.presence_group_name,
                self.channel_name
            )

        # Do heavy cleanup in background (don't await - let it run after disconnect)
        if user_id and username:
            asyncio.create_task(
                self._cleanup_after_disconnect(user_id, username)
            )
        elif user_id:
            # Fallback if username not available
            asyncio.create_task(
                self._cleanup_after_disconnect(user_id, f'user_{user_id}')
            )

    async def receive(self, text_data):
        """
        Handle messages received from WebSocket.
        Supports notification actions (mark as read, etc.)
        """
        try:
            data = json.loads(text_data)
            action = data.get('action')

            if action == 'mark_as_read':
                notification_id = data.get('notification_id')
                if notification_id:
                    await self.mark_notification_as_read(notification_id)

            elif action == 'mark_all_as_read':
                await self.mark_all_notifications_as_read()

            elif action == 'presence_heartbeat':
                # Client sends heartbeat to keep presence active
                await self.mark_user_active()

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON'
            }))

    async def notification_message(self, event):
        """
        Receive notification from channel layer and send to WebSocket.
        This is called when a message is sent to the notification group.
        """
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))

    async def friend_request_update(self, event):
        """
        Receive friend request update from channel layer and send to WebSocket.
        This is called when a message is sent to the friend request group.
        """
        await self.send(text_data=json.dumps({
            'type': 'friend_request_update',
            'action': event['action'],  # 'created', 'accepted', 'rejected', 'cancelled'
            'friend_request': event.get('friend_request'),
            'count': event.get('count'),  # Updated count data
        }))

    async def presence_update(self, event):
        """
        Receive presence update from channel layer and send to WebSocket.
        This is called when a fellow's presence changes (online/offline).
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f'User {self.user.id} received presence_update: user {event["user_id"]} is {event["status"]}')

        await self.send(text_data=json.dumps({
            'type': 'presence_update',
            'user_id': event['user_id'],
            'username': event['username'],
            'status': event['status'],  # 'online' or 'offline'
            'timestamp': event['timestamp'],
        }))

    @database_sync_to_async
    def mark_user_active(self):
        """Mark user as active in Redis."""
        try:
            from core.presence import is_user_active, mark_user_active
            user_id = self.user.id
            mark_user_active(user_id)

            # Verify it was actually set
            if not is_user_active(user_id):
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f'Failed to mark user {user_id} as active - cache set failed')
            else:
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f'Successfully marked user {user_id} as active')
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Error marking user as active: {e}', exc_info=True)

    @database_sync_to_async
    def mark_user_inactive(self):
        """Mark user as inactive in Redis."""
        from core.presence import mark_user_inactive
        mark_user_inactive(self.user.id)

    @database_sync_to_async
    def get_user_fellows(self):
        """Get list of user IDs who are fellows with this user."""
        from django.db.models import Q

        from core.models import UserFellow

        # Use self.user.id instead of self.user to avoid UserLazyObject issues
        user_id = self.user.id

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

        return list(fellow_ids)

    async def notify_fellows_presence_change(self, status: str):
        """Notify all fellows about this user's presence change."""
        fellow_ids = await self.get_user_fellows()

        for fellow_id in fellow_ids:
            # Send to each fellow's presence group
            await self.channel_layer.group_send(
                f'presence_{fellow_id}',
                {
                    'type': 'presence_update',
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'status': status,  # 'online' or 'offline'
                    'timestamp': timezone.now().isoformat(),
                }
            )

    async def _cleanup_after_disconnect(self, user_id: int, username: str):
        """
        Background cleanup that doesn't block disconnect.
        This method handles heavy operations like marking user inactive
        and notifying fellows, which can take time.
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            # Mark user as inactive
            await self._mark_user_inactive_by_id(user_id)

            # Notify all fellows that this user is now offline
            await self._notify_fellows_presence_change_by_id(user_id, username, 'offline')

            logger.debug(f'Background cleanup completed for user {user_id}')
        except Exception as e:
            logger.error(f'Error during background cleanup for user {user_id}: {e}', exc_info=True)

    @database_sync_to_async
    def _mark_user_inactive_by_id(self, user_id: int):
        """Mark user as inactive in Redis by user ID."""
        from core.presence import mark_user_inactive
        mark_user_inactive(user_id)

    @database_sync_to_async
    def _get_user_fellows_by_id(self, user_id: int):
        """Get list of user IDs who are fellows with this user by user ID."""
        from django.db.models import Q

        from core.models import UserFellow

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

        return list(fellow_ids)

    async def _notify_fellows_presence_change_by_id(self, user_id: int, username: str, status: str):
        """Notify all fellows about this user's presence change by user ID."""
        fellow_ids = await self._get_user_fellows_by_id(user_id)

        for fellow_id in fellow_ids:
            # Send to each fellow's presence group
            await self.channel_layer.group_send(
                f'presence_{fellow_id}',
                {
                    'type': 'presence_update',
                    'user_id': user_id,
                    'username': username,
                    'status': status,  # 'online' or 'offline'
                    'timestamp': timezone.now().isoformat(),
                }
            )

    async def periodic_presence_update(self):
        """Periodically update user's presence to keep them marked as active."""
        from core.presence import PRESENCE_UPDATE_INTERVAL
        while True:
            try:
                await asyncio.sleep(PRESENCE_UPDATE_INTERVAL)
                await self.mark_user_active()

                # Debug: Log periodic update
                import logging
                logger = logging.getLogger(__name__)
                logger.debug(f'Periodic presence update for user {self.user.id}')
            except asyncio.CancelledError:
                break
            except Exception as e:
                # Log error but continue
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f'Error in periodic presence update for user {self.user.id}: {e}', exc_info=True)
                # Don't break - continue trying
                await asyncio.sleep(PRESENCE_UPDATE_INTERVAL)

    @database_sync_to_async
    def mark_notification_as_read(self, notification_id):
        """
        Mark a specific notification as read.
        """
        from notification.models import Notification
        try:
            notification = Notification.objects.get(
                notification_id=notification_id,
                notified_to=self.user
            )
            notification.is_read = True
            notification.save()
            return True
        except Notification.DoesNotExist:
            return False

    @database_sync_to_async
    def mark_all_notifications_as_read(self):
        """
        Mark all notifications for this user as read.
        """
        from notification.models import Notification
        Notification.objects.filter(
            notified_to=self.user,
            is_read=False
        ).update(is_read=True)
        return True


class FriendRequestConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time friend request updates.
    Each user connects to their own friend request channel.
    """

    async def connect(self):
        """
        Handle WebSocket connection.
        User must be authenticated to connect.
        """
        self.user = self.scope['user']

        # Reject connection if user is not authenticated
        if self.user.is_anonymous:
            await self.close()
            return

        # Create a unique group name for this user
        self.friend_request_group_name = f'friend_requests_{self.user.id}'

        # Join friend request group
        await self.channel_layer.group_add(
            self.friend_request_group_name,
            self.channel_name
        )

        # Accept the WebSocket connection
        await self.accept()

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        """
        # Leave friend request group
        if hasattr(self, 'friend_request_group_name'):
            await self.channel_layer.group_discard(
                self.friend_request_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """
        Handle messages received from WebSocket.
        Currently not used, but can be extended for future features.
        """
        try:
            data = json.loads(text_data)
            # Future: Handle client messages if needed
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON'
            }))

    async def friend_request_update(self, event):
        """
        Receive friend request update from channel layer and send to WebSocket.
        This is called when a message is sent to the group.
        """
        # Send friend request update to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'friend_request_update',
            'action': event['action'],  # 'created', 'accepted', 'rejected', 'cancelled'
            'friend_request': event.get('friend_request'),
            'count': event.get('count'),  # Updated count data
        }))

