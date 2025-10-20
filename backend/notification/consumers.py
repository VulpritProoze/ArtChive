import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .models import Notification


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    Each user connects to their own notification channel.
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
        self.notification_group_name = f'notifications_{self.user.id}'

        # Join notification group
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )

        # Accept the WebSocket connection
        await self.accept()

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        """
        # Leave notification group
        if hasattr(self, 'notification_group_name'):
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """
        Handle messages received from WebSocket.
        This can be used for marking notifications as read, etc.
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
        This is called when a message is sent to the group.
        """
        # Send notification to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))

    @database_sync_to_async
    def mark_notification_as_read(self, notification_id):
        """
        Mark a specific notification as read.
        """
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
        Notification.objects.filter(
            notified_to=self.user,
            is_read=False
        ).update(is_read=True)
        return True
