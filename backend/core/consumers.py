import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


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
        self.user = self.scope['user']

        # Reject connection if user is not authenticated
        if self.user.is_anonymous:
            await self.close()
            return

        # Create unique group names for this user
        self.notification_group_name = f'notifications_{self.user.id}'
        self.friend_request_group_name = f'friend_requests_{self.user.id}'

        # Join both channel groups for unified updates
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )
        await self.channel_layer.group_add(
            self.friend_request_group_name,
            self.channel_name
        )

        # Accept the WebSocket connection
        await self.accept()

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Leave all channel groups.
        """
        # Leave notification group
        if hasattr(self, 'notification_group_name'):
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )
        # Leave friend request group
        if hasattr(self, 'friend_request_group_name'):
            await self.channel_layer.group_discard(
                self.friend_request_group_name,
                self.channel_name
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

