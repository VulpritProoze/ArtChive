from rest_framework import serializers
from .models import Notification, NotificationNotifier
from core.serializers import UserSerializer


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model.
    Includes information about who triggered the notification.
    """
    notified_by = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'notification_id',
            'message',
            'notification_object_type',
            'notification_object_id',
            'is_read',
            'notified_at',
            'notified_by'
        ]
        read_only_fields = fields

    def get_notified_by(self, obj):
        """
        Get the user who triggered this notification.
        """
        try:
            notifier = NotificationNotifier.objects.select_related('notified_by').get(
                notification_id=obj
            )
            user = notifier.notified_by

            # Get full name
            name_parts = [user.first_name, user.middle_name, user.last_name]
            full_name = ' '.join(part for part in name_parts if part)
            full_name = full_name if full_name else user.username

            return {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name or '',
                'middle_name': user.middle_name or '',
                'last_name': user.last_name or '',
                'full_name': full_name,
                'profile_picture': user.profile_picture.url if user.profile_picture else None
            }
        except NotificationNotifier.DoesNotExist:
            return None


class NotificationMarkAsReadSerializer(serializers.Serializer):
    """
    Serializer for marking a notification as read.
    """
    notification_id = serializers.UUIDField()

    def validate_notification_id(self, value):
        """
        Validate that the notification exists and belongs to the current user.
        """
        user = self.context['request'].user
        try:
            notification = Notification.objects.get(
                notification_id=value,
                notified_to=user
            )
            return notification
        except Notification.DoesNotExist:
            raise serializers.ValidationError("Notification not found or does not belong to you.")

    def save(self):
        """
        Mark the notification as read.
        """
        notification = self.validated_data['notification_id']
        notification.is_read = True
        notification.save()
        return notification
